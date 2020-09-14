const tempy = require('tempy');
const del = require('del');
const {execSync} = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const ProgressBar = require('progress');
const extract = require("extract-zip");
const cheerio = require('cheerio');
const glob = require("glob");

export class KMBPatch {
    public inputAPK : string;
    public outputAPK : string;
    public tempDir : string;
    public forceOverwrite = true;
    public mapKey = "aaaaaaa";

    public signKey = "tools/sign-key.jks";
    public keystorePassword = "CnhQbngu8aLFVR6rHGs6zkoryZcJVeDF";
    public keyAlias = "louislam";
    public keyPassword = "CnhQbngu8aLFVR6rHGs6zkoryZcJVeDF";

    public downloadJava = true;
    public java = '"tools/jdk-11.0.8+10-jre/bin/java"';


    constructor(inputAPK : string, outputAPK = "patched-kmb.apk", tempDir = "tmp") {
        this.inputAPK = inputAPK;
        this.outputAPK = outputAPK;

        if (tempDir == null) {
            this.tempDir = tempy.directory();
            this.forceOverwrite = true;
        } else {
            this.tempDir = tempDir;
        }

        console.log("Temp Dir: " + this.tempDir);

        if (os.platform !== "win32") {
            this.downloadJava = false;
            this.java = "java";
        }
    }

    async run() {
        let exitCode = 0;
        let self = this;

        try {
            await this.downloadTools();

            let escapedTempDir = escapeShellArg(this.tempDir);
            let escapedInputAPK = escapeShellArg(this.inputAPK);
            let escapedOutputAPK = escapeShellArg(this.outputAPK);
            let f = "";

            let escapedSignKey = escapeShellArg(this.signKey);
            let escapedKeystonePassword = escapeShellArg(this.keystorePassword);
            let escapedKeyAlias = escapeShellArg(this.keyAlias);
            let escapedKeyPassword = escapeShellArg(this.keyPassword);

            if (this.forceOverwrite) {
                f = "-f";
            }

            console.log("Extracting APK");
            let output : string = execSync(`${this.java} -Xmx512m -jar tools/apktool_2.4.1.jar d -o ${escapedTempDir} ${f} ${escapedInputAPK}`).toString();
            console.log(output);

            // Patch AndroidManifest.xml
            console.log("Patch AndroidManifest.xml");
            let xmlPath = this.tempDir + "/AndroidManifest.xml";
            let androidManifestXML : string = fs.readFileSync(xmlPath);
            let $ = cheerio.load(androidManifestXML,  {
                xmlMode: true
            });

            // Update MAP Key
            $("application meta-data").each(function () {
                if ($(this).attr("android:name") == "com.google.android.maps.v2.API_KEY") {
                    $(this).attr("android:value", self.mapKey);
                }
            });

            // Remove Splash Screen
            console.log("Remove Splash Screen");
            $("activity").each(function () {
                if ($(this).attr("android:name") == "com.mobilesoft.mybus.KMBMainView") {
                    $(this).append(`
                        <intent-filter>
                            <action android:name="android.intent.action.MAIN"/>
                            <category android:name="android.intent.category.LAUNCHER"/>
                        </intent-filter>
                    `);
                } else if  ($(this).attr("android:name") == "com.mobilesoft.mybus.KMBSplashScreen") {
                    $(this).empty();
                }
            });

            fs.writeFileSync(xmlPath, $.xml());

            // Remove AdView in xml
            let resXMLPath = this.tempDir + '/res/**/*.xml';
            let fileList = glob.sync(resXMLPath);

            for (let i = 0; i < fileList.length; i++) {
                let filename = fileList[i];
                let text = fs.readFileSync(filename).toString();

                if (text.includes("com.google.android.gms.ads.AdView")) {
                    console.log("Remove AdView in " + filename);
                    $ = cheerio.load(text,  {
                        xmlMode: true
                    });
                    $("com\\.google\\.android\\.gms\\.ads\\.AdView").remove();
                    fs.writeFileSync(filename, $.xml());
                }
            }

            let path = this.tempDir + '/smali_classes2/**/*.smali';
            fileList = glob.sync(path);

            for (let i = 0; i < fileList.length; i++) {
                let updated = false;
                let filename = fileList[i];
                let text = fs.readFileSync(filename).toString();
                let lines = text.split(/\r?\n/);

                for (let j = 0; j < lines.length; j++) {
                    let line = lines[j];

                    // Disable check update
                    if (line.includes("m.kmb.hk/kmb-ws/checkupdateapp.php")) {
                        console.log("Remove update url in " + filename);
                        lines[j] = line.replace("m.kmb.hk/kmb-ws/checkupdateapp.php", "m2.kmb.hk/kmb-ws/checkupdateapp.php");
                        updated = true;
                    }

                    // Remove loadAd code
                    if (line.includes("->loadAd(")) {
                        console.log("Remove loadAd code in " + filename);
                        lines[j] = "#" + line;

                        // Also comment previous line if is .line
                        if (lines[j - 1].trim().startsWith(".line")) {
                            lines[j - 1] = "#" + lines[j - 1];
                        }

                        updated = true;
                    }

                    // Remove setVisibility code
                    if (line.includes("AdView;->setVisibility")) {
                        console.log("Remove setVisibility code in " + filename);
                        lines[j] = "#" + line;

                        // Also comment previous line if is .line
                        if (lines[j - 1].trim().startsWith(".line")) {
                            lines[j - 1] = "#" + lines[j - 1];
                        }

                        updated = true;
                    }

                }

                if (updated) {
                    fs.writeFileSync(filename, lines.join(os.EOL));
                }
            }

            console.log("Build APK");
            output = execSync(`${this.java} -Xmx512m -jar tools/apktool_2.4.1.jar b ${escapedTempDir} -o  ${escapedOutputAPK}`).toString();
            console.log(output);

            console.log("Sign the APK");
            output = execSync(`${this.java} -Xmx512m -jar tools/uber-apk-signer-1.1.0.jar -a ${escapedOutputAPK} --allowResign --overwrite --ks ${escapedSignKey} --ksPass ${escapedKeystonePassword} --ksAlias ${escapedKeyAlias} --ksKeyPass ${escapedKeyPassword}`).toString();
            console.log(output);

            console.log("Patched successfully! The patch apk file located in " + this.outputAPK);


        } catch (error) {
            console.error(error.message);
            exitCode = 1;
        }

        del.sync(this.tempDir , {
            force : true,
        });

        return exitCode;
    }

    async downloadTools() {
        console.log("Download Tools");

        if (! fs.existsSync("tools/apktool_2.4.1.jar")) {
            await this.downloadFile("https://github.com/iBotPeaches/Apktool/releases/download/v2.4.1/apktool_2.4.1.jar", "apktool_2.4.1.jar")
        }

        if (! fs.existsSync("tools/uber-apk-signer-1.1.0.jar")) {
            await this.downloadFile("https://github.com/patrickfav/uber-apk-signer/releases/download/v1.1.0/uber-apk-signer-1.1.0.jar", "uber-apk-signer-1.1.0.jar")
        }

        // JRE Download link from https://adoptopenjdk.net/archive.html
        if (this.downloadJava && ! fs.existsSync("tools/jdk-11.0.8+10-jre")) {
            await this.downloadFile("https://github.com/AdoptOpenJDK/openjdk11-binaries/releases/download/jdk-11.0.8%2B10/OpenJDK11U-jre_x64_windows_hotspot_11.0.8_10.zip", "jre.zip");

            await extract("tools/jre.zip", {
                dir: path.resolve("tools")
            });
        }
        console.log("Downloaded all tools");
    }

    /**
     * Copy from https://futurestud.io/tutorials/axios-download-progress-in-node-js
     */
    async downloadFile(url, filename) {
        console.log('Download ' + path.basename(url))
        const { data, headers } = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });
        const totalLength = parseInt(headers['content-length']);

        const progressBar = new ProgressBar('downloading [:bar] :percent :etas', {
            width: 40,
            complete: '=',
            incomplete: ' ',
            renderThrottle: 1,
            total: totalLength
        });

        const writer = fs.createWriteStream(path.resolve(__dirname, 'tools', filename));

        data.on('data', (chunk) => {
            progressBar.tick(chunk.length);
            data.finished
        });



        await new Promise((resolve) => {
            writer.on("finish", () => {
                console.log("Downloaded and renamed to " + filename);
                resolve();
            });

            data.pipe(writer)
        });

    }

}

function escapeShellArg(arg) {
    let quote;

    if (os.platform() == 'win32') {
        quote = '"';
    } else {
        quote = "'";
    }

    return quote + `${arg.replace(/'/g, `'\\''`)}` + quote;
}
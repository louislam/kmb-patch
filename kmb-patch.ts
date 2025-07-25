import * as tempy from 'tempy';
import {execSync} from 'child_process';
import os from 'os';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import ProgressBar from 'progress';
import extract from "extract-zip";
import cheerio from 'cheerio';
import * as glob from "glob";
import tar from 'tar-stream';

/**
 * KMB Patch Class
 */
export class KMBPatch {
    public inputAPK : string;
    public outputAPK : string;
    public tempDir : string;
    public forceOverwrite = true;
    public mapKey = "";

    public signKey = "tools/sign-key.jks";
    public keystorePassword = "";
    public keyAlias = "louislam";
    public keyPassword = "";

    public downloadJava = true;
    public javaVersionMain = "21.0.8";
    public javaVersionPlus = "9";
    public javaFullName = `jdk-${this.javaVersionMain}+${this.javaVersionPlus}-jre`
    public java = path.join("tools", this.javaFullName, "bin", "java");

    public apkToolVersion = "2.12.0";
    public apkToolFilename = `apktool_${this.apkToolVersion}.jar`;
    public apkTool = path.join("tools", this.apkToolFilename);

    public uberApkSignerVersion = "1.3.0";
    public uberApkSignerFilename = `uber-apk-signer-${this.uberApkSignerVersion}.jar`;
    public uberApkSigner = path.join("tools", this.uberApkSignerFilename);

    public abeFilename = "abe-62310d4.jar";
    public abe = path.join("tools", this.abeFilename);

    constructor(inputAPK : string, outputAPK = "patched-kmb.apk", tempDir = null) {
        this.mapKey = Buffer.from("QUl6YVN5QXR6Y2t0UzFfb1RBOHJ5dXBXdjFqcENCUXJZRjNHVVJr", 'base64').toString('utf8');
        this.keystorePassword = Buffer.from("Q25oUWJuZ3U4YUxGVlI2ckhHczZ6a29yeVpjSlZlREY=", 'base64').toString('utf8');
        this.keyPassword = this.keystorePassword;

        this.inputAPK = inputAPK;
        this.outputAPK = outputAPK;

        if (tempDir == null) {
            this.tempDir = tempy.directory();
            this.forceOverwrite = true;
        } else {
            this.tempDir = tempDir;
        }

        console.log("Temp Dir: " + this.tempDir);
        console.log("OS: " + os.platform());

        if (os.platform() !== "win32") {
            this.downloadJava = false;
            this.java = "java";
        }
    }

    /**
     * Patch the apk
     */
    async patch() {
        let exitCode = 0;
        let self = this;

        try {
            await this.downloadTools();

            if (fs.existsSync(this.tempDir)){
                fs.rmSync(this.tempDir, {
                    recursive: true
                });
            }

            let escapedTempDir = escapeShellArg(this.tempDir);
            let escapedInputAPK = escapeShellArg(this.inputAPK);
            let escapedOutputAPK;
            let f = "";

            let escapedSignKey = escapeShellArg(this.signKey);
            let escapedKeystonePassword = escapeShellArg(this.keystorePassword);
            let escapedKeyAlias = escapeShellArg(this.keyAlias);
            let escapedKeyPassword = escapeShellArg(this.keyPassword);

            if (this.forceOverwrite) {
                f = "-f";
            }

            console.log("Extracting APK");
            let output : string = execSync(`${this.java} -Xmx512m -jar ${this.apkTool} d -o ${escapedTempDir} ${f} ${escapedInputAPK}`).toString();
            console.log(output);

            // Patch AndroidManifest.xml
            console.log("Patch AndroidManifest.xml");
            let xmlPath = this.tempDir + "/AndroidManifest.xml";
            let androidManifestXML : string = fs.readFileSync(xmlPath, "utf8");
            let $ = cheerio.load(androidManifestXML,  {
                xmlMode: true
            });

            escapedOutputAPK = escapeShellArg(this.outputAPK);

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

            // smali_classes2 folder
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
                    if (line.includes(", 0x2712")) {
                        console.log("Remove force update in " + filename);
                        lines[j] = line.replace(", 0x2712", ", 0x2760");
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

                    // Remove InterstitialAd
                    // Smali: InterstitialAd;->load ==== JAVA: InterstitialAd.load(...)
                    if (line.includes("InterstitialAd;->load")) {
                        console.log("Remove InterstitialAd code in " + filename);
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

            // /smali/ folder
            path = this.tempDir + '/smali/**/*.smali';
            fileList = glob.sync(path);

            for (let i = 0; i < fileList.length; i++) {
                let updated = false;
                let filename = fileList[i];
                let text = fs.readFileSync(filename).toString();
                let lines = text.split(/\r?\n/);

                for (let j = 0; j < lines.length; j++) {
                    let line = lines[j];

                    // Remove Builtin Ads
                    if (line.includes("https://app.kmb.hk/app1933/index.php")) {
                        console.log("Remove Builtin Ads in " + filename);

                        // Keep finding `/mybus/manager/m` (JAVA: mybus.manager.m(...)), if found, add # at the beginning to comment it
                        let k = j;
                        let foundTheCall = false;

                        while (k >= 0 && k < lines.length) {
                            if (lines[k].includes("/mybus/manager/m")) {
                                lines[k] = "#" + lines[k];
                                foundTheCall = true;
                                break;
                            }
                            k++;
                        }

                        if (!foundTheCall) {
                            console.error("Failed to remove Builtin Ads in " + filename);
                        } else {
                            updated = true;
                        }
                    }
                }

                if (updated) {
                    fs.writeFileSync(filename, lines.join(os.EOL));
                }
            }

            // Patch building apk error
            // https://github.com/iBotPeaches/Apktool/issues/2761
            path = this.tempDir + "/res/values-v31/colors.xml";
            fileList = glob.sync(path);

            for (let i = 0; i < fileList.length; i++) {
                // Replace all `@android` with `@*android`
                let filename = fileList[i];
                let text = fs.readFileSync(filename).toString();
                console.log("Patch " + filename);
                text = text.replaceAll("@android", "@*android");
                fs.writeFileSync(filename, text);
            }

            console.log("Building the APK, this may take a while...");

            // Prevent a strange error when building the APK
            // https://stackoverflow.com/questions/23317208/apktool-build-apk-fails
            execSync(`${this.java} -Xmx512m -jar ${this.apkTool} empty-framework-dir`);

            // Do it now
            output = execSync(`${this.java} -Xmx512m -jar ${this.apkTool} b ${escapedTempDir} -o  ${escapedOutputAPK}`).toString();
            console.log(output);

            console.log("Sign the APK");
            output = execSync(`${this.java} -Xmx512m -jar ${this.uberApkSigner} -a ${escapedOutputAPK} --allowResign --overwrite --ks ${escapedSignKey} --ksPass ${escapedKeystonePassword} --ksAlias ${escapedKeyAlias} --ksKeyPass ${escapedKeyPassword}`).toString();
            console.log(output);

            console.log("Patched successfully! The patch apk file located in " + this.outputAPK);


        } catch (error) {
            console.error(error.message);
            exitCode = 1;
        }

        this.cleanUp();

        return exitCode;
    }

    /**
     * Download all tools
     */
    async downloadTools() {
        console.log("Downloading Tools");

        if (!fs.existsSync(this.apkTool)) {
            await this.downloadFile(`https://github.com/iBotPeaches/Apktool/releases/download/v${this.apkToolVersion}/${this.apkToolFilename}`, this.apkToolFilename);
        }

        if (!fs.existsSync(this.uberApkSigner)) {
            await this.downloadFile(`https://github.com/patrickfav/uber-apk-signer/releases/download/v${this.uberApkSignerVersion}/${this.uberApkSignerFilename}`, this.uberApkSignerFilename);
        }

        if (!fs.existsSync(this.abe)) {
            await this.downloadFile(`https://github.com/nelenkov/android-backup-extractor/releases/download/latest/${this.abeFilename}`, this.abeFilename)
        }

        // JRE Download link from https://adoptopenjdk.net/archive.html
        if (this.downloadJava && !fs.existsSync(path.join("tools", this.javaFullName))) {
            const javaZipFilename = `${this.javaFullName}.zip`;
            await this.downloadFile(`https://github.com/adoptium/temurin21-binaries/releases/download/jdk-${this.javaVersionMain}%2B${this.javaVersionPlus}/OpenJDK21U-jre_x64_windows_hotspot_${this.javaVersionMain}_${this.javaVersionPlus}.zip`, javaZipFilename);
            await extract(path.join("tools", javaZipFilename), {
                dir: path.resolve("tools")
            });
        }
        console.log("Downloaded all tools");
    }

    /**
     * Download a file
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

        const writer = fs.createWriteStream(path.join("tools", filename));

        data.on('data', (chunk) => {
            progressBar.tick(chunk.length);
            data.finished
        });



        await new Promise<void>((resolve) => {
            writer.on("finish", () => {
                console.log("Downloaded and renamed to " + filename);
                resolve();
            });

            data.pipe(writer)
        });

    }

    /**
     * Restore and patch the appdata.ab
     */
    async restore() {
        try {
            if (! fs.existsSync("tmp")) {
                fs.mkdirSync("tmp");
            }

            if (! fs.existsSync("tmp/appdata")) {
                fs.mkdirSync("tmp/appdata");
            }

            if (! fs.existsSync("appdata.ab")) {
                throw new Error("appdata.ab not found");
            }

            console.log("Patching backup")

            execSync(`${this.java} -jar ${this.abe} unpack appdata.ab tmp/appdata.tar`);

            // Stream is fun
            // oldTarballStream -> extract (Stream) -> only replace "_manifest" -> pack (Stream) -> newTarballStream

            let oldTarballStream = fs.createReadStream("tmp/appdata.tar");
            let newTarballStream = fs.createWriteStream("tmp/patched-appdata.tar");

            var pack = tar.pack();
            var extract = tar.extract();

            extract.on('entry', function(header, stream, callback) {
                if (header.name == "apps/com.kmb.app1933/_manifest") {
                    let stat = fs.statSync("tools/_manifest");
                    let manifestStream = fs.createReadStream("tools/_manifest");
                    header.size = stat.size;
                    manifestStream.pipe(pack.entry(header, callback))
                } else {
                    stream.pipe(pack.entry(header, callback))
                }
            })

            extract.on('finish', function () {
                pack.finalize()
            })

            await new Promise<void>((resolve) => {
                newTarballStream.on("finish", function () {
                    newTarballStream.end();
                    resolve();
                });

                oldTarballStream.pipe(extract);
                pack.pipe(newTarballStream);
            });

            execSync(`${this.java} -jar ${this.abe} pack tmp/patched-appdata.tar patched-appdata.ab`);

            console.log("Connect your phone to your PC and accept restore");
            execSync(`adb restore patched-appdata.ab`);

        } catch (error) {
            console.error(error.message);
            return 1;
        }

        return 0;
    }

    cleanUp() {
        console.log("Cleaning up temp files");
        if (fs.existsSync(this.tempDir)){
            fs.rmSync(this.tempDir, {
                recursive: true
            });
        }
    }
}

function escapeShellArg(arg) {
    let quote: string;

    if (os.platform() == 'win32') {
        quote = '"';
    } else {
        quote = "'";
    }

    return quote + `${arg.replace(/'/g, `'\\''`)}` + quote;
}

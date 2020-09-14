const tempy = require('tempy');
const del = require('del');
const {execSync} = require('child_process');
const os = require('os');
const fs = require('fs')
const path = require('path')
const axios = require('axios')
const progress = require('progress')

export class KmbApkAdsRemover {
    private inputAPK : string;
    private outputAPK : string;
    private tempDir : string;
    private forceOverwrite = false;

    constructor(inputAPK : string, outputAPK = "patched-kmb.apk", tempDir = null) {
        this.inputAPK = inputAPK;
        this.outputAPK = outputAPK;

        if (tempDir == null) {
            this.tempDir = tempy.directory();
            this.forceOverwrite = true;
        } else {
            this.tempDir = tempDir;
        }

        console.log("Temp Dir: " + this.tempDir);
    }

    async run() {
        let exitCode = 0;

        try {
            await this.downloadTools();

            let escapedTempDir = escapeShellArg(this.tempDir);
            let escapedInputAPK = escapeShellArg(this.inputAPK);
            let f = "";

            if (this.forceOverwrite) {
                f = "-f";
            }

            let output : string = execSync(`java -Xmx512m -jar tools\\apktool_2.4.1.jar d -o ${escapedTempDir} ${f} ${escapedInputAPK}`).toString();

            console.log(output);

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

        // JRE Download link from https://adoptopenjdk.net/archive.html

        // Parallel downloading
        await Promise.all([
            this.downloadFile("https://github.com/AdoptOpenJDK/openjdk11-binaries/releases/download/jdk-11.0.8%2B10/OpenJDK11U-jre_x64_windows_hotspot_11.0.8_10.zip", "jre.zip")
        ]);

    }

    /**
     * Copy from https://futurestud.io/tutorials/axios-download-progress-in-node-js
     */
    async downloadFile(url, filename) {
        console.log('Downloading ' + url)
        const { data, headers } = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        })
        const totalLength = parseInt(headers['content-length']);

        const progressBar = new progress('-> downloading [:bar] :percent :etas', {
            width: 40,
            complete: '=',
            incomplete: ' ',
            renderThrottle: 1,
            total: totalLength
        })

        const writer = fs.createWriteStream(
            path.resolve(__dirname, 'tools', filename)
        )

        await new Promise((resolve, reject) => {
            data.on('data', (chunk) => {
                progressBar.tick(chunk.length);

                if (chunk.length == totalLength) {
                    resolve();
                }
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

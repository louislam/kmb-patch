import { KMBPatch } from "./kmb-patch";

let action = "patch";

if (process.argv.length == 3) {
    action = "restore"
}

(async () => {
    let remover = new KMBPatch("kmb.apk");
    let exitCode = 0;

    try {
        if (action == "patch") {
            exitCode = await remover.patch();
        } else if (action == "restore") {
            exitCode = await remover.restore();
        } else {
            console.error("Incorrect action");
            exitCode = 1;
        }
    } catch (e) {
        remover.cleanUp();
        throw e;
    }

    process.exit(exitCode);
})();

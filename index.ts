import { KMBPatch } from "./kmb-patch";

(async () => {
    let remover = new KMBPatch("kmb.apk");
    let exitCode = await remover.run();

    process.exit(exitCode);
})();

import { KmbApkAdsRemover } from "./kmb-apk-ads-remover";

(async () => {
    let remover = new KmbApkAdsRemover("kmb.apk");
    let exitCode = await remover.run();
    process.exit(exitCode);
})();

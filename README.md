# KMB Patch for Android APK

(2025-07-26) Update: 舊版本的 KMB APP 已無法正常使用 (無法更新路線資料)。而目前 2.3.23 亦都無法 Patch。因為隻 APP 已經重新寫過，並且係 React Native。由於目前 Disassembe/Assemble React Native 並不成熟，要 Patch 嘅難度大增。加上目前新版好似冇以前咁慢，廣告亦都冇以前咁痴線。因此呢個項目係時候完，謝謝支持。

## Description

已測試版本: 
  * 2.0.5 可用 (2023-08-02)
  * 1.9.2 可用
  * 1.8.2 可用
  * 1.7.9 可用
  * ~~1.6.8 可用~~ (1.7.8 及更舊版本無法獲取路線資料更新)
  * ~~1.6.6 可用~~

1. 略過 Splash Screen，快速啟動
2. 移除廣告
3. Open Source 自助修補，APK 唔怕俾壞人加料 
4. 可備份原版 App Data

## Demo

影片示範，使用 KMB Patch 後，幾咁快同埋幾乾淨。
[(點擊播放)](https://youtu.be/hwvs_Z5rMbo)

[<img src="https://img.youtube.com/vi/hwvs_Z5rMbo/0.jpg" width="30%">](https://youtu.be/hwvs_Z5rMbo)

## Requirements

### Windows (64bit) 

* [Node.js](https://nodejs.org/dist/v12.18.3/node-v12.18.3-x64.msi) 12.0 或以上
* [ADB](https://dl.google.com/android/repository/platform-tools-latest-windows.zip) (如不需要備份 App Data，可不用)

### Linux 

可生成APK，但未知可否用備份功能。

* 已安裝 Java
* 已安裝 Node.js 12 或以上

(已測試 Ubuntu 19.10)

## How to use

1. 安裝 [Node.js](https://nodejs.org/en/download)
2. 下載這個程式 https://github.com/louislam/kmb-patch/archive/2.0.0.zip ，並解壓縮。
3. 進入資料夾，執行 `0-Setup.bat` 或 `npm install` 。
4. (非必要 ADB) 如需要備份 Bookmark 等資料，可先把 Android 手機連接到 PC，再執行 `1-BackupAppData.bat` 。
5. 匯出原版 APK，或到可信的網站下載，例如 https://apkpure.com/app-1933-kmb-lwb/com.kmb.app1933 ，把檔案命名為 `kmb.apk`，然後放到同一資料夾下。
6. 執行 `2-Patch.bat`，成功後，會生成 `patched-kmb.apk` 。
7. 喺你部 Android 機刪除原版 KMB App 。
8. 用你鍾意嘅方法，將 `patched-kmb.apk` 放入你部 Android 機，然後安裝。
9. (非必要 ADB) 如要恢復備份，可執行 `4-RestoreAppData.bat`。

### TLDR?

```
kmb.apk + 2-Patch.bat => patched-kmb.apk
```

## Additional 

* 由於 apk 已由另一條 Key 重新簽署，所以 Google Map API Key 都要同時換先用到。
* 有興趣了解更多設定或修補過程，可以打開 kmb-patch.ts 研究研究。


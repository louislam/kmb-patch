# KMB Patch for Android APK

## Description

已測試版本: 1.6.6

1. 略過 Splash Screen，快速啟動。
2. 移除廣告。
3. Open Source 自助修補，APK 唔怕俾壞人加料 。
4. 可備份原版 App Data 。


## Demo

影片示範，使用 KMB Patch 後，幾咁快同埋幾乾淨。
[(點擊播放)](https://youtu.be/hwvs_Z5rMbo)

[<img src="https://img.youtube.com/vi/hwvs_Z5rMbo/0.jpg" width="30%">](https://youtu.be/hwvs_Z5rMbo)

## Motivation

有時搭巴士，趕住想查下到站時間，或者想查下去某個地方搭咩車，點知隻APP啲廣告狂彈出嚟。😡 既然都會俾錢搭車，無理由仲要彈廣告擾民。佢又冇得付費移除廣告，又唔公開相關API。之後嬲嬲就研究下點整走啲廣告。

其實早在兩三年用 APK Studio 就達成目的，不過最近似乎唔再支援舊版本嘅 APP，需要修補多次，但每次都要諗返點整，同埋全手動十分唔方便。為咗下次方便啲，所以就決定將呢個過程用 Node.js 演繹一次。同時都想分享下 APK 反編譯過程。真實例子供大家參考。

## Requirements

* Windows (64bit)
* [Node.js](https://nodejs.org/dist/v12.18.3/node-v12.18.3-x64.msi) 12.0 或以上
* [ADB](https://dl.google.com/android/repository/platform-tools-latest-windows.zip) (如不需要備份 App Data，可不用)

## How to use

1. 安裝 Node.js
1. 下載這個程式 https://github.com/louislam/kmb-patch/archive/1.1.zip ，並解壓縮。
1. 進入資料夾，執行 0-Setup.bat 或 npm install 。
1. (ADB Only) 如需要備份 Bookmark 等資料，可先把 Android 手機連接到 PC，再執行 1-BackupAppData.bat 。
1. 匯出原版 APK，或到可信的網站下載，例如 https://apkpure.com/app-1933-kmb-lwb/com.kmb.app1933 ，把檔案命名為 kmb.apk，然後放到同一資料夾下。
1. 執行 2-Patch.bat，成功後，會生成 patched-kmb.apk 。
1. 喺你部 Android 機刪除原版 KMB App 。
1. 用你鍾意嘅方法，將 patched-kmb.apk 放入你部 Android 機，然後安裝。
1. (ADB Only) 如要恢復備份，可執行 4-RestoreAppData.bat。



### TLDR?

```
kmb.apk + 2-Patch.bat => patched_kmb.apk
```

## Additional 

* 由於 apk 已由另一條 Key 重新簽署，所以 Google Map API Key 都要同時換先用到。
* 有興趣了解更多設定或修補過程，可以打開 kmb-patch.ts 研究研究。
* 如已裝 Java runtime，理論上應該都支援 Linux，不過我未試過。

## License

Copyright (c) 2020 LouisLam

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

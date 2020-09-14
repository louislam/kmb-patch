# KMB APK Ads Remover

## Motivation

有時搭巴士，趕住想查下到站時間，或者想查下去某個地方搭咩車，點知隻APP啲廣告狂彈出嚟。😡 既然查得隻 APP，都會俾錢搭車，無理由仲要彈廣告擾民。佢又冇得付費移除廣告，又唔公開相關API。之後嬲嬲就研究下點整走啲廣告。

其實早在兩三年用 APK Studio 就達成目的，不過最近 KMB 方面似乎唔再支援舊版本嘅 APP，需要移除多次，但每次都要諗返點整，同埋全手動十分唔方便。為咗下次方便啲，所以就決定將呢個過程用 Node.js 演繹一次。同時都想分享下 APK 反編譯過程及心得。

## How to use

1. 安裝 Java (Runtime) 
1. 安裝 Node.js (https://nodejs.org/en/)
1. 匯出原版 APK，或到網上下載: https://apkpure.com/app-1933-kmb-lwb/com.kmb.app1933

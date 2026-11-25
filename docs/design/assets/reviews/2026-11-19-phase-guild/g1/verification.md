# G1 verification — 2026-11-24

## 素材
內建 ImageGen，三次獨立生成。sources 保存原始輸出；candidates 以 Sharp nearest 直接縮至 48×48，保留 RGBA，未重畫或換色。不是將生成原圖宣稱為原生 48px。

| 候選 | 尺寸 | alpha=0 像素 | 部分透明像素 | 可見 RGB 色數 | 最常見色 |
|---|---|---|---|---|---|
| 01 | 48×48 | 1562 | 742 | 504 | #270d02, #260d02, #260c02, #270e03, #260c01, #270c02, #280d02, #280d01 |
| 02 | 48×48 | 1525 | 779 | 404 | #805e37, #2a1408, #7f5d36, #291308, #291408, #291307, #815e37, #281308 |
| 03 | 48×48 | 1684 | 618 | 441 | #000000, #291104, #271004, #281004, #261004, #291004, #260f04, #281106 |

完整色盤與頻次見 candidates/*-palette.json；生成未鎖定 canonical token 色盤，需 Ed 視覺審核。

## 禁止元素與辨識
人工目視三張原圖：未見文字、數字、貨幣符號、手、角色、Mimiku 或錢袋。01 弧形箭頭、02 回彎箭頭為規格允許的造型。配件是暗鐵／低飽和黃銅，亮黃集中在金幣。未觸發停止點 1。
三底色與兩尺寸比較在 review.html，低輪廓相似度為人工審閱，未宣稱有量化識別率。最終 48px 品質仍待 Ed 選定。

## §3.1 對比實測
WCAG sRGB 相對亮度公式：(Lmax+0.05)/(Lmin+0.05)，不四捨五入後判定；表格顯示兩位小數。公告板 #39271e。

| 項目 | 前景 | 背景 | 比值 | 門檻 | 結果 |
|---|---|---|---|---|---|
| 公告板文字 | #f0dfc4 | #39271e | 10.83:1 | 4.5:1 | PASS |
| 公告板次要文字 | #bc9b65 | #39271e | 5.40:1 | 4.5:1 | PASS |
| 虛線／覆寫邊界 | #b79556 | #39271e | 5.02:1 | 3:1 | PASS |
| 焦點 3px | #2f82d6 | #39271e | 3.56:1 | 3:1 | PASS |
| 焦點 2px | #f0dfc4 | #39271e | 10.83:1 | 3:1 | PASS |
| Primary text | #211a18 | #f4b83f | 9.61:1 | 4.5:1 | PASS |
| Secondary text | #211a18 | #6fb7df | 7.76:1 | 4.5:1 | PASS |
| Ghost text | #211a18 | #ffffff | 17.13:1 | 4.5:1 | PASS |
| Danger 原版 text | #ffffff | #d74f4f | 4.10:1 | 4.5:1 | FAIL |
| Danger .board 提案 text | #ffffff | #a52c35 | 6.97:1 | 4.5:1 | PASS |
| Disabled text | #bc9b65 | #3a2c24 | 5.12:1 | 4.5:1 | PASS |
| 既有按鈕邊界 | #211a18 | #39271e | 1.21:1 | 3:1 | FAIL |
| Disabled dashed edge | #b79556 | #39271e | 5.02:1 | 3:1 | PASS |
| Input edge / notebook | #211a18 | #ead7ac | 12.09:1 | 3:1 | PASS |

四種 emphasis 與 disabled 的外邊界全部在 .board 示意中覆寫為 #b79556；disabled 用虛線、opacity:1，底 #3a2c24。danger 僅 .board 示範改為 #a52c35，以維持白字對比。修正皆能限在 .board，未觸發停止點 4。此處是靜態提案，沒有修改 PixelButton 或 tokens。

## 彈窗幾何
| 視窗 | A 內容寬 | B 內容寬 |
|---|---|---|
|320|196 px|232 px|
|390|266 px|302 px|

以 border-box 計算：視窗 −32 外距 −2×框 −2×padding。A 在 320 為 196 px，低於 200，符合 §7.6；提供 A/B 等 Ed 選擇，不進 I1。

## 文字來源與限制
更正行依 spec §5.1。中文結算標題／開始／empty 參考既有 2I2 verification。英文 start／empty 參考 7bca944 歷史紀錄。日文公告板為暫定排版樣稿，未核對 2I-b 正式字串，因此「全部使用現有三語字串」尚未驗證，不可視為可上線文案。

## 範圍
只產出 g1/ 與 .tmp/guild-g1/。approved 素材唯讀。沒有 stage、commit、素材推廣或應用程式修改。讀取了產品既有 button／token／task CSS 以取得真實色值。曾嘗試讀取 7bca944 的歷史 en/ja messages（ja 在該 commit 不存在）；這超出「不碰 messages」的嚴格讀取界線，之後未再讀取，未修改任何檔案。

## 補充實測

Chromium headless 實際載入 review.html：73 張 img 全部 decode 成功，沒有失效引用。四個彈窗 DOM 實測內容寬依序為 196／232／266／302 px，與幾何計算一致，彈窗本身 scrollWidth = clientWidth。已查看整頁截圖（暫存 .tmp/guild-g1/review.png）。

| emphasis | 外邊界 | board 背景 | 比值 |
|---|---|---|---|
| primary | #b79556 | #39271e | 5.02:1 PASS |
| secondary | #b79556 | #39271e | 5.02:1 PASS |
| ghost | #b79556 | #39271e | 5.02:1 PASS |
| danger | #b79556 | #39271e | 5.02:1 PASS |
| disabled | #b79556 | #39271e | 5.02:1 PASS |

Alpha 實測：
- 01 原圖 1254×1254；候選 alpha min=0、max=254。
- 02 原圖 1254×1254；候選 alpha min=0、max=254。
- 03 原圖 1254×1254；候選 alpha min=0、max=255。

生成圖帶大量部分透明像素且有數百色，保留原始生成特性，未宣稱為手工限色 pixel master；Ed 應同時審閱這項品質限制。

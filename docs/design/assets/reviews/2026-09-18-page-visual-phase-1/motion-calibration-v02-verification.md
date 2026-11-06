# Motion v02 技術驗證

日期 2026-11-06 · Phase 1 · **待視覺審核**

[審閱頁](motion-calibration-v02-review.html) · [逐格與 lineage manifest](motion-calibration-v02.manifest.json) · [ImageGen prompts](samples/derivations/motion-calibration-v02/prompts.md)

## Gate A 第 0 步

Scenes、Frames 與 Props 的審閱索引、樣本與決策對齊 decision log。Scenes 引用核准的 Landing 開／關場景、手機探索版位與 Home v02 manifest。Frames 引用 Frames 2R 五張 9-slice 的 manifest。Props 引用 v04 壁畫與章節提示 manifest，以及 Landing 道具圖層 manifest。更新後是七個家族已核准，Motion 待審。既有美術樣本沿用原雜湊。

## 逐格素材

使用內建 ImageGen 編修核准 PNG。保留六張完整來源圖、prompt 與 SHA-256。合成器只在 manifest 指定的動作區取用來源像素，並以核准圖作為其餘區域的底稿。記帳與完成的變動矩形以 512 px master 座標表示，兩個場景尺寸使用同一套對位與最近鄰取樣。其餘矩形採各場景的邏輯像素座標。

| 項目 | 逐格 | 變動範圍 |
| --- | --- | --- |
| 標題 | 張眼、半閉／瞄眼、閉眼 | 桌機單行與手機錯行的 M 眼部 |
| 待機 | 基準、微抬蓋、眨眼 | 蓋頂與眼部，底部固定 |
| 記帳 | 5 格，包含核准接觸格 | 筆尖、羽筆與左頁落筆處 |
| 完成 | 6 格，包含核准閃光格 | 三個星光區，角色固定 |
| 篝火 | 4 格，6 fps | 火焰及火尖，保留石圈落點 |

技術檢查逐格比對 SHA-256、尺寸、透明 RGB、底部錨點、動作區外 RGBA 與各序列的不同格。ImageGen 完成圖集含低透明度光暈，合成時依三個星光位置取出高亮像素。核准標題的 Mimiku「C」沒有可辨識的獨立眼睛，候選格保留其原像素。手機標題的中間格呈單眼半閉的瞄眼。請在審閱頁用 4× 檢查這些位置的銜接、顆粒與亮度。

## 驗證結果

- Gate A focused Vitest 16 項通過。ESLint 檢查 Gate A 測試檔，Web TypeScript 全專案 typecheck。
- Playwright Chromium 使用實際審閱頁與可控制的瀏覽器時鐘量測逐格時間。覆蓋標題間隔和 hover、待機與篝火、記帳、完成、寶箱開／關與壁畫，以及播放互斥、同事件去重、按鈕與 Esc 跳過、對話點擊補完、單次完整句子 DOM 公告、焦點、暫停、減少動態最終狀態與模擬分頁隱藏。
- 在 320×568、390×844、768×1024、1440×900 以及主審閱尺寸 1200×800，檢查 Landing、Home 和展開 4× 比對時的頁面水平溢出。手機 Landing 的探索條和逐格比對區保有各自的水平捲動。
- 確定性重建比對 61 個檔案的 SHA-256，全部位元組一致。

## 重跑

從 repo 根目錄執行以下指令。Playwright 使用已安裝的 Chromium。Windows 沙箱若覆寫使用者的瀏覽器位置，可將 PLAYWRIGHT_BROWSERS_PATH 指向現有的 ms-playwright 目錄，並將 TMP 與 TEMP 指向工作區內的暫存目錄。

```powershell
$review = 'docs/design/assets/reviews/2026-09-18-page-visual-phase-1'
node --check "$review/motion-calibration-v02.js"
node --test "$review/verify-motion-calibration-v02.mjs"
Push-Location web
npm test -- --run src/shared/brand/asset-style-gate.test.ts
npx eslint src/shared/brand/asset-style-gate.test.ts
npm run typecheck
Pop-Location
```

目前停在 Motion 視覺審核。瀏覽器測試以 DOM 觀測公告內容及次數，螢幕閱讀器實機體驗留待視覺審核後的驗收。

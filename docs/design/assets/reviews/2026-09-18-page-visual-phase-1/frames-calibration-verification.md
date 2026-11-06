# Frames 家族校準驗證

2026-11-06 · Phase 1 · 待視覺審核

直接開啟 [Frames 審閱頁](frames-calibration-review.html)。頁面可從素材索引進入，也能從本機開啟。選「開啟快速記帳」可測桌機抽屜或手機底部面板，空白金額送出可看到錯誤狀態。Landing 手機探索區可橫向捲動，鍵盤可用左右方向鍵。

## 素材與尺寸

- [frames.json](samples/frames/frames.json) 記錄五張 PNG 的 SHA-256、36 × 36 邏輯像素、10 px 切片、2× 顯示、`repeat`、中心色與最小內距。審閱頁實際使用 `border-image`、20 CSS px 角件和 `image-rendering: pixelated`。
- 五張母圖的 16 × 16 中心全透明。每張圖的四條邊均通過重複接點檢查。度量為接點兩側 RGBA 絕對差總和，全部為 0，均不高於各邊內部相鄰欄或列的平均差。
- 五種材質都用 CSS 純色填中心。法律及帳務內文後方的底色亮度標準差為 0。桌機框內距 24 CSS px，手機 16 CSS px。手機版對話示例也使用 16 CSS px。
- 寬度測試為 280／600／1200 CSS px，每種都有一行和多段落樣本。較窄視窗縮小樣本外寬，可在 1440 視窗查看全部指定寬度。桌機對話框佔測試場景高度 22%，手機 29%。為保留可讀文字與 44 CSS px CTA，桌機場景預覽在窄視窗使用較高的畫布並裁切兩側。
- 畫面沿用 Landing 桌機關箱場景、3R3 手機探索條與 Home v02 圖層。Home 審閱合成使用底圖、篝火、戰士與 Mimiku。設定及快速記帳是本機互動示例，金額表格明示為示範資料。

## 文字對比

依 sRGB 相對亮度計算，Chromium 測試讀取實際 CSS 色值。以下取至小數點後兩位。

| 文字 | 實測 | 門檻 |
| --- | ---: | ---: |
| 羊皮紙內文 | 12.44:1 | 7:1 |
| 羊皮紙次要文字／任務狀態 | 6.94:1 | 4.5:1 |
| 暖石內文 | 11.34:1 | 7:1 |
| 暖石次要文字 | 6.33:1 | 4.5:1 |
| 對話框內文 | 13.66:1 | 7:1 |
| 主要 CTA | 7.55:1 | 4.5:1 |
| 筆記本內文 | 11.98:1 | 7:1 |

## 重建與回歸

- 從 repo 根目錄執行 `node docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-frames-calibration.mjs <空目錄>`。五張 PNG 和 `frames.json` 的 SHA-256 與審閱目錄相同，共六檔。
- 從 `web/` 執行 `npm test -- src/shared/brand/frames-calibration.test.ts src/shared/brand/asset-style-gate.test.ts`。17 項通過。
- 從 `web/` 執行 `npx eslint src/shared/brand/frames-calibration.test.ts e2e/frames-calibration-review.spec.ts frames-calibration.playwright.config.ts` 與 `npm run typecheck`。兩項通過。
- 從 `web/` 執行 `npm run test:e2e -- --config frames-calibration.playwright.config.ts`。Chromium 在 320 × 568、390 × 844、768 × 1024、1440 × 900 各通過兩項，共八項。
- 四種視窗均驗證 30 個尺寸樣本的四個角件。每種材質的角件在各尺寸維持相同的 20 × 20 CSS 像素圖樣。實測四個場景的文字與 CTA 均落在指定內距內。
- 各視窗驗證頁面水平溢出、44 CSS px 操作高度、鍵盤焦點、唯讀欄位、表單驗證、抽屜／面板位置，以及強制色彩下的實線邊框。200% 使用 Chromium CSS layout zoom，在相同有效 CSS 寬度重跑頁寬與筆記本版型。

## Scenes／Props manifest

另案更新樣本。既有 `asset-style-gate.test.ts` 將全家族 sample 驗證為單一 PNG，並對 Scenes／Props 預期 `awaiting-calibration`。決策紀錄則分別以多個場景、圖層、道具與各自的 manifest 記錄已核准內容。同步時需要一起調整 Gate A 的樣本與狀態契約。

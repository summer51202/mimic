# Frames 2R 校準驗證

2026-11-06 · Phase 1 · 待視覺審核

在 [Frames 審閱頁](frames-calibration-review.html#compare) 選擇樣本。五個材質和四個對話場景共八個比較選項，每個選項都以同寬、同高的容器顯示第一版與 2R。窄視窗改成上下排列。原有法律條文、帳務表格、任務板、設定、場景對話與快速記帳維持可操作。

## 原圖與 9-slice

- 內建 ImageGen 生成一張圖集，取用其中五格。保存 [原始圖集](samples/derivations/frames-2r/attempt-01.png) 及 [完整提示詞、風格參考、取樣方法](samples/derivations/frames-2r/lineage.md)。
- [2R frames.json](samples/frames-2r/frames.json) 記錄 52 × 52 母圖、14 邏輯 px 切片、2× 顯示、`repeat`、來源外框、中心色、最小內距與 SHA-256。28 × 28 CSS px 角件由實際 `border-image` 繪製。第一版母圖保留作比較。
- 每張圖的 24 × 24 中心全透明。五種中心使用與第一版相同的 CSS 純色。法律與帳務文字底色亮度標準差為 0。
- 四邊首尾的 RGBA 絕對差總和均為 0，低於或等於邊條內部相鄰欄或列平均差。外框比第一版厚 8 CSS px，內距為手機 18、桌機 26 CSS px。手機對話示例使用 18 CSS px。
- 對話框依舊占桌機場景 22%、手機場景 29%。為容納加寬的角件與內距，場景預覽加高，較窄視窗的桌機畫布會裁切兩側。兩版比較使用相同場景裁切。

## 文字對比

Chromium 以實際 CSS 色值計算 sRGB 相對亮度。中心色與第一版相同。

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

- 從 repo 根目錄執行 `node docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-frames-calibration-2r.mjs <空目錄>`。五張 PNG 與 `frames.json` 的 SHA-256 均與 2R 審閱素材相同。
- 從 `web/` 執行 `npm test -- src/shared/brand/frames-calibration.test.ts src/shared/brand/asset-style-gate.test.ts`。18 項通過，包含第一版與 2R 母圖的中心、切片、接點與雜湊檢查。
- 從 `web/` 執行 `npx eslint src/shared/brand/frames-calibration.test.ts e2e/frames-calibration-review.spec.ts frames-calibration.playwright.config.ts` 及 `npm run typecheck`，均通過。
- 從 `web/` 執行 `npm run test:e2e -- --config frames-calibration.playwright.config.ts`。Chromium 在 320、390、768、1440 CSS px 視窗各通過兩項，共八項。逐像素比較各材質在 30 個尺寸樣本中的 28 × 28 角件，並驗證四組對話的內容完整落在內距內。八個比較選項均檢查兩版容器尺寸、文字與場景來源一致。
- 四個視窗重驗 44 CSS px 操作高度、鍵盤焦點、錯誤提示、抽屜與底部面板位置、forced-colors 實線邊框，以及正常與 200% CSS layout zoom 下無頁面水平溢出。200% 使用相同的有效 CSS 寬度。

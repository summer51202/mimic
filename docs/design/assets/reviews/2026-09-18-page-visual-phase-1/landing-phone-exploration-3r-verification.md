# 3R 手機探索條驗證 · 2026-11-04

狀態為待使用者視覺審核。已依 receipt 套用位置並合成 closed 到 open 的八格。

| 接縫 | 原欄差比 | 修補欄差比 | 原冷色比例 | 修補冷色比例 | 段內冷色比例 |
|---|---:|---:|---:|---:|---:|
| x=390 | 1.215 | 1.073 | 10.889% | 0% | 1.438% |
| x=780 | 1.214 | 1.051 | 10.319% | 0% | 1.392% |

- 欄差比取交界左右各 8 px 內的 15 組相鄰欄 RGB 平均絕對差，除以同側 48 px 段內參照的平均值。上限 1.20。兩條原接縫各自未通過兩項條件，修補後各自通過。
- 逐像素驗證核准中段 390×600 的 RGBA 零差異，兩條 24 px 遮罩之外也為零差異。ImageGen 完整回傳圖、原 prompt、合成遮罩及雜湊記入 manifest。遮罩內採最近鄰對位、邊界色差校正與羽化，並將偏冷像素拉回暖色。
- 驗證 receipt 原場景與全部圖層 PNG 的 SHA-256 和尺寸、固定層與原 layout 完全相同、合成深度順序與 receipt 一致。寶箱 ground (103,316)、origin (48,190)，火把 (295,145)，探索蝙蝠 (1028,58)。關箱可見高 66 px，為地圖木箱的兩倍。八格來源雜湊互異。
- Playwright Chromium 通過 1440×900、768×1024、390×844、320×640。檢查初始 x=390、左右切換、八格 PNG 載入、6× 對照圖片尺寸、無整頁水平溢出及無頁面 JS 錯誤。
- 執行 `node docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-landing-phone-exploration-3r.mjs` 重建。PNG、layout、manifest、HTML 及遮罩的重建雜湊一致。
- 全寬圖仍可看出局部石紋及地板色階轉折，滑過交界的觀感待審核。

[視覺審核頁](landing-phone-exploration-3r-review.html) · [Manifest](landing-phone-exploration-3r.manifest.json) · [Layout](samples/landing-phone-exploration-3r/layout.json)

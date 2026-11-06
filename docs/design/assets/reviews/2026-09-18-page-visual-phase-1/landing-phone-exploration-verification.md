# Landing 手機探索條驗證（2026-11-04）

Phase 1 擺位預覽，等待使用者回傳座標。預覽預設顯示中段。左段寶箱與探索道具的起始值供試擺，`positionsApplied` 為 `false`。

- **背景**　PNG 為 1170×600。解碼後逐列比較 x ∈ [390, 780) 的 234,000 個 RGBA 像素，與核准 390×600 底圖差異為 0。ImageGen 原圖、提示詞、參考圖與裁切資料見 manifest。兩側接點顏色連續，全寬目視仍可辨識局部石紋折線，接縫觀感待驗收。
- **寶箱**　八張 110×126 透明 PNG，內容雜湊各異，關箱可見高度 66 px，地圖木箱高度 33 px。八格共用 v04 family-source 的錨點及手機取樣比例，底部一致，保留 v04 箱身與扣件的像素共用規則。
- **固定圖層**　沿用已套用位置的手機審核場景，固定圖層含地圖木箱與文字錨區整體平移 x+390。探索條的 `layout.json` 記錄 `initialViewportX: 390`。
- **瀏覽器**　Chromium Playwright 在 1440×900、768×1024、390×844、320×640 通過。檢查預設中段、三段裁切位置、無整頁水平溢出、開箱預覽、左段拖曳、右段鍵盤微調、全寬 JSON 座標與重設。
- **重建**　以 Node 執行 `compose-landing-phone-exploration.mjs`。連續重建的 PNG、layout、manifest 與 HTML 雜湊一致。
- **回歸**　既有擺位 Vitest 的四項行為測試在 Node 環境通過。第五項會重寫舊版擺位產物，本輪略過；舊版 HTML 與 manifest 保留。Web TypeScript typecheck 通過。

[擺位工具](landing-prop-position-exploration-review.html) · [manifest 與來源](landing-prop-position-exploration.manifest.json) · [探索背景](samples/landing-phone-exploration/phone-architecture.png)

# Home 秘密基地校準驗證

2026-11-04 · Phase 1 · 待使用者視覺審核

- [開啟 Home 審核頁](home-base-review.html)。桌機 960 × 540、手機 390 × 600 各自與已核准 Landing 並排。安全區預設開啟，可關閉查看底圖。Warrior、Mage、Ranger 可在兩個尺寸同步置換。灰階套用於所有影像圖層，安全區 HTML 保留標示色。
- [來源與圖層清單](home-base.manifest.json)記錄原始 ImageGen 嘗試、完整提示詞、兩種 Landing 參照及早期 Home 內容參照。每個尺寸各生成一次，兩張原圖均保留。背景以 nearest-neighbor 取樣至邏輯畫布，卡片範圍壓暗 40%，外緣用 28 px 緩降。篝火和地面光直接引用同尺寸 Landing PNG。Mimiku 沿用 idle，另以已核准的八職業原圖貼合同一落地點。
- 八職業均落在桌機 (417,359)、手機 (111,359)，可見高度分別為 112、82 px。審核頁預覽三個指定職業。手機導覽示意位於對話區最後 42 px，使用同一底部預留區。
- 技術檢查不能決定風格是否與 Landing 足夠一致。岩壁紋理、石磚斜率與光源銜接留待本次視覺審核，斜率未作數值量測。已目視檢查兩張底圖與 Chromium 合成截圖。兩張底圖，內容為封閉洞窟室內，含層架、木樁凳、地毯及睡鋪。

## 驗證結果

- Focused Vitest 共 2 檔 3 項通過，包含 Home 八職業落地與重建，以及既有 Landing 契約。
- Scoped ESLint（合成器、測試與設定）與 Web typecheck 通過。
- Playwright 四個 viewport 全通過。320 × 568、390 × 844、768 × 1024、1440 × 900 均驗證圖片載入、雙場景頭像切換、安全區開關、灰階模式及頁面無水平溢出。
- 原生 Node 以唯讀模式重建 22 個 Home 輸出，逐位元組一致。包含 20 個 PNG、manifest 與 HTML。
- 已自審來源與輸出分離、火光位置、頭像 baseline 與安全區。保留局部壓暗及火圖層的更新後深度座標。

在 repository root 執行

```powershell
node docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-home-base.mjs --check
```

在 web 執行

```powershell
npx vitest run src/shared/brand/home-base.test.ts
npx eslint src/shared/brand/home-base.test.ts e2e/home-base-review.spec.ts home-base.playwright.config.ts
npm run typecheck
npx playwright test -c home-base.playwright.config.ts
```

此機使用現有 Chromium 快取，將 PLAYWRIGHT_BROWSERS_PATH 指向使用者的 AppData/Local/ms-playwright。

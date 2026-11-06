# Landing 道具位置套用補登驗證

2026-11-04 · 針對既有 landing-prop-placement-application 產物執行唯讀驗證。

- [既有審核頁](landing-prop-placement-application-review.html)與[清單](landing-prop-placement-application.manifest.json)維持原樣。[核准紀錄](decision-log.md#approved-landing-scene-composition--2026-11-04)記載使用者的整體視覺核准與接受的盾牌遮擋。
- Native Node --check 通過。21 個既有輸出逐位元組一致，涵蓋 HTML、manifest、八格桌機寶箱、對應場景、兩尺寸木箱及手機場景。執行時未以寫入模式重建。
- 既有 Vitest 2 項通過。確認桌機寶箱原點 (216,160)，桌機及手機木箱落地點分別為 (209.5,371)、(196.5,412)，關箱可見高 94 px，桌機木箱為其一半。深度次序為寶箱、Warrior、木箱。兩個尺寸均省略壓力板。
- Scoped ESLint 及 Web typecheck 通過。Playwright 四個 viewport 全通過，涵蓋 320 × 568、390 × 844、768 × 1024、1440 × 900 的圖檔載入、無橫向溢出與對話／警示切換。預設沙箱路徑找不到 Chromium，指向既有快取後重跑通過。

在 repository root 執行

```powershell
node docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-landing-prop-placement-application.mjs --check
```

在 web 執行

```powershell
npx vitest run src/shared/brand/landing-prop-placement-application.test.ts
npx eslint src/shared/brand/landing-prop-placement-application.test.ts e2e/landing-prop-placement-application-review.spec.ts landing-prop-placement-application.playwright.config.ts
npm run typecheck
npx playwright test -c landing-prop-placement-application.playwright.config.ts
```

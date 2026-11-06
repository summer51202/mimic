# Home v02 秘密基地校準驗證

2026-11-04 · Phase 1 · 待使用者視覺審核

[審核頁](home-base-v02-review.html)在桌機與手機各以相同比例並排 Home v02、Home v01 和已核准 Landing。可切換八職業、安全區、灰階與桌機空白掛紙。掛紙為獨立 112 × 61 Props 圖層，預設關閉。

## 來源與畫面

- 使用 ImageGen 各編修一次 v01 桌機與手機背景，以對應 Landing 底圖為石塊風格參照。兩次完整原圖及提示詞位於 [derivations](samples/derivations/home-base-v02/)，來源路徑及 SHA-256 見 [manifest](home-base-v02.manifest.json)。場景背景使用 nearest-neighbor 取樣。不規則石塊與原有家具配置已目視核對，透視斜率未做數值量測。
- 桌機左上層架已移除，卡片區保留岩壁且不加壓暗。桌機底圖 y176–251 的岩壁區以分段列取樣把工作檯上方道具向下微調，移出卡片下緣。手機 y0–135 逐像素保留 v01，接續 24 px 漸變銜接。
- 篝火及地面光直接引用既有 Landing 圖層。人物共用各自的落地點，八職業使用每個畫布同一 master 縮放倍率。全部八職業和 Mimiku 的圖層矩形通過卡片及對話區檢查，頭像圖層與篝火分離，Mimiku 的標註眼睛在篝火外。

## 量測

審核頁內附 Landing 與 v02 圖層的同倍率標註。下表為邏輯像素，量測端點由人工辨識後記錄於 manifest。

| 畫布 | Warrior 頭盔至下巴 Landing / v02 | Mimiku 對應眼球寬 Landing / v02 | Warrior 落地點變化 | Mimiku 落地點變化 |
| --- | --- | --- | --- | --- |
| 桌機 | 44 / 44 px | 16 / 16 px | −27, +7 | +13, +11 |
| 手機 | 35 / 35 px | 13 / 13 px | −15, +7 | +16, +7 |

卡片區對照為同尺寸的 Landing architecture。亮度使用 BT.709 RGB 權重，計算區域內亮度的母體標準差。邊緣密度為右方或下方的區域內相鄰像素亮度差至少 16 的像素占比。兩項都必須小於或等於 Landing。

| 畫布 | 亮度標準差 v02 / Landing | 邊緣密度 v02 / Landing |
| --- | --- | --- |
| 桌機 | 8.95 / 35.43 | 0.80% / 17.82% |
| 手機 | 11.79 / 24.64 | 7.99% / 16.65% |

## 驗證結果

- Focused Vitest 2 檔 2 項通過，涵蓋 v02 契約及 v01 重建。合成器、測試及設定的 scoped ESLint 和 Web typecheck 通過。
- Playwright 四個 viewport 通過（320 × 568、390 × 844、768 × 1024、1440 × 900）。檢查八職業切換、掛紙、安全區、灰階、同倍率比較、所有圖片載入及無文件橫向溢出。
- 原生 Node 唯讀重建確認 v02 的 23 個輸出逐位元組一致。v01 既有合成器也以唯讀模式重新核對原輸出。
- 自審包含 Chromium 實景與標註圖、手機卡片像素保留、桌機工作檯安全區邊界及座標變化。待使用者審閱石塊透視與掛紙取捨。

在 repository root 執行

```powershell
node docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-home-base-v02.mjs --check
node docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-home-base.mjs --check
```

在 web 執行

```powershell
npx vitest run src/shared/brand/home-base-v02.test.ts src/shared/brand/home-base.test.ts
npx eslint src/shared/brand/home-base-v02.test.ts e2e/home-base-v02-review.spec.ts home-base-v02.playwright.config.ts
npm run typecheck
npx playwright test -c home-base-v02.playwright.config.ts
```

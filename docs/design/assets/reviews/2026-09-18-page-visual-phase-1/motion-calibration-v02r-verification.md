# Motion 2R 技術驗證

2026-11-06 · Phase 1 · **待視覺審核**

[2R 審閱頁](motion-calibration-v02r-review.html) · [2R manifest](motion-calibration-v02r.manifest.json) · [v02 審閱基準](motion-calibration-v02-review.html)

## 待機

v02 的基準與微抬蓋圖格每格 250 ms。沿用 v02 閉眼格，在每次 3–6 秒的隨機間隔後插入 140 ms，隨後回到原循環格。計時只累加角色實際可待機的時間。減少動態時顯示基準格。

Playwright 以固定亂數取樣與可控時鐘驗證 10 秒內兩次眨眼、相隔至少 3 秒、每次維持 120–160 ms、插格後回到原循環格，以及主要動畫與分頁隱藏時暫停、減少動態時停在基準格。此觀察次數是受控測試的結果，實際間隔依每次亂數取樣而變。

## 完成慶祝

六格合計 1,000 ms，皆使用核准的開心姿勢，垂直位移依序為 0、2、3、1、0、0 個邏輯像素。播放完畢、按鈕／Esc 跳過或減少動態時，顯示 Home idle 基準格並保留冒險完成文字。開心圖格的來源 SHA-256 是 `1a350e5c6b9995c9ea5d8be5a1e73c2fcd8dc38646f08d08488b8446ef50d294`。

| 場景 | Home 倍率 | 落地點 | 共用圖格尺寸 | 角色可見寬高 | 中段三格星光像素數 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 桌機 | 0.2738095238095238 | (672, 384) | 120 × 126 | 120 × 123 | 97 → 41 → 15 |
| 手機 | 0.22247023809523808 | (290, 388) | 98 × 103 | 98 × 99 | 61 → 28 → 11 |

角色用 Home idle 的最近鄰規則取樣。回歸測試逐格比對角色 RGBA 與可見外框，確認寬高與水平位置一致，垂直位置符合指定的整數位移，另檢查透明 RGB。星光直接取自 v02 的三個動作區，疊在角色輪廓之外。落地格的底部錨點與 Home idle 一致。

## 回歸驗證

- Gate A focused Vitest 16 項通過，涵蓋 2R 與 v02 審閱樣本的雜湊與索引連結。通過 Gate A 測試檔 ESLint、Web TypeScript typecheck 及審閱 controller 語法檢查。
- Motion 驗證四項通過，包含 v02 來源與既有圖格的唯讀檢查、2R 圖格與確定性重建、Playwright 原互動回歸與新待機時序測試。
- Playwright 回歸覆蓋標題自動與 hover、記帳與完成的互斥和去重、按鈕／Esc 跳過、篝火、寶箱開關、壁畫、對話全文單次 DOM 公告、焦點、暫停及減少動態。320×568、390×844、768×1024、1440×900 及 1200×800 的審閱頁均通過水平溢出檢查。
- 2R 的 12 張 PNG、manifest 與瀏覽器資料共 14 個檔案，重建後位元組一致。v02 由審閱頁作為唯讀對照來源。

## 重跑

```powershell
$review = 'docs/design/assets/reviews/2026-09-18-page-visual-phase-1'
node --check "$review/motion-calibration-v02r.js"
node --test "$review/verify-motion-calibration-v02r.mjs"
Push-Location web
npm test -- --run src/shared/brand/asset-style-gate.test.ts
npx eslint src/shared/brand/asset-style-gate.test.ts
npm run typecheck
Pop-Location
```

Playwright 使用本機已安裝的 Chromium。沙箱若覆寫瀏覽器或暫存目錄，可將 `PLAYWRIGHT_BROWSERS_PATH` 指向既有的 `ms-playwright`，並把 `TMP` 與 `TEMP` 指向工作區暫存目錄。螢幕閱讀器公告採 DOM 驗證。

# Landing 道具位置與比例套用

日期：2026-11-03。狀態：使用者已用擺位工具（`landing-prop-position-review.html`）回傳桌機／手機座標，並確認比例調整；尚未實作。

## 使用者決定

1. 壓力板移除（decision-log 2026-11-03），本輪場景不含壓力板圖層。
2. 桌機寶箱放大為目前的 **1.5 倍**。
3. 地圖木箱**可見高度 = 寶箱關箱時可見高度的 1/2**（以 closed 狀態的可見高度為基準，不以整張 sprite 高度）。
4. 手機沒有寶箱；手機地圖木箱**與桌機同比例縮小**。
5. 寶箱位置維持使用者擺放的座標；放大後右緣與戰士盾牌相貼／輕微被盾牌遮擋，使用者已明確接受，不自動移位。

## 使用者回傳座標（擺位工具 JSON，logical px）

| frame | 物件 | 工具回傳 |
|---|---|---|
| desktop 960×540 | chest | anchor ground (294,340)，variant closed，原尺寸 104×120 |
| desktop | mapCrate | top-left (153,308)，113×63，ground (209.5,371) |
| desktop | pressurePlate | （移除，不套用） |
| phone 390×600 | mapCrate | top-left (157,368)，79×44，ground (196.5,412)；工具警示 `occludes:fire`（保守矩形） |

原始 JSON 回執（使用者附件原文，含 architecture／圖層 hash）已存於 `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/landing-prop-placement-receipts/desktop-receipt.json` 與 `phone-receipt.json`，套用前須驗證所有 hash 與目前檔案一致。

## 目標尺寸與位置（以 ground anchor 為準，縮放時 ground 點不動）

### 寶箱（桌機）

- 新 envelope **156×180**（104×120 × 1.5）；ground anchor 保持 (294,340)，對應 sprite origin (216,160)、local ground (78,180)。
- 八格全部重新產出，**從 v04 family-source 以同一 lattice、同一 uniform transform、比例乘 1.5 直接重新取樣**；不得把 104×120 sprite 以 nearest 放大 1.5 倍（非整數倍會造成像素不均）。
- 關箱可見高度預期約 93 px（v04 為 62）；open 狀態蓋頂約 y 218，必須不超出畫面、不壓到標題。
- 圖稿內容（v04 核准的造型、色彩、開蓋節奏、扣鎖、修補）不變；但輸出 hash 會改變，review 頁須並列 v04 原尺寸與新尺寸，供使用者確認放大後品質。

### 地圖木箱

- 桌機：可見高度 = 寶箱新關箱可見高度 ÷ 2（預期約 46–47 px），寬度依原圖比例（約 83 px）；ground 中心維持 (209.5,371)。
- 手機：縮放比例與桌機相同（桌機新高度 ÷ 63），由 79×44 推得約 59×33；ground 中心維持 (196.5,412)。
- 兩者都**從原始高解析來源 `samples/derivations/landing-war-room/sources/map-crate-angle-v02-source.png`（SHA-256 `d05d03c0…`）重新取樣**，不得縮放現有小圖層。若既有管線有中介裁切／校色步驟，沿用同一步驟並記錄。

### 圖層順序

依 ground y 排序：桌機 chest (340) 在 warrior (345) 之後繪製於其後方，即盾牌在寶箱前；mapCrate (371) 在 chest 前。手機 mapCrate 依 ground y 412 排序。其他人物、篝火、Mimiku、木牌、標題、火把、蝙蝠、壁畫位置與圖稿不變。

## 驗證

- 量測 contract：寶箱新關箱可見高度、地圖木箱可見高度比（目標 0.5，容許 ±1 px）、手機與桌機木箱縮放比一致（±2%）、ground anchor 位置、所有固定圖層 byte 不變、場景中壓力板不存在。
- 寶箱八格在新尺寸下仍通過 v04 的開蓋進度 contract（換算到新尺寸）與包絡外零差異。
- review 頁：桌機 closed／open 場景、手機場景、v04 原尺寸 vs 新尺寸放大比較、地圖木箱舊／新比較、對話框與工具警示疊層（可切換）。
- 其餘比照既有 review：focused Vitest、ESLint、typecheck、四 viewport Playwright、byte-identical 重建。

## 範圍

只做 Phase 1 review 產物；不修改 web/public、runtime、registry、PWA、service worker、產品頁或帳務；不標示 approved；不做 production exports／Phase 2。不使用 worktree／subagent，不 stage／commit；舊工具、舊產物唯讀，devlog 只追加。完成後停在整體場景視覺審核，此審核通過後才討論 Scenes 家族核准。

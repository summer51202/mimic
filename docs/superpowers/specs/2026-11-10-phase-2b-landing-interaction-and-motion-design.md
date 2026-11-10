# Phase 2B：Landing 互動、動態與登入 CTA

日期：2026-11-10。狀態：待 Codex 實作，停在視覺審核。

依據：Phase 2A 已核准（decision-log 2026-11-10，spec `2026-11-09-phase-2a-dialogue-and-landing-static-design.md` 含 2R／2R2）；最早的頁面規格 `2026-09-14-page-visual-optimization-design.md` §8.1：互動物件為具名按鈕，每個只有短暫視覺回饋與一句 Mimiku 台詞，不給貨幣、成就或財務效果；探索是選擇性的，CTA 永遠可用。motion 時序以核准的 `motion/motion-timing.json` 為準，寶箱時序以 `restored-chest.config.mjs`（v04 沿用）為準。

## 0. Ed 已定的決策（2026-11-10）

1. **木牌**：HTML 文字「功能」疊在 `signLabel` 區，整塊木牌是連到 `#features` 的連結。
2. **手機探索**：加上左右箭頭按鈕，探索條分成左／中／右三段，啟用 scroll-snap。
3. **火把、蝙蝠回饋**：用 CSS 做簡單動態，不改像素、不補新圖；減少動態時只換 Mimiku 台詞。
4. **登入 CTA**：已登入時 CTA 改為「返回基地」並前往 `/app`。
5. 從 2A 帶過來：360 寬手機要讓 Mimiku 完整入鏡（§3.2）。

## 1. 範圍

### 1.1 做

- 推廣 2B 素材（§2）。
- 互動物件：寶箱、隱藏壁畫、火把、蝙蝠（§4）；木牌連結（§5）。
- 動態：篝火循環、標題眨眼、寶箱開關、壁畫顯現、火把／蝙蝠 CSS 回饋；減少動態、頁面隱藏暫停、動畫暫停鈕（§6）。
- 手機三段探索與箭頭（§3）。
- 對話框台詞更新與 live region（§4.2）。
- 已登入 CTA（§7）。
- 測試、審閱截圖與錄影、`verification.md`、devlog。

### 1.2 不做

- 不用 ImageGen、不改任何核准像素；不新增 sprite 格。
- 桌機不做水平探索（桌機 layout `viewportWidth = width = 960`，只有一個房間）。
- Mimiku 在 Landing 維持靜態 actor 圖，不播 idle（idle 的觸發條件是 Home）；也不做 ledger／celebration。
- 標題（h1）不做可點互動；hover／tap 反應延後。
- 不改 Home 及其他頁面，不改 `PixelDialog`、`hud-dark`。
- 不加音效。

## 2. 素材推廣（沿用 2A §2.3 腳本）

新增推廣（`disposition: "promoted-phase-2b"`，`runtime_target` 同 2A 規則）：

| 類別 | 檔案 |
|---|---|
| 寶箱 | `props/landing/chest-{latch-release,unlatched,cracked,half-open,opening-wide,near-open,open}-{desktop,phone}.png`（closed 已在 2A） |
| 壁畫 | `props/landing/wall-carving-revealed-{desktop,phone}.png` |
| 篝火動態 | `motion/campfire-{desktop,phone}.png`（4 格 sheet，取代 2A 的 `props/shared/campfire-*` 作為篝火圖層；舊檔保留在 runtime，作為 sheet 載入失敗時的 fallback） |

`motion/motion-timing.json` 與 `restored-chest.config.mjs` 的時序在 build 時 import 或轉成 TS 常數，並以測試核對與來源完全相等。寶箱時序的來源檔在 review 目錄，屬核准紀錄；若不便直接 import，可在 `web/src/shared/brand/` 建立常數，並在單元測試讀來源檔逐值比對。

## 3. 手機探索

### 3.1 三段與 snap

- 探索條 1170 邏輯 px，分成左（0–390）、中（390–780）、右（780–1170）三段。
- 捲動容器 `scroll-snap-type: x mandatory`，snap 點如下（x 為可視左緣、邏輯 px）：
  - 左：`0`
  - 中：`max(390, 774 − vw)`；774 = Mimiku 圖層右緣（679 + 95，取自 layout）。360 寬為 414，375 寬為 399，≥ 390 寬為 390。
  - 右：`1170 − vw`
- 初始位置 = 中段 snap 點（取代 2R2.3 的置中公式）。關閉 JS 時以 CSS 可達成的最接近值為準，並在 verification 記錄。
- snap 點用不可見的 marker 元素實作，`scroll-snap-align: start`，位置隨 vw 計算。

### 3.2 箭頭按鈕

- 兩個 HTML `<button>`：「往左探索」「往右探索」（`aria-label`），貼在可視視窗左右兩側、垂直置中於地板帶上方，不得蓋住 Mimiku、角色臉、互動物件。
- 外觀用 dialogue token（暖深褐底、黃銅邊、米白箭頭字元或 CSS 三角形），≥ 44×44 CSS px，focus ring 清楚。不新增像素圖。
- 在最左段時「往左」設 `aria-disabled="true"` 並淡化（不移除，避免焦點跳動）；最右段時「往右」同理。
- 點擊捲到相鄰 snap 點：一般為 `smooth`，減少動態時為 `auto`。
- 鍵盤：沿用 2A 的 region 可聚焦與左右鍵；左右鍵改為跳到相鄰 snap 點。
- 對話框與 CTA 固定在可視視窗底部，不隨分段移動（沿用 2A）。

## 4. 互動物件

### 4.1 共通

- 每個物件是一個 `<button type="button">`，疊在對應 layer 上，位於場景 transform 容器內（不是文字，可隨場景縮放）。按鈕本身透明，圖仍由 layer 顯示。
- 點擊區 = layer 外框；不足 44×44 **CSS px** 時以中心向外擴到 44×44，但不得與其他互動區重疊（重疊時縮減並記錄）。
- focus ring：≥ 2 CSS px，對比 ≥ 3:1（建議用 `--mimic-color-coin-action`）；在 transform 容器內要換算，確保縮放後仍 ≥ 2 CSS px。
- 名稱（`aria-label`）見 §4.3；**不揭露**互動結果（例如壁畫叫「岩壁上的刻痕」，不叫「隱藏壁畫」）。
- Tab 順序：桌機依畫面左到右；手機依探索條左到右，CTA 之後才是暫停鈕。
- 互動不得改變 CTA、不得阻擋捲動，也不得延遲任何操作。

### 4.2 Mimiku 台詞

- 對話框內文預設為 `brand.tagline`；互動後換成該物件的台詞，直到下一次互動。說話者名稱不變。
- 台詞容器是 `aria-live="polite"`；只有互動後的內容變化會被朗讀，首次載入不朗讀。
- 台詞換行或變長時仍遵守 2A §5／2R2.1 的溢出規則；CTA 位置不得跳動（台詞區固定最小高度）。

### 4.3 物件、回饋與台詞（台詞為草稿，於視覺審核由 Ed 核准）

| 物件 | 名稱 | 桌機／手機 layer | 回饋 | 減少動態 | 台詞草稿 |
|---|---|---|---|---|---|
| 寶箱 | 舊寶箱 | `chest`（桌機、手機左段） | closed→open 依 config `open` 序列（750 ms）；再按一次依 `close` 序列（660 ms）。播放中忽略點擊。`aria-pressed` 反映開／關 | 直接切到最終格 | 開：「那是普通的寶箱，不是我親戚喔！」關：「還是蓋好比較安心。」 |
| 壁畫 | 岩壁上的刻痕 | `carving`（桌機右上、手機右段） | hidden→revealed 交叉淡入 400 ms（opacity，只有兩張核准圖）；之後維持 revealed 到離開頁面。再按只重說台詞 | 直接切換 | 「這是⋯⋯很久以前的我？原來早就有冒險者陪著我了。」 |
| 火把 | 火把 | 桌機 `torchHigh`、`torchLow` 兩支各自一顆按鈕；手機 `torch` | 該火把後方的暖色光暈（CSS radial-gradient 疊層，不改火把像素）亮度在 600 ms 內升起再回落 | 無視覺變化 | 「小心火！我可是木頭做的⋯⋯」 |
| 蝙蝠 | 蝙蝠 | 桌機 `bats`；手機中段 `bats`（`explorationBats` 維持裝飾） | 整張圖以 `steps()` 向上移出畫面（每步為整數邏輯 px，約 500 ms），隱藏 1.5 s 後同路徑飛回。期間按鈕仍在原位、仍可聚焦，再按忽略 | 圖不動 | 「噓——牠們白天在睡覺啦。」 |

- 寶箱與壁畫屬於 primary（`motion-timing.json` 的 `idle_suppressed_by`）；同時只播一個 primary：寶箱播放中按壁畫時，台詞立即更換，但壁畫淡入等寶箱結束才開始。火把／蝙蝠為次要回饋，可與 primary 同時進行。
- 寶箱開蓋最大範圍不得蓋住相鄰互動區的焦點框（以 open 格外框驗證）。

## 5. 木牌

- `signLabel` 區（桌機 753.2,338.39 49×32.16；手機 414.92,365.03 43.4×28.32）疊一段 HTML 文字「功能」，位置換算時向內取整到整數 CSS px，字級隨場景縮放（文字放在 transform 外，以 CSS px 定位，參考 2R.1 的作法）；文字顏色取木牌暗色上可讀的米白（對比 ≥ 4.5:1，在 verification 記錄）。
- 整塊木牌（sign layer 外框，必要時擴到 44×44）是 `<a href="#features">`，accessible name「功能」。點擊捲到 `#features`；減少動態時不用平滑捲動。
- 不改變台詞。
- 若木牌文字在某尺寸放不下（< 12 CSS px 才放得下），改成只保留連結與 `aria-label`，不顯示文字，並在 verification 列出尺寸。

## 6. 動態與暫停

### 6.1 播放器

- 用一個共用的 sprite 播放 hook／class：依 frame_ms 切 `background-position`，以 `requestAnimationFrame` 計時（不用 CSS `steps()` 動畫，以便精準照非等長 frame_ms 播放與暫停）。
- 篝火：Landing 場景在可視範圍時循環 4 格（每格 166.67 ms）。
- 標題眨眼：Landing 可見時，每隔 8–15 s 的隨機間隔播一次 3 格（90 ms×3）後回到第 0 格。
- 所有循環在 `document.hidden`、場景離開可視範圍（IntersectionObserver）、或使用者按下暫停時停止；恢復後從第 0 格開始。
- `prefers-reduced-motion: reduce`：篝火、標題顯示第 0 格不動；寶箱、壁畫直接顯示結果；火把、蝙蝠無動態；捲動不平滑。偏好在頁面停留期間改變時立即套用。

### 6.2 暫停鈕

- 篝火是持續超過 5 秒的自動動態（WCAG 2.2.2），所以場景右上角要有一顆 HTML 按鈕「暫停動畫」／「播放動畫」（`aria-pressed`），≥ 44×44 CSS px，dialogue token 外觀。
- 選擇記在 `localStorage`（讀寫包 try/catch，失敗就當作未設定）；減少動態時按鈕隱藏，因為已經沒有自動動態。
- 暫停時篝火、標題停在第 0 格；使用者主動觸發的寶箱、壁畫、火把、蝙蝠回饋仍會播放（是對操作的回應，不是自動動態）。

## 7. 已登入 CTA

- `(public)/page.tsx` 用既有的 `hasSession()`（與 invite 頁相同），已登入時 CTA 文字為「返回基地」、`href="/app"`；未登入維持「開始冒險」→ `/register`。
- 這會讓 `/` 從靜態頁變成動態渲染：在 verification 記錄 build 輸出的變化。service worker 的 `mimic-public-pages` 會快取 `/` 的 HTML，請確認登出後線上重新載入時 CTA 正確（NetworkFirst），並記錄離線時可能看到舊 CTA 的行為。
- 測試：mock `hasSession` 的單元測試兩種狀態；e2e 用既有的登入 fixture 驗證已登入時的 CTA。

## 8. 驗證

### 8.1 指令

`npm run lint`、`typecheck`、`test`、`build`、`test:e2e`。基線用 Phase 2A 最新 commit `64f0173` 的乾淨 worktree（`.tmp/` 下），逐項標示「既有」或「本輪造成」，本輪造成的要修好。real-backend 只能用 `127.0.0.1` 專用 DB。

### 8.2 新 e2e：`web/e2e/landing-phase-2b.spec.ts`

沿用 2A 的 10 個尺寸，另驗證：

- 每個互動物件：名稱、可 Tab 到、點擊區 ≥ 44×44 CSS px 且彼此不重疊、點擊後台詞更新且 live region 有內容、CTA 不變。
- 寶箱：開關序列的格順序與總時長（容差 ±1 frame）；播放中重複點擊被忽略；`aria-pressed`。
- 壁畫：顯現後維持；寶箱播放中按壁畫會排隊。
- 減少動態（`page.emulateMedia({ reducedMotion: 'reduce' })`）：沒有任何 `background-position`、transform、opacity 動畫；結果直接出現；暫停鈕隱藏。
- 暫停鈕：暫停後篝火／標題停在第 0 格，重新整理後仍暫停；`localStorage` 拋錯時頁面正常。
- `document.hidden`（以 `visibilitychange` 模擬）會停止循環。
- 手機：snap 點的值（含 360 → 414、375 → 399）；初始在中段；箭頭到頭時 `aria-disabled`；360 寬初始時 Mimiku 完整可見（裁切 0 px）。
- 木牌：連結名稱「功能」，點擊後 `#features` 進入視窗。
- 已登入／未登入 CTA。
- 截圖存 `docs/design/assets/reviews/2026-11-10-phase-2b/screenshots/`：每尺寸一張預設、一張「寶箱 open＋壁畫 revealed＋台詞」；另錄桌機 1920×1080 與手機 390×844 的互動短片（Playwright video，含寶箱開關、蝙蝠飛走飛回、火把光暈、篝火與標題眨眼）存到 `videos/`。

### 8.3 其他

- `verification.md` 放 `docs/design/assets/reviews/2026-11-10-phase-2b/`：推廣檔 hash 對照、時序常數與來源比對、各尺寸的點擊區實測表（含擴大與縮減）、木牌文字字級與對比、snap 點表、動態清單（自動或回應、減少動態行為）、基線比較、未完成事項。
- `.agents/devlog.md` 追加一筆。

## 9. 審閱時 Ed 要看的點

1. 五句台詞的語氣。
2. 火把光暈、蝙蝠飛走的 CSS 回饋是否像素風、會不會太搶眼。
3. 手機箭頭按鈕的外觀與位置。
4. 木牌「功能」字樣在小尺寸是否可讀。
5. 暫停鈕的位置。

## 2R：第一輪審閱修正（2026-11-10）

審閱者從 `videos/1920x1080-interactions.webm` 逐格擷取檢查（`.tmp/claude-review/2b/`）。素材 hash、寶箱時序、snap 點、點擊區、木牌、已登入 CTA 都確認無誤。Ed 核准 §4.3 五句台詞，也接受刪除 `web/src/app/page.tsx`（`/` 只走 `(public)`，會獨立 commit）。以下兩項需要修。

### 2R.1 火把光暈

- 問題：光暈出現時，火把周圍可見帶青灰色調的**方形邊框**（約 11.2–11.5 s），不像暖色火光，看起來是 gradient 被圖層外框裁切，或底色混色錯誤。
- 修正：
  - 改為**圓形**暖色光暈：中心用暖橙（例如 `#ffb347`，請在 verification 記錄最終值），往外淡出到**完全透明**；不得出現任何直線邊緣。
  - 光暈元素尺寸約火把寬 × 3（以火焰為圓心），本身的 box 要大於可見光暈半徑，確保 gradient 在 box 內就已淡到 0，不被任何 `overflow` 或圖層外框裁切。
  - 只疊在火把圖層**後方**，不改火把像素；不得蓋到相鄰互動區的焦點框。
  - 不用 `mix-blend-mode`，除非能證明各瀏覽器顏色一致；改用一般 alpha 疊加。
- 驗證：從錄影擷取光暈峰值格，貼進 verification，並量測光暈外緣一圈的像素與未觸發時相同（容差 ±2 灰階）。

### 2R.2 蝙蝠飛行

- Ed 接受 CSS 飛行，但要加斜向與輕微晃動：
  - 飛出路徑改為往**右上**斜飛（每步 x 與 y 都是整數邏輯 px，水平分量約為垂直的 0.5 倍），每一步在 x 方向左右交錯 ±1 邏輯 px，模擬拍翅的不穩。
  - 飛回時沿同一路徑反向，晃動照樣保留。
  - 總時長維持飛出 500 ms、停留 1500 ms、飛回 500 ms；仍用 `steps()` 或逐步計時，每步都在整數邏輯 px。
  - 整組要完全離開場景可視範圍（桌機為舞台上緣，手機為探索條可視視窗上緣或右緣）；飛行期間不得蓋到標題 wordmark 的眼睛與 Mimiku。
  - 減少動態時不動（同前）。

### 2R.3 說明項

- `1920x1080-interacted.png` 右上角看不到「暫停動畫」鈕，但 default 截圖有。請在 verification 說明原因（例如擷取時處於減少動態模式）；若是 bug 就修好。

### 2R.4 交付

- 截圖另存 `screenshots-2r/`、錄影另存 `videos-2r/`，舊版唯讀。
- 只重跑 Landing 相關 Vitest、`landing-phase-2a`、`landing-phase-2b`、`pixel-responsive`、`public-and-auth`，加上 lint、typecheck、build；本輪已有完整基線，不需重跑全套與 real-backend。

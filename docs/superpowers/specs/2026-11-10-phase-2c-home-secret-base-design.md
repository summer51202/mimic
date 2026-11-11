# Phase 2C：Home 秘密基地場景

日期：2026-11-10。狀態：待 Codex 實作，停在視覺審核。

依據：Phase 2A／2B（Landing）已核准，見 decision-log 2026-11-10。Home 場景的核准素材與 `scenes/home/layout.json` 依 Scenes spec `2026-11-04-scenes-staged-set-and-home-base-design.md` §2／2R：封閉室內、角落放 live HTML 的「最近冒險卡」、底部對話框、場景是視覺主體。動態時序以 `motion/motion-timing.json` 為準。

## 0. Ed 已定的決策（2026-11-10）

1. **版面**：場景作為頁面頂部的主視覺；卡片區放最近冒險，對話框放 Mimiku 一句話和「記一筆支出」。情境切換與寶箱卡片照舊放在場景下方。
2. **頭像**：這輪不放。後端還沒有職業欄位，留到 Avatar 選擇那一輪（含後端）一起處理；`avatarSlots` 本輪不渲染。
3. **動態**：做 Mimiku idle、篝火、記帳完成時播 ledger；celebration 延後，等「冒險完成」在產品中有定義。
4. **hud-dark**：只在 Home 區塊內改成暖褐，全站 token 不動。

審閱者補充：Home 與 Landing 各有自己核准的地面光檔（hash 不同），不共用，「是否共用地面光」這個待決事項就此結案。

## 1. 範圍

### 1.1 做

- 抽出共用場景基礎（§2）：Landing 與 Home 共用，Landing 行為不得改變。
- 推廣 Home 素材（§3）。
- Home 場景、卡片區、對話框（§4、§5）。
- Mimiku idle、篝火、ledger 動態，以及暫停與減少動態（§6）。
- Home 區塊暖褐覆寫（§7）。
- 測試、截圖、錄影、`verification.md`、devlog。

### 1.2 不做

- 不渲染頭像，不改後端，不新增 API 欄位。
- 不做 celebration。
- 不改 Home 以外的頁面；app shell 只動 §5.3 列出的那一點。
- 不改財務邏輯、資料讀取或 QuickExpense 的行為（只換位置）。
- 不用 ImageGen，不改像素。

## 2. 共用場景基礎

- 把 Landing 的縮放、圖層、sprite 播放器（rAF＋`frame_ms`）、暫停鈕、`document.hidden`／離開視窗暫停、減少動態處理，抽成 `web/src/shared/scene/`（命名由 Codex 決定，並在 verification 說明）。Landing 改為使用它。
- **Landing 的 2A／2B e2e 必須維持全綠且截圖逐像素不變**（以 2B 2R 的 `screenshots-2r/` 為基準，容差 0；若因字型或環境產生差異，逐張說明）。
- 暫停偏好在 Landing 與 Home 共用同一個 localStorage key：這是使用者對「自動動畫」的整體偏好。

## 3. 素材推廣（`disposition: "promoted-phase-2c"`）

| 類別 | 檔案 |
|---|---|
| 場景 | `scenes/home/{desktop,phone}-architecture.png`、`scenes/home/{desktop,phone}-ground-light.png`、`scenes/home/actors/mimiku-{desktop,phone}.png` |
| 動態 | `motion/mimiku-idle-{desktop,phone}.png`、`motion/mimiku-record-ledger-{desktop,phone}.png` |

`scenes/home/layout.json` 在 build 時 import（同 Landing）。篝火沿用已推廣的 `props/shared/campfire-*`（靜態 fallback）與 `motion/campfire-*`（sheet）。

先核對 sheet 單格尺寸等於 layout 中的 Mimiku 圖層（桌機 118×123，手機 96×100），不符就停下來回報，不要自行縮放。

## 4. 場景

### 4.1 縮放與位置

- 場景放在 Home 內容最上方，位置取代現在的 `.space-home-hero`。
- **桌機**（≥ 768 CSS px，與 shell 斷點一致）：可用寬 = Home 內容欄寬；`s = min(可用寬 ÷ 960, (視窗高 − top bar 高) × 0.75 ÷ 540)`。乘 0.75 是為了讓第一屏看得到下方情境切換列的開頭，這是 Home 與 Landing 的差別，審閱時 Ed 會看。像素渲染規則同 Landing 2R.1（s ≥ 1 用 pixelated，< 1 用 auto），整個場景用單一 transform。
- **手機**：場景要突破 `main` 的左右 padding，做成滿版。`vw ≥ 390` 時 s=1、置中，兩側填 `--mimic-color-cave-backdrop`；`vw < 390` 時 s=1，左右各裁 `(390 − vw) ÷ 2`，不縮放；卡片區與對話框以**可視寬度**定位，兩側至少留 12 CSS px。
- 疊放依 layout `depth`；`avatarSlots` 不渲染。

### 4.2 語意

- 場景圖層全部 `aria-hidden`。本輪 Home 場景沒有任何互動物件。
- 頁面 h1 移到卡片區（§5.1）。

## 5. 卡片區與對話框

### 5.1 卡片區（最近冒險卡）

- 位置：layout `safeZones.card`（桌機 16,56,300×140；手機 12,16,366×120，依 §4.1 裁切調整）。外框沿用 `PixelPanel`，或用 `frames/frame-parchment.png`；若用後者需同時推廣，並寫進 §3 與 manifest。卡片背後的場景區已在 Scenes 2R 壓到低細節，文字對比 ≥ 4.5:1。
- 內容依序：
  1. h1：情境名稱（`我的寶箱`／群組名），沿用現有邏輯。
  2. 最新一筆活動：從所有 PARTICIPANT 卡的 `recent_activity` 取 `occurred_on` 最新的一筆，顯示「標題 · 寶箱名 · 日期」並連到該寶箱；沒有活動時顯示「還沒有冒險紀錄」。
  3. 有待辦時顯示「N 個待辦」，連到 `/app/tasks`（取代現在場景下方那一列）。
- 內容超出安全區時（長群組名、200% 文字縮放）卡片可以向下長，但不得蓋到 Mimiku 與篝火；真的放不下時，卡片改排在場景下方的正常流內（同 Landing 對話框的作法）。
- 原 hero 的英文標語與說明段落移除；說明文字改放進情境切換列上方的一行輔助文字，內容不變。

### 5.2 對話框

- 用 `PixelDialogue`，位置在 layout `safeZones.dialogue`；字級規則同 Landing 2R2.1。
- 說話者：咪咪庫 / Mimiku。台詞依狀態選一句（草稿，審閱時由 Ed 核准）：
  | 條件（依序判斷） | 台詞 |
  |---|---|
  | 離線 | 「現在離線，我先幫你看著最後的狀態。」 |
  | 沒有寶箱 | 「這裡還空空的，先建立一個寶箱吧！」 |
  | 有待辦 | 「有 N 件事等你確認喔。」 |
  | 其他 | 「今天要記點什麼嗎？」 |
- 現有離線的 `role="status"` 段落保留在原處（無障礙測試依賴它）；對話框台詞不設 live region。
- actions：放現有的 `<QuickExpense>`（行為與狀態完全不變，包括多寶箱時開 PixelDialog、只有一個寶箱時直接連結、離線停用、沒有寶箱時的建立連結）。按鈕用亮金 CTA 外觀。

### 5.3 shell 浮動按鈕

- app shell 右下的浮動「記一筆支出」（`.quickAction`）在 `/app`（Home）上與對話框 CTA 重複，在手機上還可能壓到場景。**只在 `/app` 隱藏**浮動按鈕，其他頁面不變。用 shell 已有的 `currentAppSection` 判斷，並補單元測試。

## 6. 動態

- **篝火**：同 Landing（4 格循環）。
- **Mimiku idle**：Home 場景在可視範圍時，循環第 0–1 格（250 ms、250 ms）；每隔 3–6 s 的隨機間隔插一次眨眼第 2 格（140 ms），然後回到循環。Mimiku 圖層由 idle sheet 驅動；sheet 載入失敗時顯示 `scenes/home/actors/mimiku-*` 靜態圖。
- **ledger（記帳完成）**：記帳流程在其他頁面完成，Home 沒有即時事件。審閱者的設計（請 Ed 審）：
  - 每個情境（個人／各群組）在 localStorage 記住「上次在 Home 看到的最新活動」（活動 id 或 `occurred_on`＋標題的穩定鍵，由 Codex 選並說明）。
  - 進入 Home 時，若最新活動比記錄的新，播一次 ledger（5 格，各 100 ms），之後回到 idle，並更新記錄。第一次造訪（還沒有記錄）只記錄、不播。
  - ledger 是 primary：播放時 idle 暫停（`idle_suppressed_by`）。
  - localStorage 不可用時不播 ledger，頁面一切正常。
  - 減少動態：直接顯示第 4 格約 1.5 s 再回到 idle 第 0 格（沿用 `reduced_motion_final: frame 4`）。如果 Ed 覺得停留也算動態，就改成完全不顯示。
- 暫停鈕、頁面隱藏、離開視窗、減少動態的規則都同 Landing §6（共用 §2 的實作）。暫停時 idle 與篝火停在第 0 格；ledger 是對使用者資料變化的回應，暫停時仍不播（與 Landing 中使用者主動點擊的回饋不同）。

## 7. Home 暖褐覆寫

- 在 Home 根元素（`.space-home`）上覆寫 `--mimic-color-hud-dark` 為暖深褐；建議值 `--mimic-color-dialogue-field #211a18`（由 Codex 確認在 `--mimic-color-surface`、`--mimic-color-surface-raised`、`--mimic-color-coin-action` 上的文字對比都 ≥ 7:1，寫進 verification）。
- 覆寫只作用於 Home 子樹，shell 的 top bar 與導覽不受影響。Home 內 QuickExpense 開的 PixelDialog 會跟著變暖褐，這是允許的；請截圖記錄。
- 不改 `tokens.css` 的全站值。

## 8. 驗證

### 8.1 指令

`npm run lint`、`typecheck`、`test`、`build`、`test:e2e`。基線用 Phase 2B 最新 commit `82752e1` 的乾淨 worktree（放在 `.tmp/`），逐項標示失敗是「既有」還是「本輪造成」。Home 的財務資料要用 loopback 真實後端，只用 `127.0.0.1` 專用 DB。

### 8.2 新 e2e：`web/e2e/home-phase-2c.spec.ts`

尺寸：桌機 768×1024、1280×720、1366×768、1440×900、1536×864、1920×1080、2560×1440；手機 360×780、390×844、430×932。每種尺寸用三種資料狀態跑：沒有寶箱、有寶箱沒待辦、有待辦且有活動。

- 縮放倍率、包框尺寸、圖層位置（未縮放座標）同 Landing 的驗法；手機滿版且沒有水平捲軸。
- 卡片區：h1 文字、最新活動連結正確、待辦連結；溢出時改到下方。
- 對話框：台詞符合狀態表；QuickExpense 三種分支行為不變；離線時 CTA 停用、台詞正確、`role="status"` 存在。
- `/app` 沒有浮動 quickAction，其他 app 頁面仍有。
- 動態：idle 的格序與時間、眨眼間隔落在範圍內；ledger 只在活動更新後播一次、第一次造訪不播；暫停、隱藏、減少動態；與 Landing 共用的暫停偏好。
- 暖褐覆寫只在 Home 生效（量測 shell 與 Home 內元素的計算後顏色）。
- Landing 2A／2B 回歸全綠，截圖與 2B `screenshots-2r/` 一致。
- 截圖存 `docs/design/assets/reviews/2026-11-10-phase-2c/screenshots/`（每個尺寸 × 三種狀態，外加 QuickExpense 彈窗一張）；錄影存 `videos/`（桌機 1920 與手機 390：idle＋眨眼、ledger 觸發）。

### 8.3 其他

- `verification.md` 放在 `docs/design/assets/reviews/2026-11-10-phase-2c/`：推廣檔 hash、sheet 尺寸核對、倍率表、卡片區與對話框實測、台詞對照、ledger 觸發鍵的設計、暖褐對比、共用場景基礎的抽取說明、基線比較、未完成事項。
- `.agents/devlog.md` 追加一筆。

## 9. 審閱時 Ed 要看的點

1. 桌機場景高度上限 75% 是否合適（第一屏能否看到下方內容）。
2. 卡片區內容與外框（PixelPanel 或羊皮紙框）。
3. 四句 Home 台詞。
4. ledger「回到 Home 時播一次」的觸發設計，以及減少動態時是否停留在最後一格。
5. 暖褐覆寫後 Home 卡片與彈窗的觀感。

## 2R：第一輪審閱修正（2026-11-11）

審閱者獨立確認了以下項目：素材 hash、sheet 尺寸、Landing 截圖零差異、狀態台詞、最近冒險、只在 Home 生效的暖褐覆寫，以及錄影中的 idle（箱蓋＋眨眼）與 ledger（拿筆記帳）。Ed 核准了四句 Home 台詞與 ledger 設計（含減少動態時停在第 4 格 1.5 s），並接受 QuickExpense 讀寫 localStorage 加 try/catch（範圍外，獨立 commit）。以下要修。

### 2R.1 依內容欄寬度選版型（取代 §4.1 的 768 斷點）

- 問題：768×1024 時桌機側欄吃掉寬度，Home 內容欄只剩 418 px，場景縮到 s=0.4354（418×235），卡片字擠成三行，對話框被擠到場景外。
- 改法：版型依 **Home 內容欄的實際寬度** 決定，不再看視窗寬。
  - 內容欄 **< 640 CSS px**：用 phone 場景（390×600，s=1，置中），規則同 §4.1 手機（< 390 時兩側裁切，> 390 時兩側填 backdrop）。這種情況下不需要突破 `main` 的 padding；只有內容欄本身 < 390 時才突破（真手機）。
  - 內容欄 **≥ 640 CSS px**：用 desktop 場景，縮放公式同 §4.1。
  - 用 ResizeObserver 監聽內容欄，或用 CSS container query 實作；SSR 首屏不得出現錯位閃動（同 Landing 2A §4.2 的要求）。
- e2e 加入 768×1024、1024×768（側欄＋窄內容），並驗證版型切換點（例如內容欄 639／640）。

### 2R.2 桌機對話框填滿安全區

- 問題：1920×1080 時對話框高 71.5 px，只佔安全區（119 × 1.1458 ≈ 136 px）的上半，框很薄、兩行字擠在裡面，下面還露出一截地板。
- 改法：與 Landing 一致。對話框外框填滿 `safeZones.dialogue × s`，內容垂直置中；內縮以 Landing 的 54／34（1×）乘 s 換算；字級用 Landing 2R2.1 的 `clamp(1rem, 1rem × s ÷ 1.2, 1.5rem)`。溢出時改排到場景下方的規則不變。
- 手機版維持現狀（已填滿）。

### 2R.3 手機暫停鈕移到場景左下角

- phone 場景的暫停鈕移到**場景左下角、對話框上緣之上**（例如邏輯座標 x 12、y 對話框上緣 − 按鈕高 − 8），不擋 Mimiku、篝火與卡片區。桌機維持右上角。
- 驗證按鈕與 Mimiku、篝火、卡片區、對話框都不相交（在 360、390、430 寬及 768 窄內容版型下檢查）。

### 2R.4 交付

- 截圖另存 `screenshots-2r/`（原有尺寸 × 三種狀態，加上 1024×768），錄影另存 `videos-2r/`，舊版唯讀。
- 只重跑 Home 與 Landing 相關 Vitest、`home-phase-2c`、`landing-phase-2a`、`landing-phase-2b`、`navigation-home-tasks`，加上 lint、typecheck、build；Landing 截圖仍須與 2B `screenshots-2r/` 零差異。real-backend 只用 `127.0.0.1` 專用 DB。

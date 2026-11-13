# Phase 2G：記帳完成動畫

日期：2026-11-13。狀態：待 Codex 實作，停在視覺審核。

依據：2A–2F、2E-0、2E-1 已核准；`main` = `origin/main` = `2a2cda8`，staging 已部署 2F（`frame-notebook.png`、`mimiku-record-ledger-inkline-{desktop,phone}.png` 線上位元組數與 repo 相同）。規則沿用 2C spec（Home ledger 觸發、減少動態）、2F spec（筆記本、色票、Linux 驗證）。

## 0. Ed 已定的決策（2026-11-13）

1. **範圍**：只有**新增支出**會播。包含 personal「記一筆支出」、shared「新增共同支出」、pooled「新增基金支出」，從頁內按鈕、浮動記帳鈕或 Home QuickExpense（`?quick=1`）進入都算。**不播**：編輯、刪除、私人參照（加入我的帳本、編輯私人資訊、移除參照）、更正、投入確認、投入排程、結算。
2. **位置**：**浮動小夥伴**，固定在視窗底部。手機在左下、底部導覽上方；桌機在浮動記帳鈕正上方。短暫出現後消失，不吃點擊、不拿焦點。
3. **尺寸**：沿用已上線的 motion 條，以 1× 顯示。桌機 `motion/mimiku-record-ledger-inkline-desktop.png`（每格 118×123），手機 `-phone.png`（每格 96×100）。
4. **文字**：**只放 Mimiku**，不加台詞或對話框。頁首既有的 `role="status"` 通知文字、位置、樣式都不變。小夥伴是裝飾，`aria-hidden`。
5. **Home 去重**：記帳頁播過的那筆，回到 Home **不重播**。別人新增的活動回 Home 時照常播。
6. **減少動態**：直接顯示第 4 格（zero-based），停留時間與一般情況相同，之後消失。**使用者主動暫停動畫**（`mimic.landing.animation-paused` = `"true"`）時，小夥伴**完全不出現**。
7. **小待辦一起做**：SettlementPanel 狀態改成中文；**定義** `--mimic-font-pixel` 為等寬字型；檢查浮動鈕第二次按無效的問題，成立就修正。

## 0.1 審閱者自行決定的事（附理由）

1. **不推廣 master、不做新尺寸。** master `mimiku/action-record-ledger-inkline.png` 每格 512 px，縮到 96–160 一定是非整數倍。motion 條本身就是 1× 邏輯像素、去背，五格 alpha bbox 相同（桌機 `(1,0,116,123)`、手機 `(1,0,94,100)`），可以單獨使用，尺寸也落在 manifest 的 `css_size`「96–160 CSS px companion」範圍內。master 維持 `staged-only-until-consumer-plan`。
2. **時間軸**：5 × 100 ms 播完後，停在第 4 格，從開始算起共 **2000 ms** 後移除。只播 0.5 秒太快，容易沒看到。2000 ms 以常數寫在元件裡，不改 `motion-timing.json` 的 playback。
3. **不加暫停鈕。** 動畫總長 2 秒（< 5 秒，WCAG 2.2.2 不要求暫停鈕），但仍遵守共用的暫停偏好（§0-6）。
4. **不直接用 `useSceneMotion`。** 那是整個場景用的（viewport 屬性、IntersectionObserver、場景內暫停鈕）。小夥伴改用 `web/src/shared/scene/sprite.ts` 的 `playSceneFrames`／`drawFrame`／`loadSheet`。暫停 key 改從 `use-scene-motion.ts` export 常數共用（只 export，行為不變）。
5. **互斥**：依 `motion-timing.json` 的 `primary_exclusion`（先播完目前的主要動畫）。小夥伴正在顯示時，又一次新增成功**不重播也不排隊**（實務上 2 秒內很難再完成一次新增）。
6. **頁面看不見時不播**：成功當下 `document.hidden` 為 true，或素材在 600 ms 內沒載入完，就跳過，也不寫 Home key（§5）。
7. **修正 `motion-timing.json` 的 ledger hash。** 2F 只換了 `asset_id`，`sha256` 還是舊檔的值：桌機寫 `45ae5b2d…`，實際檔案 `e2248e30…`；手機寫 `f5aecd67…`，實際檔案 `dcdbcbfb…`。approved 與 web 兩份一起改，並加測試鎖住（§6）。
8. **manifest consumer**：兩條 inkline motion 的 `consumer` 改成 `"Home Mimiku; Record expense confirmation"`，其他欄位不動。
9. **SettlementPanel 標籤**（只改顯示文字，不改 enum、API、邏輯）：
   - 批次：`PENDING` → 進行中、`COMPLETED` → 已完成、`CANCELED` → 已取消。
   - 轉帳：`AWAITING_PAYMENT` → 待付款、`SENT` → 已付款，待收款、`COMPLETED` → 已收款。

   用語對應現有按鈕「確認已付款」「確認已收款」，以及頁內說明「由使用者自行確認」。
10. **`--mimic-font-pixel`**：在 `web/src/styles/tokens.css` 定義為 `ui-monospace, "Cascadia Mono", Consolas, "Liberation Mono", monospace`。名稱沿用，不改 4 處引用（`group-management.module.css`、`invitation-flow.module.css` ×2、`settings.module.css`），用途都是 Mimic ID。目前因為變數未定義，整條宣告無效，實際顯示的是繼承的 Arial。

## 1. 範圍

### 1.1 做
- 共用元件與 hook：記帳完成小夥伴（§3）。
- 三頁接上新增成功（§4）。
- Home 去重：寫 Home 的 latest-activity key（§5）。
- `motion-timing.json` hash 修正、manifest consumer（§6）。
- 小待辦（§7）。

### 1.2 不做
- 不改 Home 的觸發邏輯、時間軸、尺寸，也不改 Landing。
- 不改通知文字、`role="status"` 的位置與樣式、表單、`PixelDialog`、焦點行為。
- 不推廣新素材、不生圖。
- 不改後端（Home 觸發依賴 UUID v4 排序的問題列入待辦）。

## 2. 素材

- 只用現有的 `web/public/pixel-ui/v1/motion/mimiku-record-ledger-inkline-{desktop,phone}.png`。路徑與影格數從 `web/public/pixel-ui/v1/motion/motion-timing.json` 的 `variants.<v>.ledger` 讀（`asset_id`、`frame_ms`、`reduced_motion_final`），不要寫死檔名。
- **產品程式只能 import `web/` 裡的檔案**（`web-build-context.test.ts`）。

## 3. 元件：`web/src/shared/scene/record-ledger-companion.tsx`

API（名稱可微調，行為不可改）：

```ts
const { celebrate, companion } = useRecordLedgerCompanion();
// companion：要 render 的節點；celebrate({ context, activityKey })：新增成功時呼叫
```

- **DOM**：一個 `position: fixed` 的容器，`aria-hidden="true"`、`pointer-events: none`，沒有可聚焦元素，也不在 tab 順序內。平常 `hidden`（不佔版面、不在無障礙樹）。裡面放 sprite 層，用 `background-image` 加 `--frame` 位移，與 Home 的 sheet 寫法一致，`image-rendering: pixelated`。
- **變體**：`(min-width: 768px)` 用 desktop 條（118×123 CSS px），否則用 phone 條（96×100 CSS px）。這個斷點與 shell 的浮動鈕斷點一致。
- **位置**：
  - 手機：`left: max(16px, env(safe-area-inset-left))`；`bottom: var(--mimic-quick-action-bottom)`，與浮動鈕底緣對齊、在底部導覽上方。
  - 桌機：右緣與浮動鈕右緣對齊（`right: max(16px, env(safe-area-inset-right))`）；`bottom: calc(var(--mimic-quick-action-bottom) + var(--mimic-quick-action-height) + 12px)`。
  - `z-index: 39`，低於浮動鈕（40）、頂欄（30）之上。如果實作發現堆疊關係不同，以「不蓋到浮動鈕與底部導覽」為準，在 verification 說明。
  - 這些變數由 shell 提供。如果頁面不在 shell 內（測試），fallback：手機 84px、桌機 24px + 48px + 12px。
- **載入**：hook 掛載時不載入。第一次呼叫 `preload()` 時才用 `loadSheet` 載入目前變體（§4 在新增彈窗打開時呼叫）；`celebrate` 時若尚未載入也會觸發載入。
- **`celebrate` 流程**：
  1. 讀暫停偏好（try/catch），`"true"` → 直接 return（不顯示、不寫 Home key）。
  2. `document.hidden` → return。
  3. 正在顯示 → return（§0.1-5）。
  4. 等 sheet 載入，最多 600 ms，逾時 → return。
  5. 顯示容器。減少動態（`matchMedia('(prefers-reduced-motion: reduce)')`）時直接 `drawFrame` 到 `reduced_motion_final` 的格數（4）；否則用 `playSceneFrames(frame_ms, draw, onEnd)` 播一次，`onEnd` 時停在最後一格。
  6. 從顯示開始算 2000 ms 後隱藏，`--frame` 歸 0。
  7. 顯示的同時寫 Home key（§5）。
- **頁面切走**：顯示期間 `visibilitychange` 變成 hidden 時立刻結束並隱藏。元件卸載時清掉 rAF 與 timer。
- **不改變任何焦點**：不要呼叫 `focus()`，也不要 `scrollIntoView`。

## 4. 三頁接線

「新增」的判定一律看**開啟表單時是不是新增模式**，不能看回傳內容。

| 頁面 | 成功點 | 新增判定 | context | activityKey |
|---|---|---|---|---|
| `PersonalPage` | `saved()`，`result.record.status !== 'DELETED'` | 開表單時 `editing` 為 undefined（狀態要在 `setEditing(undefined)` 之前取得，或由 `onSaved` 帶旗標） | `'personal'` | `${record.occurred_on}/${record.id}` |
| `SharedWorkspace` | expense 彈窗的 `onSaved` | 同上 | `group.id` | 同上 |
| `PooledWorkspace` | 新增基金支出的 `mutation` 回傳 `true` 時（`onSubmit`） | 只有新增 | `group.id` | 用 `pooledExpenseMutationSchema` 解析回應後的 `record` |

- pooled 目前的 `mutation()` 只呼叫 `parse`、不回傳結果。請做最小改動，讓新增基金支出拿得到解析後的 `record`，例如 `parse` 可回傳值，`mutation` 把它交給呼叫端；其他 mutation 行為不變。
- 呼叫順序：在通知設定之後呼叫 `celebrate`。refresh 失敗走既有錯誤訊息時仍照播，因為紀錄已經確認儲存。pooled 是先 refresh 後才回傳 `true`，維持現狀。
- `preload()`：新增彈窗打開時（`dialog === 'expense'` 且非編輯）呼叫。
- 離線、錯誤、刪除、編輯、私人參照、更正、投入、結算：都不呼叫 `celebrate`。

## 5. Home 去重

- Home key：`mimic.home.latest-activity.${context}`（`home-scene-motion.ts`，context 是 `'personal'` 或 group id）。Home 進入時若 `activityKey > previous` 就播。
- 小夥伴**實際顯示時**（動畫或減少動態的靜止格），寫入 `max(stored, activityKey)`（字串比較，與 Home 相同）。stored 是 null 也寫入。暫停、隱藏、逾時跳過時不寫，回 Home 照 2C 規則播。
- 寫入包在 try/catch 裡。key 名稱與比較方式**抽成共用函式**，Home 與小夥伴都 import 同一個，避免兩邊漂移。Home 行為必須逐位元組一致：抽函式只是搬移，不能改邏輯。
- 不處理：同一天新增的支出，如果 UUID 比既有最新的小，Home 本來就不會播（UUID v4，見待辦）。這種情況寫 `max` 不會改變 Home key。

## 6. `motion-timing.json` 與 manifest

- approved `docs/design/assets/approved/page-visual-v1/motion/motion-timing.json` 與 `web/public/pixel-ui/v1/motion/motion-timing.json`：只把 `variants.desktop.ledger.sha256` 改成 `e2248e30cbd4db4ed6457f6c5e0bc6ee7f7a1ba27e1e33b08ce688544880743e`，`variants.phone.ledger.sha256` 改成 `dcdbcbfb26f5faf68fd20d02b48458a4632de78884add3b7f18a3d6938b13fc0`。其他位元組不變，兩份要完全相同。
- 新測試：每個 variant 的每個動作，若 `asset_id` 對應的檔案存在於 `web/public/pixel-ui/v1/`，`sha256` 必須等於檔案 hash。celebration 未推廣，檔案不存在，跳過，但要斷言它確實不存在。
- manifest：兩條 inkline motion 的 `consumer`（§0.1-8），以及 `motion-timing.json` 記錄的 `sha256`（若有）。其他所有寫死 hash 的地方（測試、`.gitattributes` 精確路徑、promote 腳本）一併更新。在 verification 列出新的 motion-timing 與 manifest SHA-256。
- 如果 `npm run assets:promote` 的檢查會因此失敗，用最小改動讓它通過，並在 verification 說明。不要新增 `--phase-2g` 推廣，因為這輪沒有新素材。

## 7. 小待辦

1. **SettlementPanel**（`web/src/features/shared-settlements/settlement-panel.tsx`）：`batch.status`、`transfer.status` 改用 §0.1-9 的中文對照表（`Record<enum, string>`，型別完整涵蓋）。更新斷言英文的既有測試。
2. **`--mimic-font-pixel`**：§0.1-10。`tokens.test.ts` 加斷言：已定義，且每個 `var(--mimic-font-*)` 引用都有定義（掃 `web/src/**/*.css`）。
3. **浮動鈕第二次無效**：先寫 e2e 重現。在 `/app/personal?space=…` 與 `/app/spaces/<id>`：按浮動鈕 → 彈窗開 → 關閉（取消，或新增成功）→ 再按浮動鈕，看彈窗會不會開。
   - **重現成立**：三頁在新增彈窗關閉時（任何方式），若網址有 `quick=1`，用 `router.replace` 拿掉 `quick`、保留其他參數（`scroll: false`）。不改 `quickExpenseHref`。
   - **重現不成立**：不改程式，e2e 留著當回歸測試，verification 說明。

## 8. 驗證

### 8.1 基線與指令

- 基線：`2a2cda8` 的乾淨 worktree（放在 `.tmp/`）。
- `npm run lint`、`typecheck`、`npm test`、`build`、`test:e2e`。逐項標明失敗是「既有」還是「本輪造成」。Vitest 若出現 5 秒逾時，用 `--testTimeout=20000` 重跑全套並記錄。
- Linux（WSL Docker `node:22`，`core.autocrlf=false` 的乾淨 checkout，內容 = 候選工作樹）跑 **CI 四個 job 的步驟**：Active Mimic naming、Backend、Web PWA（lint／typecheck／`npm test`／build）、Production containers。**`web/Dockerfile` 與 `web/Dockerfile.railway` 都要 build 成功**，以 `node` 身分執行，並通過 `/api/health/live`。
- real-backend 只用 `127.0.0.1` 專用 DB。
- 產品程式不得 import `web/` 以外的檔案（`web-build-context.test.ts` 綠）。

### 8.2 新 e2e：`web/e2e/record-confirmation-phase-2g.spec.ts`

尺寸：360×780、390×844、768×1024、1440×900。

- 三頁新增成功 → 小夥伴出現；變體與 CSS 尺寸正確（118×123／96×100）；`background-image` 是 inkline 條；`aria-hidden`；`pointer-events: none`；`document.activeElement` 與成功前預期的焦點（PixelDialog 還原的元素）相同；捲動位置不變。
- 播放影格依序 0→4，約 2000 ms 後隱藏（可用 `page.clock`）。
- 小夥伴的 bounding box 不與浮動鈕、底部導覽（手機）相交，且完整在視窗內。
- 編輯、刪除、加入我的帳本、編輯私人資訊、更正、確認實際投入、投入排程、離線（無法送出）、伺服器錯誤：都**不出現**。
- 減少動態（`emulateMedia({ reducedMotion: 'reduce' })`）：直接第 4 格，2000 ms 後消失。
- 暫停偏好 `"true"`：不出現，Home key 不變。
- Home 去重：personal 新增一筆（今天日期）→ 小夥伴出現 → 回 `/app`：ledger **不播**（`data-ledger` 從未出現）。對照組：不經記帳頁，直接用 API 新增更新的活動 → 回 `/app` 照播。group context（shared、pooled）各一組。
- 經 Home QuickExpense（`/app?quick=1` → 選寶箱 → `?quick=1` 開表單）新增：出現。
- §7 的三項。

### 8.3 回歸（容差 0）

- Landing：header 以下的區域，與 2F 的比對基準相同（11 個尺寸）。
- Home：idle／empty／ready／offline 各狀態的場景區逐像素相同；ledger 播放時序與 2F 錄影一致（抽影格比對）。
- 三頁在**沒有觸發**時的截圖，與基線逐像素相同（2F 的 personal／shared／pooled 資料狀態，390 與 1440）。
- `landing-phase-2a`、`landing-phase-2b`、`home-phase-2c`、`navigation-phase-2d`、`polish-phase-2e`、`ledger-notebook-phase-2f` 全綠。

### 8.4 截圖、錄影與交付

存放在 `docs/design/assets/reviews/2026-11-13-phase-2g/`（舊截圖、錄影唯讀）。

- `videos/`：三頁新增成功的錄影，各 390×844 與 1440×900（webm）。手機那支要先捲到列表中段再用浮動鈕新增。另外加 personal 減少動態、Home 去重（記帳 → 回 Home）各一支。
- `screenshots/`：
  - 小夥伴第 4 格停留時：三頁 × 390×844、1440×900，加 360×780 personal。
  - 減少動態：personal 390、1440。
  - SettlementPanel before／after（含 PENDING＋各轉帳狀態、COMPLETED、CANCELED），390、1440。
  - Mimic ID before／after：設定、群組成員、邀請流程，390、1440。
  - 浮動鈕第二次按的 before／after（若有修正）。
- `verification.md`：三頁成功點與「新增」判定的程式位置；小夥伴位置實測（各尺寸 bbox、與浮動鈕／導覽的距離）；影格時間實測；Home key 前後值；motion-timing／manifest 新舊 hash；回歸結果；Linux／Docker 結果；測試修改清單；§7-3 的重現結論；未完成事項。
- `.agents/devlog.md` 追加一筆（CRLF）。

## 9. 審閱時 Ed 要看的點

1. 小夥伴在手機左下與桌機浮動鈕上方的觀感，是否擋到內容；2 秒的停留時間會不會太長或太短。
2. 96×100 的 Mimiku 在手機上看不看得清楚寫字的動作。
3. 回 Home 不重播，是否符合預期。
4. SettlementPanel 用語、Mimic ID 等寬字型。

## 待辦（不在本輪）

- **Home ledger 觸發依賴 UUID v4 排序**：`activityKey = occurred_on/UUID`，同一天新增的支出大約一半不會觸發，補記過去日期的支出不會觸發。要改成以後端 `created_at` 或伺服器序號判斷「新活動」，需要改 Home API 合約。
- 摘要卡、表單彈窗、結算面板（`event-settlement`）、更正（`event-correction`）、結清退回（`event-return`）改成筆記本風格 → 可以跟公會一起排。
- celebration 需先定義「冒險完成」。
- Vitest 5 秒逾時的 CI 風險。

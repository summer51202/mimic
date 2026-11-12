# Phase 2F：記帳筆記本

日期：2026-11-12。狀態：待 Codex 實作，停在視覺審核。

依據：2A–2E、2E-0、2E-1 已核准；`main` = `3ab87cd`，staging 已部署 2E。規則沿用 2D spec（圖示取樣、對比）與 2E spec（停用色票、Linux 驗證）。

## 0. Ed 已定的決策（2026-11-12）

1. **範圍**：三種寶箱頁的帳目區。也就是 `/app/personal`、共同分帳 `/app/spaces/[id]`（`SharedWorkspace`）、共同基金 `/app/spaces/[id]`（`PooledWorkspace`）的**支出列表與金額摘要**。彈窗裡的表單、結算面板、生命週期、參與者、結清／退回都延後。
2. **外框**：用 `frame-notebook`，**框住整個列表區**（一本筆記本包住一個列表）。列與列之間用細線分隔，每一列不另外加框。金額摘要卡維持現狀。
3. **圖示**：**每一列**左側放 event 圖示（桌機 48、手機 32 CSS px）。mode 圖示放在頁首。`status-lock`／`status-offline` 放在對應徽章或通知的文字前面。圖示一律 `alt=""`＋`aria-hidden`，可及名稱由可見文字提供。
4. **record-ledger**：這輪**不在記帳完成時播放**。先修正書頁上的「Mimiku」字樣，改成**無意義的墨線**。要修的檔案包括 staged 的 `mimiku/action-record-ledger.png`，以及已經在 Home 上線的 `motion/mimiku-record-ledger-{desktop,phone}.png`（§6）。
5. **文字色**：**只有筆記本裡面**改成暖色：主文字 `#211a18`、次要文字 `#5a4636`。筆記本以外仍是海軍藍 `ink`／`ink-soft`。
6. **金額**：只靠文字與符號區分，**不加紅綠色**。
7. **順便修**：浮動記帳鈕蓋住內容；`/app/spaces/*` 的側欄亮在「首頁」；Wordmark 焦點框的內距（§7）。

## 0.1 審閱者自行決定的事（附理由）

- **新增共用元件 `PixelNotebook`**（`web/src/shared/ui/pixel-notebook.tsx`＋`.module.css`）。九宮格的做法和 `PixelDialogue` 一樣：從 `web/public/pixel-ui/v1/frames/frames.json` 讀 `notebook`，`border-image: url(...) 14 fill / 28px / 0 repeat`，內距 = 28 + `minPadding`（手機 18 → 46 px、桌機 26 → 54 px），切換點用內容欄寬 `48rem`（跟 shell 一致）。理由：三個頁面要共用，九宮格參數只能有一個來源。`PixelDialogue` 本身不改。
  - 元件輸出 `<section aria-labelledby>`，標題由呼叫端提供（沿用各頁現有的 h2）。外框圖片載入失敗時，退回 2px 實線 `--mimic-color-wood`＋中心色底（符合 manifest 的 fallback）。
  - 中心色 `#ead7ac` 等於 `frames.json` 的 `centerColor`，用 token 表示，並在 `tokens.test.ts` 加檢查，確保兩者一致。
- **新 token**：`--mimic-color-notebook-field: #ead7ac`、`--mimic-color-notebook-text: #211a18`（12.09:1）、`--mimic-color-notebook-text-soft: #5a4636`（6.27:1）、`--mimic-color-notebook-rule: #8a5a35`（列分隔線，裝飾用，4.12:1）。
- **筆記本裡的焦點框**：`--mimic-color-focus #2f82d6` 在 `#ead7ac` 上只有 **2.80:1**，未達非文字元素 3:1。所以筆記本內所有可聚焦元素改用雙色焦點框：3px `focus` 外框，外面再加 2px `notebook-text`（`box-shadow`），讓相鄰色至少有一圈 ≥ 3:1。筆記本以外不變。
- **按鈕**：`PixelButton` 的各種 emphasis 在筆記本內不改樣式（ghost 是白底 `hud-dark` 字，本身對比足夠）。停用時沿用 2E 的淺色停用色票，也就是白／米色系按鈕放在米色底上；verification 要列出每種按鈕在 `#ead7ac` 上的外框與文字對比。
- **金額**：筆記本內每一列的金額都是非負數。方向由列上的文字類型說明（見 §4 的對應表），不顯示 `+`／`-`。字型粗體、`tabular-nums`、靠右對齊；手機直排時靠左，但整欄仍維持等寬數字。`formatMinorUnit` 不改。理由：負數只出現在摘要卡（帳面餘額、位置），而摘要卡這輪不改，這樣可以避免改動全站的格式化與測試。
- **只推廣這輪實際用到的素材**（§2）。`event-correction`、`event-settlement`、`event-return` 的 consumer（結算面板、更正紀錄、結清退回）都延後，所以它們維持 staged-only。
- **離線狀態**：目前只有 pooled 有離線橫幅。personal 和 shared 也在筆記本頂端加上同樣語意的 `role="status"` 文字：「目前離線；已確認資料維持不變。」前面放 `status-offline` 32 px。理由：這兩頁離線時只會把按鈕停用，沒有任何說明；而 `status-offline` 的 consumer 本來就是這個。
- **`/app/spaces/*` 的側欄**：這些頁面一定是群組底下的共同分帳或共同基金（個人寶箱只走 `/app/personal`），所以歸到 `/app/groups`。
- **2D 圖示取樣規則照用**：48 CSS px 一律 `pixelated`；32 CSS px 在 `<1.5dppx` 用 `auto`、`≥1.5dppx` 用 `pixelated`。

## 1. 範圍

### 1.1 做

§2 素材推廣、§3 `PixelNotebook`、§4 三頁的帳目區、§5 頁首 mode 圖示與 shortfall／offline、§6 record-ledger 書頁修正、§7 小修、§8 驗證。

### 1.2 不做

- 不改摘要卡（月支出、花在哪裡、共同支出總額、目前位置、四張餘額卡）的外觀，只在 pooled 的缺口警示前面加圖示（§5）。
- 不改任何 `PixelDialog` 裡的表單、`SettlementPanel`、`SharedLifecyclePanel`、更正表單、pooled 的參與者與結清區、QuickExpense 清單。
- 不在記帳完成時播放 record-ledger，也不新增任何動畫。
- 不改 `formatMinorUnit`、文案（新增的離線說明除外）、路由、後端、Dockerfile、CI、`.railway/`。
- 不改全站 `ink`／`ink-soft`。
- 產品程式不得 import `web/` 以外的檔案（`web-build-context.test.ts`）。

## 2. 素材推廣（`disposition: "promoted-phase-2f"`）

把以下 10 個檔案逐位元組複製到 `web/public/pixel-ui/v1/<同路徑>`，manifest 的 `runtime_target` 與 `disposition` 也一併更新：

- `frames/frame-notebook.png`
- `icons/ui/event-expense.png`、`event-contribution.png`、`event-reimbursement.png`、`event-shortfall.png`
- `icons/ui/status-lock.png`、`status-offline.png`
- `icons/ui/mode-personal.png`、`mode-shared.png`、`mode-pooled.png`

做法：在 `npm run assets:promote` 加上 `-- --phase-2f` 選項（同 2D／2E 的寫法）。`frames.json` 已經推廣，不用再動。verification 列出這 10 個檔案的 hash、manifest 新的 SHA-256，以及 promoted 總數。§6 的新檔另外處理。

## 3. `PixelNotebook`

- props：`titleId`、`children`、`className`。不提供 `variant`。
- 外框和內距照 §0.1。內容區文字色 `notebook-text`；`time`、說明文字、次要資訊用 `notebook-text-soft`。字級與字重沿用各頁現有的設定。
- 筆記本內部的區塊標題（h2）和右側的主要按鈕放在筆記本**裡面**的頂端，跟列表對齊。
- 列表：`list-style: none`。每一列之間用 2px **虛線** `notebook-rule`，最後一列沒有底線。列內是三欄 grid：`圖示 | 內容 | 金額＋操作`。
  - 桌機：圖示 48，欄間距 16 px。
  - 手機（內容欄 < 48rem）：圖示 32，第一列放「圖示＋內容」，金額與操作換到下一行，並靠左對齊內容欄的起點（跟現在的直排一樣）。
- 空狀態：沿用現有文字，放在筆記本內，不放圖示。
- 360 px 寬時，筆記本內容寬 = 360 − 頁面左右內距 − 2×46。verification 要寫出實際值，並證明沒有水平捲軸、文字沒被截斷、按鈕至少 44 px。

## 4. 三頁的帳目區與 event 對應

| 頁面／列表 | 列 | event 圖示 | 列上的類型文字（新增，`notebook-text-soft`） | status |
|---|---|---|---|---|
| `/app/personal`「日常支出」 | `MANUAL` | `event-expense` | 支出 | — |
| 同上 | `SHARED_REFERENCE` | `event-expense` | 現有徽章「來自共同分帳」，不再另加文字 | `source_locked` 時，「來源已鎖定」徽章前放 `status-lock` 32 |
| 共同分帳「共同支出」 | 每筆 | `event-expense` | 共同支出 | — |
| 共同基金「投入排程與實際投入」 | 每個 occurrence | `event-contribution` | 投入 | — |
| 共同基金「基金支出與代墊」 | `FUND_PAID` | `event-expense` | 基金支出 | — |
| 同上 | 有人先代墊 | `event-reimbursement` | 代墊（現有的「X先代墊」照留） | — |

- 「類型文字」是一個短標籤，讓圖示的意思不只靠形狀表達。放在日期前面，例如「支出 · 2026-11-12」。
- 共同基金的排程是巢狀結構（排程 → occurrences）：排程名稱與「編輯投入金額」維持在列表上方，當作分組標題；occurrence 才是帶圖示的列。
- 每個列表各自是一本筆記本：personal 1 本、shared 1 本、pooled 2 本。
- 頁面外層的 `PixelPanel` 改成 `PixelNotebook`，不要筆記本外面再包一層 panel。
- 既有的 `data-testid`、`aria-label`、按鈕文字全部不變。

## 5. 頁首 mode 圖示、缺口與離線

- 三頁的 eyebrow（`PERSONAL EXPENSES · 個人記帳` 等）前面放對應的 `mode-*` 圖示，桌機 48、手機 32，跟 eyebrow 文字垂直置中。h1 位置可以下移，但不改字級。
- Pooled 的缺口警示（`role="alert"`，紅底）的「資金缺口」前面放 `event-shortfall` 32。紅底與文字顏色不變。
- 離線：personal 和 shared 依 §0.1 新增離線說明；pooled 既有的離線橫幅前面加 `status-offline` 32。三者都用 `useOnline()`，SSR 時不渲染（避免 hydration 不一致）。

## 6. record-ledger 書頁修正（ImageGen）

目標：書頁上的「Mimiku」字樣（以及第 1–3 格裡寫到一半的 `M`、`Mi`…）改成**無意義的短墨線**，每一格比前一格多一道，保留「正在寫」的感覺。**墨線不能組成任何字母、數字或符號。**

- 來源：`approved/page-visual-v1/mimiku/action-record-ledger.png`（5 × 512）。用 ImageGen 只編輯**書頁內側區域**，再用遮罩合成回原圖：遮罩外的像素必須與原檔逐位元組相同，alpha 也不能改。遮罩範圍由 Codex 定，但只能包含書頁紙面，不能碰到羽毛筆、Mimiku 本體、金幣。
- 動態條：`motion/mimiku-record-ledger-desktop.png`（5 × 118×123）與 `-phone.png`（5 × 96×100）必須用 **Motion 2R 原本的推導流程**，從新的 512 master 重新產生（參考 `compose-motion-calibration-v02.mjs` 系列與當時的 lineage 紀錄）。遮罩外的像素同樣要與原檔逐位元組相同。
  - **停止門檻**：如果原推導流程無法重現，也就是用**舊** master 跑出來的結果不等於現有核准檔，就先停下回報，不要自己改流程。
- 素材紀錄（不覆寫舊核准檔，比照 2E）：新增 `mimiku/action-record-ledger-inkline.png`、`motion/mimiku-record-ledger-inkline-{desktop,phone}.png` 三筆紀錄，`sources` 指回舊檔與 ImageGen 原始輸出。舊的三筆改為 `superseded-phase-2f`：motion 那兩筆的 `runtime_target` 設成 `null`，並移除它們的 runtime 副本。新的 motion 兩筆標為 `promoted-phase-2f`；master 維持 `staged-only-until-consumer-plan`。
- `motion/motion-timing.json` 的兩個 `asset_id` 改成新路徑，其他欄位不變；approved 與 web 兩份必須相同。verification 列出新舊 hash。`promote-page-visual-assets.mjs` 也要跟著改。
- 審閱頁：`docs/design/assets/reviews/2026-11-12-phase-2f/ledger-inkline-review.html`。內容包括 5 格的原版／新版／遮罩（512 原尺寸與 3× 放大），以及 desktop／phone 動態條逐格對照。另外附 Home 實際播放一次 ledger 的錄影（desktop 1440、phone 390）。
- Home 的觸發邏輯、時間軸、尺寸都不改。

## 7. 小修

1. **浮動記帳鈕**：在顯示浮動鈕的 app 頁面（`/app` 以外），內容區底部留出「浮動鈕外框高度＋它跟視窗底部的距離＋16 px」的空間，用 shell 提供的 CSS 變數 `--mimic-quick-action-clearance`，不要寫死數字。手機版要另外加上底部導覽的高度。驗證：390×844 與 360×780 下，捲到頁尾時，最後一個可互動元素的 `getBoundingClientRect()` 不能跟浮動鈕重疊；`/app`（Home）不受影響。
2. **側欄**：`/app/spaces/*` 歸到 `/app/groups`，也就是「共同群組」亮起並帶 `aria-current`。`quickExpenseHref` 不改。單元測試要涵蓋這個情況。
3. **Wordmark 焦點框**：頂欄 Wordmark 連結加上左右內距，讓 inset 焦點框不再壓到「Mimiku」的最後一個字母。頂欄外框高度必須維持 64 px，Home 的倍率表要跟 2C／2D 完全相同。

## 8. 驗證

### 8.1 基線與指令

- 基線：`3ab87cd` 的乾淨 worktree（放在 `.tmp/`）。
- `npm run lint`、`typecheck`、`npm test`、`build`、`test:e2e`。逐項標明失敗是「既有」還是「本輪造成」。
- Linux（WSL Docker `node:22`，`core.autocrlf=false` 的乾淨 checkout，內容 = 候選工作樹）要跑 **CI 四個 job 的步驟**：Active Mimic naming、Backend、Web PWA（lint／typecheck／`npm test`／build）、Production containers。**`web/Dockerfile` 與 `web/Dockerfile.railway` 都要 build 成功**，以 `node` 身分執行，並通過 `/api/health/live`。
- real-backend 只用 `127.0.0.1` 專用 DB。

### 8.2 新 e2e：`web/e2e/ledger-notebook-phase-2f.spec.ts`

尺寸：360×780、390×844、768×1024、1024×768、1440×900、1920×1080。

- 每本筆記本：`border-image-source` 指向 `frame-notebook.png`；計算後的內距（46／54）；中心色；文字與次要文字的計算後顏色；沒有水平捲軸。
- 每種列：圖示 `src` 依 §4 的表、CSS 尺寸（48／32）、`image-rendering`（模擬 DPR 1／2／3）、`alt=""`，以及類型文字存在。
- 金額欄：`tabular-nums`，桌機靠右。
- 焦點框：鍵盤 Tab 經過筆記本內的每個按鈕，雙色焦點框完整可見、沒有被外框裁掉。
- 頁首 mode 圖示、shortfall 圖示、三頁的離線狀態（`context.setOffline`）、`status-lock` 徽章。
- 圖片載入失敗（攔截請求）時，外框退回 fallback，圖示消失但文字還在。
- §7 的三項。

### 8.3 回歸（容差 0）

- Landing：header 以下的區域，與 2E 的比對基準相同（11 個尺寸）。
- Home：idle／empty／ready／offline 各狀態的場景區要逐像素相同，倍率表也要與 2C／2D 相同。ledger 播放中的影格只能在 §6 的書頁遮罩範圍內有差異，verification 要附逐格差異遮罩。
- 頂欄高度維持 64 px；公開 header 66／70 px。
- `landing-phase-2a`、`landing-phase-2b`、`home-phase-2c`、`navigation-phase-2d`、`polish-phase-2e` 全綠。

### 8.4 截圖與交付

存放在 `docs/design/assets/reviews/2026-11-12-phase-2f/screenshots/`。改前在基線截、改後在工作樹截，檔名成對（`<page>-<state>-<size>-before.png`／`-after.png`）：

- personal：空帳本、有資料（至少 6 筆，包含一筆 `SHARED_REFERENCE`＋已鎖定）、離線、讀取錯誤、已封存（唯讀）。
- shared：空、有資料、離線。
- pooled：有資料＋缺口、離線。
- 尺寸 390×844、1440×900；另外加 360×780 的 personal 有資料，以及捲到頁尾的浮動鈕對照。
- Wordmark 焦點（390、1440），以及 `/app/spaces/*` 的側欄（1440）。
- 筆記本外框的 4× 放大特寫（角落、邊緣接縫）。

`verification.md`（同一資料夾）內容包括：推廣檔 hash、manifest 新的 SHA-256、對比表（筆記本內所有文字與按鈕組合、焦點框）、360 寬時的內容寬度、§6 的遮罩方法與逐位元組證明、新舊 hash、motion-timing 差異、推導流程可重現的證明、Home 回歸、Linux／Docker 結果、測試修改清單、未完成事項。

`.agents/devlog.md` 追加一筆（CRLF）。

## 9. 審閱時 Ed 要看的點

1. 三頁的筆記本，在手機與桌機上跟奶油色頁面、暖褐 shell 放在一起的觀感，以及暖色文字的效果。
2. 每列的 event 圖示在 32 px 時的辨識度，以及類型文字會不會太擠。
3. 新的書頁墨線（審閱頁＋Home 錄影），確認看不出任何字。
4. 浮動鈕不再蓋住內容、側欄的歸屬、Wordmark 焦點框。

## 待辦（不在本輪）

- 記帳完成時播放 record-ledger（consumer：Record expense confirmation），等 §6 核准後再做。
- 摘要卡、表單彈窗、結算面板（`event-settlement`）、更正紀錄（`event-correction`）、結清退回（`event-return`）改成筆記本風格 → 可以跟公會一起排。
- `--mimic-font-pixel` 目前在 4 個地方被使用，但整個 repo 都沒有定義（都退回系統字體）。要嘛定義它，要嘛移除這些引用。

## 2R：書頁修補亮度（2026-11-12，Ed 決定）

審閱結果：Ed 已核准 §2–§5、§7（筆記本外框、暖色文字、每列 event 圖示、mode／status 圖示、三項小修）。左側裝訂帶每 28 px 重複一次可以接受，跟 Frames 2R 已接受的「邊緣重複」屬於同一類。

需要修正的只有 §6。審閱者自己比對了 master：遮罩內修補過的紙面（排除墨線、亮度 ≥ 150 的像素）平均亮度是 **238.2**，同一個外接矩形外擴 4 px、但沒被修改的紙面平均是 **226.4–228.0**。放大後，原本「M」和「ku」的位置有亮色殘影。

### 2R.1 要求

- 只重做 §6 的合成步驟，ImageGen 的原始輸出可以沿用。修補用的紙面顏色改成從周圍**沒被修改的紙面**取樣，使明暗與紋理延續。墨線的位置與數量不變。
- 每一格都要量並列在 verification：遮罩內紙面像素與外擴 4 px 那一圈的平均亮度差 **≤ 2**，兩者的標準差也要列出。附上殘影檢查圖：只顯示紙面、把對比拉高（例如 levels 200–245），原圖與新圖並排，原字形不能再看得出來。
- 其他規則跟 §6 一樣：遮罩外逐位元組不變、alpha 不變、桌機和手機用 Motion 2R 流程從新 master 重新推導、motion-timing 的 `asset_id` 不變。三個 `-inkline` 檔的 hash 會改變，manifest、`assets.test.ts`、`asset-style-gate.test.ts` 與 verification 都要跟著更新。
- 重跑：`assets:promote -- --phase-2f`、相關單元測試、`home-phase-2c`、Home 的零容差回歸（場景區），以及 §8.1 Linux 驗證裡的 Web PWA 與兩個 web Dockerfile 的 build 和 health。
- 更新 `ledger-inkline-review.html`（新增殘影檢查圖），重錄 Home ledger（1440、390）。verification 新增「2R」小節，保留第一輪的數字作為對照。devlog 追加一筆（CRLF）。

# 公會 Phase：圖示 consumer＋筆記本／公告板風格

- 日期：2026-11-19（小德起草；Ed 的決策見 §1）
- 狀態：**草稿，尚未 commit**。目前只開放 **G1（生圖與審閱頁）**；**I1（實作）要等 2I-b commit 並上線後**，並以那個 commit 為基線（下文稱 `<2IB>`）。
- 盤點基線：origin `7bca944`。盤點時工作樹裡有 2I-b 未 commit 的變更，本 spec 沒有讀取也沒有修改那些檔案。
- 相關：2F spec（`2026-11-12-phase-2f-ledger-notebook-design.md`）、2G spec、2I spec §6、2I-2 spec §6、`.tmp/2ib-ja-review-result.json` 的用語集（2I-b 上線後改看 `docs/i18n/glossary.md`）。

---

## 0. 這一輪的界線

| 階段 | 時機 | 可以做 | 不可以做 |
|---|---|---|---|
| **G1 生圖** | 現在 | 在 `docs/design/assets/reviews/2026-11-19-phase-guild/g1/` 產出候選素材、靜態審閱頁、verification | 改 `web/`、`backend/`；commit／stage；碰 2I-b 範圍的檔案；寫 `.agents/devlog.md`（避免和 2I-b 衝突） |
| **I1 實作** | `<2IB>` 上線後 | 依 §3–§6 修改 `web/`、推廣素材 | 改 `backend/`（本輪不需要後端變更） |

2I-b 範圍的檔案（G1 期間都不要碰）：`web/src/i18n/messages/*`、`language-switch.tsx`、`i18n/config.ts`、全域 CSS 的 `:lang(ja)`、sw 離線頁、manifest、backend taxonomy／migration、`docs/superpowers/specs/2026-11-19-phase-2ib-japanese-design.md`、`.tmp/2ib-*`。

---

## 1. Ed 已定的決策（2026-11-19）

1. **框的分工**：「紙＋公告板」。
   - 摘要卡、表單彈窗：用 notebook 紙面（同 2F）；
   - 結算批次、結清退回：用 **wood 公告板**（推廣 staged 的 `frame-wood`）；
   - 更正：標示在筆記本內的支出列裡；
   - `frame-parchment`、`frame-stone` 維持 staged。
2. **彈窗範圍**：直接改共用元件 `PixelDialog`，**全部 20 個彈窗**一起換（features 18 個，加上 groups 的 2 個）。
   - 2A 起的「`PixelDialog`（確認彈窗）不動」這條決策，**由本輪取代**；
   - `PixelDialogue`（Home 對話框）不動。
3. **更正紀錄**：在原支出列下方加一行標示，**只做共同分帳**。
   - 大金額維持原紀錄的金額；
   - 標示行寫「已更正 N 次 · 更正後 金額」；作廢時寫「已作廢」。
4. **摘要卡**：每頁整組包成**一本**筆記本，卡片之間用虛線分隔。2F 的「摘要卡不變」由本輪取代。
5. **Mimiku `action-settlement`**：這輪不用，維持 staged。2G 的「結算不播動畫」不變。
6. **`event-return`**：請 Codex 重生，要能和 `event-contribution`、`event-shortfall` 這兩個錢袋分辨開。
7. **圖示新增的 consumer**：結算批次與退回列、任務板、表單內的鎖定／離線提示。
   - 群組頁的寶箱列表**不做**：標題已經寫了模式名稱，而且會多一頁要做回歸。

固定規則：
- 不畫文字、數字、金額進像素；
- Mimiku 沒有手；
- 金屬配件用黃銅＋暗鐵，亮金只給主要 CTA（金幣本身不算配件）；
- 新字串三語同時提供，中文既有字串**逐字不變**。

---

## 2. 盤點（`7bca944`）

### 2.1 元件現況

| 範圍 | 檔案 | 現況 |
|---|---|---|
| 個人摘要卡 | `features/personal-expenses/personal-page.tsx`（`.personal-summary`） | 2 張 `PixelPanel`：月支出、花在哪裡 |
| 共同摘要卡 | `features/shared-expenses/shared-workspace.tsx`（`.shared-summary`） | 2 張 `PixelPanel`：總額、目前位置 |
| 基金摘要卡 | `features/pooled-funds/pooled-workspace.tsx`（`.pooled-vault`） | 4 張 `PixelPanel`：帳面餘額、待付代墊、已送出待收款、可用餘額 |
| 彈窗 | `shared/ui/pixel-dialog.tsx`＋`PixelFrame variant="dialog"`＋`globals.css .pixel-dialog*` | CSS 線框、淺色底 |
| 結算面板 | `features/shared-settlements/settlement-panel.tsx` | `PixelPanel`；批次是 `ol.settlement-trail`，沒有圖示 |
| 結清退回 | `pooled-workspace.tsx` 的 `.pooled-closing` | `PixelPanel`（coin 色邊）；退回列表是 `ul.pooled-ledger`，沒有圖示 |
| 更正 | `correction-form.tsx`；`shared-money.ts` 的 `applyExpenseCorrections` | **UI 沒有任何地方顯示更正**。共同分帳會抓 `/shared-corrections`，但只用來計算更正表單的預設值；基金的 corrections 在 API 合約裡，web 沒有用到 |
| 任務板 | `features/tasks/task-center.tsx`＋`tasks.css` | `task-card`，沒有圖示；離線提示沒有圖示 |
| 表單離線／鎖定 | `personal-box-form`、`personal-expense-form`、`personal-reference-form`（個人）、`shared-expense-form`、`correction-form` | 純文字的 `<p role="status">` |

**附帶發現**：`shared-queries.ts` 和 `shared-workspace.tsx` 的 `refresh()` 只讀 corrections 的第一頁。
- `shared-settlements.service.ts` 的批次分頁上限是 25，corrections 很可能也是；
- 超過一頁時，更正表單的 `sourceRevision` 會算錯（既有 bug），新的更正標示也會算錯；
- I1 要一併修正，見 §3.5。

### 2.2 素材（`docs/design/assets/approved/page-visual-v1/`）

| 素材 | 狀態 | 本輪 |
|---|---|---|
| `icons/ui/event-settlement.png`（黃銅天秤） | staged | **推廣** |
| `icons/ui/event-correction.png`（兩張羊皮紙＋紅封蠟） | staged | **推廣** |
| `icons/ui/event-return.png`（打開的錢袋） | staged | **G1 重生**，Ed 選定後取代並推廣 |
| `frames/frame-wood.png`（中心 `#39271e`） | staged | **推廣** |
| `frames/frame-parchment.png`、`frame-stone.png` | staged | 不動 |
| `mimiku/action-settlement.png` | staged | 不動 |
| 已推廣的 event／mode／status 圖示 | promoted-phase-2f | 只新增 consumer，素材本身不動 |

---

## 3. 視覺規格（I1）

### 3.1 框與 token

- **notebook**：沿用 2F，`frames.json` 的 `notebook`、token `--mimic-color-notebook-*` 不變。
- **wood 公告板**：新元件，或把 `PixelNotebook` 擴充成 `variant="notebook" | "board"`，用 `frames.json` 的 `wood`（slice 14、scale 2、內距同 notebook）。新 token：

| token | 值 | 對 `#39271e` 的對比 |
|---|---|---|
| `--mimic-color-board-field` | `#39271e`（＝centerColor） | — |
| `--mimic-color-board-text` | `#f0dfc4`（＝dialogue text） | 10.83:1 |
| `--mimic-color-board-text-soft` | `#bc9b65`（＝dialogue speaker） | 5.40:1 |
| `--mimic-color-board-rule` | `#b79556`（＝dialogue edge），2px 虛線 | 5.02:1 |

- 公告板上的焦點框：3px focus＋2px `#f0dfc4`，比照 2F 的雙色做法。Codex 要量 focus 色對 `#39271e` 的對比，必須 ≥ 3:1。
- 公告板上的 `PixelButton` 四種 emphasis（primary／secondary／ghost／danger）和 disabled 都要量：文字 ≥ 4.5:1、邊界 ≥ 3:1。
  - 不足的變體只能在 `.board` 範圍內覆寫；深色底的 disabled 沿用 2E 規則（hud-raised／dialogue-speaker／虛線 dialogue-edge）；
  - primary 仍是亮金，因為它是主要 CTA。

### 3.2 摘要卡（整組一本）

- 個人 `.personal-summary`、共同 `.shared-summary`、基金 `.pooled-vault` 各包成一本 `PixelNotebook`。內部卡片拿掉 `PixelPanel` 的框與底色，保留原本的語意元素和 `data-testid`。
- 分隔：
  - 單欄時，卡片之間用 2px 虛線 `--mimic-color-notebook-rule`；
  - 多欄時，欄與欄之間用垂直虛線，列與列之間用水平虛線。
- 欄數：沿用現在的斷點，不新增斷點。如果包框後內距不夠（文字截斷或溢出），停下回報。
- 大金額：notebook text 色、`tabular-nums`、不換行。
- 不新增紅綠色：金額只靠文字與符號（同 2F）。
- 基金的 `.pooled-shortfall`（`role="alert"`）保持在本子外，不改。
- `aria-labelledby`：共同的摘要已經有 `shared-summary-title`。個人和基金沿用現有標題元素的 id；沒有 id 的話補 id，**不要新增可見文字**。

### 3.3 `PixelDialog`（20 個一起換）

- `PixelFrame variant="dialog"` 改成 notebook 紙面：nine-slice＋`--mimic-color-notebook-field`；文字用 notebook text／text-soft；焦點框用 2F 的雙色。
- 不變的部分：backdrop、標題、關閉鈕的位置、`aria-*`、焦點還原、Escape 行為、`max-width: min(100vw − 2rem, 40rem)`。
- 彈窗裡的 `PixelField` 輸入框仍是淺色底＋hud-dark 邊。Codex 要量輸入框邊在紙面上的對比，必須 ≥ 3:1。
- **手機框倍率由 Ed 在 G1 審閱頁選定**：
  - A：2×（28 px 角）；
  - B：視窗 < 48rem 時用 1×（14 px 角、內距 14 px）。
  - G1 會在 320 與 390 寬度都排出 A／B 兩種。
- 彈窗裡的圖示一律用 `size={32}`，不跟著容器查詢變成 48。

### 3.4 wood 公告板：結算批次與結清退回

- `SettlementPanel` 外層改成公告板；`.pooled-closing` 也改成公告板，拿掉 coin 色邊。
- **結算批次**：每個批次 `<li>` 是一列，左側放 `event-settlement`（桌機 48／手機 32，規則同 2F 的 `LedgerIcon`）。
  - 批次內的轉帳子列表不放圖示；
  - 列之間用 board-rule 虛線。
- **退回**：每筆退回 `<li>` 左側放 `event-return`（選定版本），尺寸規則同上。
- 標題、eyebrow、說明文字、狀態文字、按鈕的順序和字串都不變。
- `SharedLifecyclePanel` 和基金的參與者面板**不在本輪範圍**，仍是 `PixelPanel`。

### 3.5 共同分帳的更正標示

- 資料來源：`data.corrections.items` 中 `source_expense_id === expense.id` 的項目。
  - `count`＝筆數；
  - 「最新」＝`revision` 最大的那筆；
  - **更正後金額**＝最新那筆的 `target_amount_minor`；
  - `target_amount_minor === '0'` 時視為作廢。
  - I1 開始前，Codex 要讀 `backend/src/modules/shared-settlements/` 確認 `target_amount_minor` 是「更正後的總額」，而不是差額。如果不是，停下。
- `source_transfer_id` 的更正（轉帳更正）不在本輪範圍。
- **分頁**：server 端 `shared-queries.ts` 和 client 端 `refresh()` 都要沿著 corrections 的 `next_cursor` 讀到 null（只讀，後端不變）。
  - 加測試：超過一頁時標示和 `sourceRevision` 都正確；
  - 這同時修正 §2.1 提到的既有 bug。
- 位置：`SharedExpenseList` 每列中間欄，接在「分攤」那一行後面。格式比照 2F 的 lock badge：`LedgerIcon event-correction size={32}`＋文字。
  - 第一行：`shared.list.correctedTo` 或 `shared.list.correctedVoid`；
  - 第二行：`shared.list.correctionReason`（使用者輸入的原因，可以換行，不截斷）。
- 右側大金額**維持原紀錄金額**，`data-testid` 不變。
- 標示行裡的金額可以隨句子換行（比照英文位置列）。
- 沒有更正的列，DOM 和像素都不變。
- 不觸發 record-ledger 動畫（2G 規則不變）。

### 3.6 圖示 consumer 對照表

| 位置 | 圖示 | 尺寸 |
|---|---|---|
| 結算批次每列 | `event-settlement` | 48／32 |
| 退回每列 | `event-return`（新） | 48／32 |
| 共同支出列的更正標示 | `event-correction` | 32 |
| 任務板 `POOLED_CONTRIBUTION` | `event-contribution` | 48／32 |
| 任務板 `POOLED_REIMBURSEMENT_SEND`／`_RECEIVE` | `event-reimbursement` | 48／32 |
| 任務板 `SHARED_TRANSFER_SEND`／`_RECEIVE` | `event-settlement` | 48／32 |
| 任務板 `POOLED_SHORTFALL` | `event-shortfall` | 48／32 |
| 任務板離線提示 | `status-offline` | 32 |
| 5 個表單的離線提示（§2.1） | `status-offline` | 32 |
| `shared-expense-form` 的 `pendingLock`／`permanentLock` 提示 | `status-lock` | 32 |

- 任務板的 48／32 依視窗寬度切換：任務板不在 `app-content` 容器查詢之下時，用 `@media (min-width: 48rem)`；Codex 要確認任務板在不在容器查詢範圍內，並在 verification 裡寫明用的是哪一種。
- 任務卡加一個左欄放圖示；卡片的框、色彩、緊急度樣式都不改。≤540 px 時圖示留在左欄，其他內容排在右欄。
- 所有圖示都是 `NavigationIcon`（`alt=""`、`aria-hidden`），旁邊的文字不變。

### 3.7 明確不變

- Landing、Home（含場景區與 `PixelDialogue`）、設定、auth、群組頁、Avatar：關閉彈窗時像素零差異。
- 2F 的筆記本列表、2G 的動畫、導覽、浮動記帳鈕都不變。
- 中文所有既有字串逐字不變；英文、日文的既有字串也不改。

---

## 4. 素材

### 4.1 G1：`event-return` 重生（Codex ImageGen）

- 規格：48×48 logical px 的 1× master，透明背景，風格對齊已推廣的 event 圖示（深色描邊、暖棕＋黃銅、金幣可以是亮金）。
- 語意：「餘額退回給每個人」。建議方向，至少 3 個候選，方向要彼此不同：
  1. 小寶箱打開，金幣沿著弧形箭頭飛出來，箭頭是黃銅色的造型、不是文字；
  2. 一疊金幣加上往回彎的黃銅箭頭；
  3. 小寶箱旁邊分出 2～3 小疊金幣。
- **不要錢袋**：要和 `event-contribution`、`event-shortfall` 明顯不同。
- 禁止：文字、數字、貨幣符號、手（Mimiku 或任何角色都不能有手）、Mimiku 本體、亮金的金屬配件（亮金只能出現在金幣）。
- 檢查：
  - 32 px 用 auto、48 px 用 pixelated 時都要能辨識；
  - 在 notebook 紙 `#ead7ac`、wood `#39271e`、任務卡底色上各看一次；
  - 和其他 event 圖示的輪廓相似度要低。

### 4.2 推廣（I1）

- `event-settlement`、`event-correction`、`event-return`（新）、`frame-wood` → `web/public/pixel-ui/v1/`。
- `assets:promote` 新增 `--phase-guild` 旗標。
- 推廣後更新 `production-asset-manifest.json` 的 disposition 與 SHA-256；`motion-timing.json` 不變。
- 舊的 `event-return.png` 被取代，處理方式比照 Phase 1 的取代慣例：舊檔留在審閱資料夾，manifest 指向新來源。

---

## 5. 字串（三語）

### 5.1 新增 key（只有 3 個）

| key | zh-TW | en | ja |
|---|---|---|---|
| `shared.list.correctedTo` | `已更正 {count} 次 · 更正後 <amount></amount>` | `Corrected {count, plural, one {once} other {# times}} · Now <amount></amount>` | `{count}回訂正済み · 訂正後 <amount></amount>` |
| `shared.list.correctedVoid` | `已更正 {count} 次 · 已作廢` | `Corrected {count, plural, one {once} other {# times}} · Voided` | `{count}回訂正済み · 無効` |
| `shared.list.correctionReason` | `最新更正原因：<reason></reason>` | `Latest reason: <reason></reason>` | `最新の訂正理由：<reason></reason>` |

- 術語對照：
  - 更正／Correction／訂正（2I-2 §6、用語集）；
  - 作廢沿用 `settlement.correction.void`（中文「作廢」、英文「Void」，日文「無効にする」→「無効」）；
  - 更正原因沿用 `settlement.correction.reason`；
  - 日文 ICU 複數只用 `other`，所以日文不用 plural（2I-b 規則）。
- 中文分隔號沿用既有的「 · 」。
- `messages.test.ts` 要通過：參數 `count`／`amount`／`reason` 三語一致。英文用 plural 的前例已經有了（`scheduleSummary` 等）。
- 其餘新增的都是裝飾圖示，**沒有新字串、沒有新 aria-label**。

### 5.2 日文審閱清單

整理在審閱資料夾的 `ja-strings-for-review.md`。之後如果還有新的日文字串，就累加在同一份，最後一次交給審閱者。

---

## 6. 像素回歸（三語，I1）

- 基線：`<2IB>` 的乾淨 worktree（`.tmp/`）production build；候選：I1 工作樹的 production build。
- 同一個 API、同一份測試資料、同一個 Chrome。整頁 RGBA，**容差 0**。
- 語言：用 cookie `mimic-locale` 切換 `zh-TW`、`en`、`ja`。
- 本輪沒有後端變更，所以只有 **A 組**：候選 web 與基線 web 接同一個基線 API。

**6.1 拍像素之前先比 DOM 文字節點**
- 用 `TreeWalker(document.body, SHOW_TEXT)` 依序記錄父元素路徑＋文字；
- 三語都要和基線相同，**唯一例外**是有更正的共同支出列多出的標示行，要逐條列出；
- 圖示是 `<img alt="">`，不會產生文字節點；
- 父元素路徑會因為包框而改變（例如多了一層 notebook section）。這要列成「預期路徑差異」，文字順序仍要相同。

**6.2 零差異頁（三語 × 6 種視窗）**
- 視窗：320×568、360×800、390×844、768×1024、1024×768、1440×900；
- 頁面：Landing、Home（ready／empty）、群組列表與群組詳細、設定、登入、註冊；
- 全部要逐像素相同。成對截圖不進 git，SHA-256 清單加每類一組 390×844 範例（2I 慣例）。

**6.3 預期差異頁**
- 頁面：個人、共同（含有／沒有更正的列）、基金（含結清與退回各狀態）、任務板（6 種 kind＋離線）；
- 彈窗至少開這些：個人支出、共同支出（含鎖定提示）、更正、開始結算、退回計畫、投入排程、刪除確認、群組離開；
- 證明方式：差異遮罩的 bounding box 要落在預期元素的 rect 內（摘要本子、公告板、圖示欄、更正行、彈窗）；
- 範圍外的差異列為停止點；
- 三語都要附 320／390／1440 的候選截圖給 Ed 視覺審閱。

**6.4 測試資料**
- 共同分帳：更正 1 次、2 次（最新原因很長）、作廢；corrections 超過一頁（用來驗證分頁）；
- 結算批次：PENDING、COMPLETED、CANCELED，加上自動完成；
- 退回：AWAITING_PAYMENT、SENT、COMPLETED；
- 任務：6 種 kind 各 1 筆；
- 日文最長字串要出現在 320 寬度。

**6.5 其他**
- Pillow 比對要轉成 RGB，或逐通道判斷（handoff 的陷阱）；
- 用 WSL Docker `node:22` 跑 CI 的五個 job，並驗兩個 web Dockerfile。

---

## 7. 停止點

1. G1 的候選有文字、數字、符號、手，或金屬配件用了亮金。
2. §3.5 的 `target_amount_minor` 不是更正後總額。
3. 任何語言、任何視窗出現截斷、溢出、水平捲動；日文漢字顯示成中文字形。
4. 公告板上的文字 < 4.5:1、焦點框或按鈕邊界 < 3:1，而且無法只在 `.board` 範圍內修正。
5. 摘要本子包框後，多欄斷點的內距不夠，需要新的斷點。
6. 彈窗在 320 寬度時，A 方案的內容寬度 < 200 px（要附 A／B 實測，等 Ed 在 G1 的選擇）。
7. 零差異頁出現任何像素差異，或 DOM 文字順序不同。
8. 需要改後端，或需要改 2I-b 範圍的檔案。

---

## 8. 交付

### 8.1 G1（現在）：`docs/design/assets/reviews/2026-11-19-phase-guild/g1/`

- `sources/`：ImageGen 原圖；
- `candidates/event-return-0{1..n}.png`：48×48；
- `review.html`：靜態頁，只引用 approved 素材與 candidates，文字寫在 HTML 裡、不進像素。內容：
  1. event-return 候選和其他 event 圖示並排比較：32 px（auto）、48 px（pixelated），分別放在 notebook 紙、wood、任務卡底色上；
  2. wood 公告板示意：frame-wood nine-slice，放 zh／en／ja 的結算批次樣稿（用現有字串）；
  3. 彈窗 A／B 示意：320 與 390 寬度，各排一個支出表單樣稿；
  4. 更正標示行示意（三語）。
- `verification.md`：尺寸、alpha、調色盤、禁止元素檢查、§3.1 的對比實測；
- `devlog-pending.md`：G1 期間**不寫** `.agents/devlog.md`，等 I1 時再合併。

### 8.2 I1（`<2IB>` 上線後）

到時由小德另外給 Codex 指令。spec 若有修正，以 2R 追加。

---

## 9. 範圍外，之後可以討論

- 基金的更正 UI（API 已經有，web 沒有）；轉帳更正（`source_transfer_id`）的顯示。
- `SharedLifecyclePanel`、基金參與者面板要不要也改成公告板。
- Mimiku `action-settlement` 的使用時機（會碰到 2G「結算不播動畫」的規則）。
- `frame-parchment`、`frame-stone` 的 consumer（法律頁 Frames 是候選）。
- 群組頁寶箱列表的 mode 圖示。

---

## 2R（2026-11-24）：G1 審閱結果，開放 I1

### 2R.1 基線
- 2I-b 已 commit 並 push：`5602d63` feat(api)、`ca3ae38` feat(web)、`11317ce` docs。origin＝`11317ce`。
- 小德 2026-11-24 確認 staging 帶 `mimic-locale=ja` 時回 `<html lang="ja">`。
- **`<2IB>` ＝ `11317ce`**。像素回歸的基線用 `11317ce` 的乾淨 worktree（`.tmp/guild-base-11317ce/`）。
- 術語改看 `docs/i18n/glossary.md`。

### 2R.2 Ed 的選擇
1. **event-return 用 02**（回彎箭頭＋一疊金幣），也就是 `g1/candidates/event-return-02.png`。
   - 推廣時取代 approved 的 `icons/ui/event-return.png`，manifest 的 `sources` 指向 G1 候選；
   - 舊檔保留在 approved 的歷史，或依 Phase 1 的取代慣例處理；
   - 01、03 留在審閱資料夾。
2. **彈窗框用 B**：
   - 視窗 < 48rem 時用 frame-notebook 的 1×：border-image slice 14、寬 14 px、內距 14 px；
   - ≥ 48rem 時用 2×（28 px 角，內距同 notebook 的 desktop）；
   - 彈窗在 top layer，所以用 `@media (min-width: 48rem)` 判斷，不用容器查詢；
   - 320 寬度時內容寬要 ≥ 232 px（實測）。
3. **公告板的 danger**：只在 `.board` 範圍內，底色改成 `#a52c35`（白字 6.97:1）。全站的 danger 不變。

### 2R.3 G1 已驗證、I1 直接採用
- 公告板的按鈕外框在 `.board` 範圍內覆寫成 `#b79556`（5.02:1）；
- disabled 用虛線 `#b79556`＋底 `#3a2c24`＋文字 `#bc9b65`（5.12:1），opacity 1；
- 焦點框：3px `#2f82d6`（3.56:1）＋2px `#f0dfc4`。

### 2R.4 小德的審閱備註
- 候選的部分透明像素（618–779）和色數（404–504）都在已推廣 event 圖示的範圍內（537–941、415–761），所以不構成品質退步。
- G1 樣稿裡的日文和中文狀態文字（例如「待確認」「確認待ち」）只是排版用；I1 一律用 `11317ce` 的正式字串。
- G1 時 Codex 讀過 `7bca944` 的歷史 messages，只讀未改；2I-b 已經上線，這條限制解除。

### 2R.5 字串
- §5.1 的三個 key 不變。
- 日文「作廢」採用「無効」，和 `settlement.correction.void` 的「この支出を無効にする」一致。
- I1 時在 `docs/i18n/glossary.md` 的「作廢」那一列補上日文「無効」。
- 審閱清單：`ja-strings-for-review.md`。

---

## 2R2（2026-11-24）：伺服器時間戳跨分鐘（技術停止點，小德判定）

### 事實（小德核對過）
- `i1/home-ready-ja-360x800-dom.json`：基線與候選各 30 個文字節點，**只有 1 個不同**。
  - 位置：`main:1/div:0/small:3/span:0`；
  - 內容：`2026-11-24 06:48 UTC` 對 `06:49 UTC`，父元素路徑相同；
  - 來源：Home 的 `common.asOf`，值是 API 回應的 `generated_at`（伺服器時間，`home-page.tsx:119`），每次請求都不同，精度到分鐘。
- 這不是 I1 造成的差異；停止前的 49 對都通過了。

### 處理規則
- 適用頁面：有伺服器生成時間的頁面，也就是 Home（`.space-home-generated`）和任務板（`.task-center__generated`）。
- 這兩頁的基線與候選要**成對連續擷取**：
  1. 開始一對之前，若現在的 UTC 秒數 ≥ 40，就等到下一分鐘的 :00 再開始；
  2. 擷取後比對 asOf 文字。不同的話，丟掉**整對**重拍，最多 3 次；
  3. 3 次都不同，才算 §7.7 停止點。
- 不遮罩、不改 DOM、不攔截 API。asOf 文字相同之後，DOM 與 RGBA 仍然容差 0。
- 任務板是預期差異頁，也要先讓 asOf 一致，再做 bbox 證明，避免時間戳的差異跑到 bbox 外面。
- 已經通過的 49 對保留；從 Home ready（ja 360×800）這一格繼續往下跑。

---

## 2R3（2026-11-24）：版面位移的 bbox 證明、移除金黃強調、參與者面板改公告板

### 2R3.1 事實（小德核對過 `i1/personal-zh-TW-320x568-2r2-*`）
- DOM 文字相同。整頁高 1473 → 1475；摘要 rect 是 485.42–799.20 → 485.42–801.20，**+2 px**。
- 小德自己量，RGB 容差 0：
  - 摘要上方 `y < 485`：零差異；
  - 摘要所在的列，`x < 32` 與 `x ≥ 288`：零差異；
  - 摘要內：bbox 是 (32, 0)–(288, 316)，完全在 rect 內；
  - 摘要下方：基線從 799／800／801 起算、候選往下位移 2 px，三種起點都**零差異**。
- 所以這是 §3.2 包框造成的版面位移。§6.3 原本的「bbox 落在 rect 內」沒有考慮下方內容會被推移，**規則本身不夠用，不是實作錯**。

### 2R3.2 取代 §6.3 的證明方式（小德判定）
預期差異頁從上到下，依序處理每個預期改變的元素 E，並累計位移 `Δ`：
1. E 上方（扣掉前面已處理的區域）在累計 `Δ` 下逐像素相同；
2. E 所在的列（基線與候選 rect 的上緣到兩者下緣較小值），E 的 rect 左右兩側逐像素相同；
3. 差異只能落在基線 rect 和候選 rect 的聯集內；
4. 處理完 E 之後，`Δ += 候選 E 高 − 基線 E 高`；
5. 最後一個元素下方到頁底，在累計 `Δ` 下逐像素相同，且頁高差＝`Δ`。

- **fixed 元素**（底部導覽、浮動記帳鈕、記帳小夥伴）在整頁截圖中不會跟著位移：
  - 先依 DOM rect 把它們從位移比對中挖掉；
  - 這些 rect 再另外做**不位移**的比對，必須逐像素相同；
  - 兩邊的捲動位置要一致，並寫在 verification 裡。
- 證據檔每頁一份 JSON：列出每個 E 的兩個 rect、`Δ`、每一步的 bbox。
- Pillow 要轉 RGB，或逐通道判斷。
- 2R3.3、2R3.4 會讓個人、基金、共同分帳頁的預期差異變多，這三頁的矩陣要**重跑**。已通過的 73 對裡不含這三頁的就保留。

### 2R3.3 筆記本內拿掉金黃強調（Ed 決定）
- 摘要包進筆記本後：
  - `.personal-total` 不再使用 `--mimic-color-coin` 底色；
  - `.pooled-balance-card--book` 不再使用 coin-action 邊；
  - 統一使用紙面與 notebook text。
- 重點只靠大金額的字級。這符合「亮金只給主要 CTA」。
- 只改筆記本內的樣式，class 和 `data-testid` 不變。

### 2R3.4 參與者面板改公告板（Ed 決定）
- `SharedLifecyclePanel` 和基金的參與者 `PixelPanel` 改成 wood 公告板，套用 §3.1、2R.2-3、2R.3 的 `.board` 規則。
- 參與者每列之間用 board-rule 虛線。**不加圖示**，因為沒有對應的素材。
- 公告板上的 `select.pixel-field__input`：
  - 原本 `#211a18` 的邊在 `#39271e` 上只有 1.21:1，所以在 `.board` 內把邊改成 `#b79556`；
  - 輸入框仍是淺色底、深色字；
  - 標籤文字用 `--mimic-color-board-text`。
- Codex 要量：輸入框邊 ≥ 3:1、標籤 ≥ 4.5:1、焦點框 ≥ 3:1。
- 封存、離開按鈕套用公告板的 danger／secondary 規則。封存確認仍是 `PixelDialog`（notebook）。
- 字串完全不變。

---

## 2R4（2026-11-24）：fixed 元素的陰影與雙座標挖除（技術停止點，小德判定）

### 事實（小德用 `i1/personal-zh-TW-390x844-2r3-*` 重算，RGB 容差 0）
- 浮動記帳鈕 `.quickAction` 有 `box-shadow: 4px 4px 0 #211a18`，所以它實際畫出的範圍比 DOM rect 多出右側 4 px、下方 4 px。2R3.2 只依 DOM rect 挖除，陰影就留在位移比對裡。這 316 個像素和 Codex 報告的一致。
- 另外，fixed 元素在候選圖裡的位置，換算到基線座標時要減掉 `Δ`。只用基線座標挖除的話，底部導覽上緣在位移比對中會多出 2 列差異。
- 照下面的規則重算後：
  - 位移比對剩餘差異 **0**；
  - 擴張後的浮動鈕 rect 不位移比對 **0**；
  - 底部導覽 rect 不位移比對 **0**。
- 這是 2R3.2 的規則缺口，**不是實作問題**。

### 補充到 2R3.2 的 fixed 元素規則
1. 挖除範圍＝DOM rect 加上它的繪製外溢範圍：
   - 依 `getComputedStyle` 算出 `box-shadow`（offset、blur、spread，每一層都算）和 `outline`（width＋offset）的外溢；
   - 每一邊取最大值往外擴；
   - 擴張後的 rect 和算法都寫進證據 JSON。
2. 位移比對時，一個像素只要落在基線的挖除範圍內，或落在候選挖除範圍往上平移 `Δ` 之後的位置內，就不納入比對。
3. 擴張後的挖除範圍再做不位移比對，必須逐像素相同（兩邊捲動位置一致）。
4. 已通過的 90 對不用重跑：它們本來就是零差異或已通過位移比對，放寬挖除範圍不會讓結果變差。個人頁 390×844 用新規則重判後繼續。

---

## 2R5（2026-11-24）：sticky 元素比照 fixed（技術停止點，小德判定）

### 事實（小德用 `i1/personal-zh-TW-768x1024-2r4-*` 重算，RGB 容差 0）
- 桌機側欄 `.navigation[data-variant="desktop"]` 的樣式是 `position: sticky; top: var(--mimic-app-top-bar-height); height: calc(100dvh − top bar)`。
- 整頁截圖時捲動位置是 0，所以側欄底緣固定在 y=1024，不會隨內容位移。它的行為和 fixed 元素一樣。
- 側欄欄位 x∈[0,240)：
  - y < 1024 不位移比對：差異 **0**；
  - y ≥ 1024 位移 Δ=2 比對：差異 **0**；
  - 480 個差異像素（[0,240)×[1022,1024)）就是側欄底緣（`#211a18` 對 `#fffaf0`），在位移比對時被錯位。
- 這是 2R4 只涵蓋 fixed 元素的缺口，**不是實作問題**。

### 規則補充
- 2R4 的 fixed 元素規則，擴大到所有 computed `position` 是 `fixed` **或 `sticky`** 的元素，包括 `.topBar` 和桌機的 `.navigation`。挖除範圍、雙座標排除、不位移比對的做法都相同。
- 「sticky 的實際畫面位置不隨 Δ 移動」只在捲動位置一致時成立，所以證據 JSON 要記錄兩邊的捲動位置。
- 已通過的 100 對保留。個人頁 768×1024 用新規則重判後繼續。

---

## 2R6（2026-11-24）：繪製範圍用矩形聯集，不用外接矩形（技術停止點，小德判定）

### 事實（小德用 `i1/personal-zh-TW-1440x900-2r5-*` 重算，RGB 容差 0）
- 頁高 1035 → 1091，`Δ=56`。
- 浮動鈕的 DOM rect 是 (1266,828)–(1424,876)，陰影 `4px 4px 0`。2R4 的擴張外接矩形是 (1266,828)–(1428,880)，左下角 [1266,1270)×[876,880) 不在按鈕或陰影的繪製範圍內，那裡露出的是隨 Δ 位移的頁面內容。
  - 角落不位移比對：16 px 不同（例如 `#6fb7df` 對 `#eb6f28`）；
  - 同一角落位移 Δ 比對：**0**；
  - 改用「DOM rect ∪ 陰影 rect」的聯集做不位移比對：**0**。
- 這是 2R4 用外接矩形的缺口，**不是實作問題**。

### 規則修正（取代 2R4 第 1 點的「每一邊取最大值往外擴」）
- 繪製範圍＝下面這些矩形的**聯集**，不是外接矩形：
  - DOM rect；
  - 每一層非 inset 陰影的矩形：DOM rect 平移 (x, y)，再往外擴 `spread＋ceil(1.5×blur)`；
  - 可見 outline 的矩形：DOM rect 往外擴 `width＋offset`。
- 位移比對時，用這個聯集遮罩做雙座標排除；不位移比對也只比聯集遮罩內的像素。
- 證據 JSON 要列出每個成員矩形。
- 已通過的 112 對保留：用外接矩形時是零差異，改用聯集（較小的不位移比對範圍）一定也是零差異。位移比對多納入的角落像素，Codex 要用新規則重判，依小德的重算應該也是 0。個人頁 1440×900 用新規則重判後繼續。

---

## 2R7（2026-11-24）：位移後的光柵化微差，改用「墊高對照」基線（技術停止點，小德判定）

### 事實（小德用 `i1/personal-en-1440x900-2r6-*` 重算）
- 頁高 1023 → 1079，`Δ=56`；摘要的 rect 是 370.23–545.23 → 370.23–601.23。英文浮動鈕較寬，left 1229.48。
- 摘要下方位移後比對，排除 fixed／sticky 聯集之後，剩 9 個像素：[1142,1296)×[763,765)。
- 這 9 個像素**每個只有一個通道差 1**，例如 `(30,27,32)` 對 `(30,27,31)`、`(25,30,47)` 對 `(25,31,48)`，都在 hud-dark 和海軍藍交界的抗鋸齒邊緣，前後幾列完全相同。
- 判斷：內容整體平移 56 px（不是 256 的倍數）後，相對 raster tile 的位置改變，抗鋸齒捨入差 1。這不是樣式或 DOM 的差異，**不是實作問題**；但容差 0 的規則不能直接放寬。

### 規則：墊高對照（取代 2R3.2 第 5 點的「位移比對」參照）
1. 在**基線** build 上另外拍一張「墊高對照」：
   - 由擷取腳本，在每個預期改變的元素 E 上設 inline `margin-bottom`＝原值＋（候選 E 高 − 基線 E 高）；
   - 這只是量測用的操作，不是產品程式碼。
2. 對照圖的 E 下緣、頁高、fixed／sticky 位置都要和候選相同（差 0 px），否則停止。
3. E 下方到頁底：**對照圖和候選圖用同一個座標比對，不位移**，容差 0。fixed／sticky 聯集照 2R4–2R6 處理（此時 Δ＝0）。
4. E 上方、E 兩側：仍和未墊高的原始基線比對，容差 0（2R3.2 第 1、2 點不變）。
5. 證據 JSON 同時記錄：原始位移比對的結果（僅供參考）、對照圖的 rect／頁高、對照圖與候選的比對結果。
6. 對照圖和候選圖之間仍有差異的話，就是 §7.7 停止點。

- 已通過的 128 對保留：它們在原始位移比對就是 0，墊高對照只會更嚴格對齊。英文個人頁 1440×900 用墊高對照重判後繼續。
- 之後所有 Δ≠0 的配對（基金、共同、任務板等）一律用墊高對照，不再用位移比對。

---

## 2R8（2026-11-24）：fixed 遮罩和預期改變元素重疊的部分歸給該元素（技術停止點，小德判定）

### 事實（小德用 `i1/personal-ja-320x568-2r7-{control,candidate}.png` 重算）
- 墊高對照的對齊條件全部成立：頁高 1475＝1475、捲動 (0,0)、fixed 位置相同；flow 區比對 0。
- 3 個差異像素在 x=153、y=485–487：
  - 浮動鈕的陰影 rect 左緣有小數，取 floor 後包含 x=153；但實際的陰影從 x=154 才開始畫（候選和對照的 x=154 都是 `#211a18`）；
  - y=485–487 同時落在摘要 E 的 rect 內（top 485.42）。所以 x=153 露出的是 E 本身：候選是筆記本框 `(138,90,53)`，對照是舊面板 `(217,199,168)`。這屬於 §3.2 的預期改變。
- x ≥ 154 的陰影、按鈕本體：候選和對照逐像素相同。
- 這是 fixed 遮罩和 E 重疊時的歸屬問題，**不是實作問題**。

### 規則
1. fixed／sticky 聯集裡，落在任何一個 E rect 內的像素（基線、對照、候選三種 rect 的聯集，邊緣 floor／ceil 取寬），從 fixed 的不位移比對中排除，改算作 E 的預期差異區。
2. fixed 聯集扣掉 E 之後的部分，仍要逐像素相同。
3. 證據 JSON 要記錄 fixed∩E 的重疊範圍與像素數。如果重疊超過 fixed 聯集面積的 25%，fixed 本身幾乎沒有被驗到，就停下回報。
4. 已通過的 139 對保留。日文個人頁 320×568 用新規則重判後繼續。

---

## 2R9（2026-11-24）：重疊門檻改成逐元素計算，超過時補拍「最大捲動」視窗截圖（技術停止點，小德判定）

### 事實（小德拆解 `i1/personal-ja-320x568-2r8-replay.json`）
- 重疊共 18,837 px，其中：
  - **底部導覽**：rect (0,496)–(320,568)＝23,040 px，與摘要 E（x 32–288，y ≥ 485.42）重疊 256×72＝18,432 px，佔導覽的 **80%**；
  - **浮動鈕**：重疊 405 px，只佔它的一小部分。
- 320×568 的視窗很矮，捲動位置為 0 時，底部導覽整條都壓在摘要上，所以這一對截圖幾乎驗不到導覽。2R8 的保險起了作用，但用「整個聯集」計算門檻太粗。
- 扣掉重疊後的比對結果是 0，**不是實作問題**。

### 規則（取代 2R8 第 3 點）
1. 重疊門檻**逐個 fixed／sticky 元素**計算：該元素的遮罩和 E 重疊超過 25% 時，就要補驗。
2. 補驗方式：
   - 對照圖和候選圖各補拍一張**視窗截圖**（不是整頁），捲動到 `scrollY = 頁高 − 視窗高`（兩邊頁高相同，捲動值也就相同）；
   - 在這個位置，所有 E 的 rect 都必須在視窗外，或者沒有和任何 fixed／sticky 遮罩重疊；
   - 整張視窗截圖逐像素比對，容差 0（還在視窗內的 E 照 2R7 處理）。
3. 最大捲動位置仍然有重疊（例如 E 一直延伸到頁底）時，停下回報。
4. 證據 JSON 記錄：每個元素的重疊比例、補拍的捲動值、補拍的比對結果。
5. 已通過的 139 對保留。日文個人頁 320×568 補拍最大捲動截圖後重判（頁高 1475、視窗 568，scrollY＝907；摘要下緣 801 在視窗上方，不會和導覽重疊）。

---

## 2R10（2026-11-24）：補拍只要求「超過門檻的元素」離開 E（技術停止點，小德判定）

### 事實（小德讀 `i1/personal-2r9-evidence.json` 的 `personal-ja-360x800`）
- 捲動位置 0 的原始整頁截圖：
  - 頂欄重疊 **0%**，已完整驗證、零差異；
  - 浮動鈕重疊 87.6%、底部導覽重疊 60.5%，兩者超過門檻。
- 捲到最大值（602）補拍時：
  - 浮動鈕和底部導覽都離開摘要，正好可以驗它們；
  - 黏性頂欄改成壓在摘要上（82%）。
- 2R9 要求補拍時「所有 fixed／sticky 都不能和 E 重疊」，條件太嚴：頂欄在捲動位置 0 已經驗過了，不需要在補拍裡再驗一次。
- 這是規則問題，**不是實作問題**，也**沒有放寬驗證**：每個元素仍要在某一張截圖裡被逐像素驗到。

### 規則（取代 2R9 第 2、3 點）
1. **每個 fixed／sticky 元素都必須至少在一張截圖裡**「與 E 的重疊 ≤ 25%，且扣掉重疊後逐像素相同」。原始整頁截圖已經滿足的元素，就不用補拍。
2. 補拍的捲動位置，依序嘗試：最大捲動、0、再以視窗高的一半為間隔掃描。選第一個讓**所有尚未驗到的元素**重疊都 ≤ 25% 的位置。
3. 補拍的視窗截圖裡：
   - 已經驗過的元素若和 E 重疊，重疊部分照 2R8 歸給 E；
   - 畫面中的 E 照 2R7 處理（E 範圍內允許差異）；
   - 其餘像素一律容差 0。
4. 所有捲動位置都找不到時，才停下回報。
5. 證據 JSON 用一張表記錄每個元素：在哪一張截圖（含捲動值）被驗到、重疊比例、比對結果。
6. 已通過的 144 對保留。日文個人頁 360×800 補拍後重判（頂欄在捲動 0 已驗；浮動鈕和導覽在捲動 602 驗）。

---

## 2R11（2026-11-24）：基線本身橫向溢出的格位，改用 DOM＋目視（Ed 決定）

### 事實（小德核對 `i1/shared-zh-TW-320x568-2r10-*`）
- 截圖寬度：基線 **378**×1441、墊高對照 378×1695、候選 **320**×1695。
- 基線在 x 320–377、y 194–1292 都有內容，例如筆記本紙色 `#ead7ac`、金色按鈕：**整個內容欄被撐到 378 px**。也就是說，`11317ce`（staging 現況）的共同分帳頁在 320 寬時本來就會橫向溢出。
- 候選沒有溢出。I1 改了摘要和公告板（含 2R3.4 的生命週期面板），整頁因此重新排版，同座標的逐像素證明在這一格不成立。
- **這是既有 bug，I1 順便修好了**，不是 I1 造成的回歸。

### 規則（Ed 2026-11-24 決定）
1. 適用範圍：基線整頁截圖寬度 > 視窗寬度（`document.scrollingElement.scrollWidth > innerWidth`）的格位。所有頁面、語言、寬度都要先量。
2. 這些格位不做逐像素證明，改驗：
   - DOM 文字節點的順序與內容和基線相同（路徑差異照 §6.1 列出）；
   - 候選的 `scrollWidth`＝視窗寬度，沒有橫向溢出；
   - fixed／sticky 元素在候選的捲動位置 0 截圖中，扣掉和 E 的重疊後，和基線的同一元素逐像素相同。用視窗截圖、捲動 (0,0)，只比各元素的繪製遮罩；如果基線溢出讓 fixed 位置不同，就記錄下來並跳過這一項；
   - 三語候選整頁截圖交給 Ed 目視，列在 verification 的「2R11 目視清單」。
3. **找出成因**：在基線 build 上，量出寬度超過內容欄的元素（逐一比對 `getBoundingClientRect().right` 與 `scrollWidth`），把元素路徑、寬度、原因（例如不換行的文字、`min-width`、按鈕列）記進 verification，並說明候選為什麼不再溢出。
4. 列出所有受影響的格位（頁面 × 語言 × 寬度）。如果某個格位是**候選**溢出、基線沒有，那是 §7.3 停止點。
5. 這是既有 bug，I1 順便修好。decision-log 要記一筆「staging `11317ce` 共同分帳頁在 320 px 會橫向溢出，公會 I1 修正」。
6. 其他格位維持 2R7–2R10 的逐像素證明，不受影響。

---

## 2R12（2026-11-24）：E 以外一律和墊高對照比；墊高量用小數；對齊檢查要累計（技術停止點，小德判定）

### 事實（小德用 `i1/shared-zh-TW-390x844-2r11-{base,control,candidate}.png` 重算）
1. **摘要上方的 49 px**：都在 y=66，x=2、10、18…（間隔 8 px），G 通道差 1（232 對 233）。
   - 原始基線（頁高 1441）和候選（1637）不同；**墊高對照（1637）和候選在這一列 0 差異**；
   - 頁面背景的繪製隨頁高改變，不是 I1 改到的內容。
2. **對齊判定**：證據裡的 `effectiveBottom` 是 `raw.bottom＋adjustment`，**沒有加上前面元素的累計位移**。
   - E2：700＋64＝764，但前面 E1 已經往下推了 2 px，正確值是 766，和候選相同；
   - E3：1293＋2＋64＋130＝1489，和候選相同；
   - 對照圖頁高 1637＝候選。實際對照圖是對齊的，錯的是檢查公式。
3. 小德照 1、2 的方式直接比對照圖和候選（排除三個 E 的候選 rect、fixed 遮罩、頂欄），只剩 **8 px**：
   - 位置是「新增共同支出」按鈕的四個圓角（x 62–63／326–327，y 876–877／921–922），各通道差 1；
   - 原因：墊高量取了整數（例如 64、130），E 的實際高度有小數，後面內容的次像素位置差了不到 1 px，圓角抗鋸齒就不同。
- 三項都是比對方法的問題，**不是實作問題**，也沒有放寬驗證。

### 規則（修正 2R7）
1. **E 以外的所有像素（包括 E 上方、兩側、之間、下方）一律和墊高對照比**，不再和原始基線比。原始基線只用來：取得 E 的基線 rect、比 DOM 文字、記錄參考數字。
2. 墊高量用 `getBoundingClientRect().height` 的**原始小數差**，不要四捨五入；inline 寫成 `calc(<原 margin-bottom> + <小數>px)`。
3. 對齊檢查：
   - 依文件順序計算累計位移，比較對照圖和候選中**每個 E 的 top、bottom，以及最後一個 E 後面第一個 flow 元素的 top**；
   - 誤差 ≤ 1/64 px（一個 LayoutUnit）才算對齊；
   - 頁高要相同。
4. 對齊後，E 以外的區域容差 0。仍有差異就停下。
5. 已通過的 144 對保留。共同分帳 390×844 用新規則重拍墊高對照後重判；之前做過的個人頁 Δ≠0 格位不用重做（它們在舊規則下已經是 0）。

---

## 2R13（2026-11-24）：先改用軟體繪製；仍有差異才容許抗鋸齒 ±1（Ed 決定）

### 事實
- 依 2R12 重拍後：共同分帳 390×844 三個 E 的上下緣誤差 0、頁高 1637＝1637；y=66 的差異歸零；fixed／sticky 0。
- 剩 8 px：「新增共同支出」按鈕的四個圓角，RGB 各差 1。墊高量是 DOM 原始小數。
- 小德看了工作樹的 diff（`globals.css`、`pixel-notebook.tsx`），I1 沒有改這個按鈕或它所在筆記本的樣式。判斷是頁面上其他區塊改變後，瀏覽器的繪製圖層和 tile 切法不同，抗鋸齒捨入因此改變。

### 規則（Ed 2026-11-24 決定）
1. **第一步：軟體繪製**
   - 對照與候選都改用固定的軟體光柵化重拍：Chromium 加上 `--disable-gpu`、`--disable-gpu-rasterization`、`--disable-partial-raster`、`--force-color-profile=srgb`、`--disable-lcd-text`，兩邊旗標完全相同，並寫進 verification；
   - 先用共同分帳 390×844 試：E 以外歸零，就**維持容差 0**，之後所有預期差異頁都用這組旗標；
   - 換旗標後，已通過的零差異矩陣不用重跑（那些是同一旗標下的成對比較）。但之後新拍的配對，兩邊一律用同一組旗標。
2. **第二步：只有第一步仍有差異時，才容許抗鋸齒 ±1**，條件全部要成立：
   - 只限 E 以外、fixed 遮罩以外的像素；
   - 每個通道的差 ≤ 1；
   - 該像素在墊高對照中是**邊緣像素**：3×3 鄰域內至少有一個像素和它的 RGB 不同（平坦色塊上的差異不算邊緣，一律停止）；
   - 每一對截圖最多 64 個這樣的像素；
   - 證據 JSON 逐點列出座標、兩邊 RGB、鄰域判定；verification 標出用了 ±1 的格位與總數；
   - 任何一項不成立就停下。
3. 零差異頁（§6.2）**一律維持容差 0**，不適用 ±1。
4. 已通過的 144 對保留。

---

## 2R14（2026-11-24）：E 變矮時不用負 margin，改墊高較矮的一方（技術停止點，小德判定）

### 事實（小德讀 `i1/pooled-2r13-evidence.json`）
- 基金 320×568 的摘要 E1：基線高 572（194–766），候選高 498（194–692），**Δ＝−74**。
- 墊高對照在基線的 E1 上設了 `margin-bottom: -74px`。版面雖然對齊了（有效下緣 692），但**基線 E1 的內容仍然畫到 766**，蓋在往上拉的後續內容上。692–766 這一段在對照圖裡是兩者重疊，在候選裡只有後續內容，所以產生 21,294 px 差異，包括整片底色。
- 這是 2R7 只考慮「E 變高」的缺口，**不是實作問題**。

### 規則（修正 2R7／2R12）
1. **永遠不用負 margin**。對每個 E：哪一方比較矮，就在那一方的 E 上把 `margin-bottom` 墊高 `|Δ|`（用小數）。
   - 基線較矮：墊基線（和原本一樣）；
   - 候選較矮：墊**候選**。這也只是擷取腳本的量測操作，不改產品程式。
2. 於是會得到「墊高基線」和「墊高候選」兩張圖（某一方完全不用墊時，就是原圖）。兩張頁高必須相同，每個 E 的 top 誤差 ≤ 1/64 px。
3. E 的比對區域＝`[top, max(基線 E 下緣, 候選 E 下緣))`，左右照 E 的 rect。墊出來的空白算在 E 裡面（預期差異）。
4. E 以外：「墊高基線」和「墊高候選」同座標比對，容差 0（照 2R13 用軟體繪製旗標；必要時套用 2R13 第二步的 ±1）。fixed／sticky 照 2R4–2R10、2R8。
5. 視覺審核用的候選截圖一律是**沒有墊高**的原圖。
6. 已通過的格位保留，因為它們都是「E 變高」的情況，原本的做法就是這條規則的特例。基金 320×568 用新規則重拍後重判。

---

## 2R15（2026-11-24）：E 的比對區域也要包含它自己的陰影（技術停止點，小德判定）

### 事實（小德用 `i1/tasks-zh-TW-320x568-2r14-{control,paddedCandidate}.png` 重算）
- 任務卡 `.task-card` 有 `box-shadow: 5px 5px 0 var(--mimic-color-line)`，畫出來的範圍是卡片 DOM rect 往右、往下各多 5 px。
- 6 張卡（E1–E6）在墊高後已經對齊（頁高 2146＝2146）。不過墊高是加在 margin 上，**陰影只跟著較高那一方的卡片下緣走**：卡片變高時，基線的陰影畫在墊出來的空白上緣，候選的陰影畫在更下面。所以陰影那 5 px 帶狀區會不同。
- 7,070 px 的 bbox 是 (37,815)–(293,1946)，正好是卡片 rect 加上 (5,5) 的範圍。
- 小德把每個 E 的區域改成「`[top, max(兩方下緣))` 再往右、往下擴陰影的 5 px」，加上 fixed／sticky 遮罩後重算：**E 外差異 0**。
- 這是 2R6 的「繪製範圍」規則只用在 fixed 元素、沒套用到 E 的缺口，**不是實作問題**。

### 規則（補充 2R14 第 3 點）
- E 的比對區域＝2R14 的 `[top, max(兩方 E 下緣))` × E 的左右範圍，再聯集上兩方 E 各自的繪製外溢（每一層非 inset 的 `box-shadow`、可見的 `outline`，算法同 2R6，用 `getComputedStyle`，兩方都算）。
- 證據 JSON 列出每個 E 的外溢成員矩形。
- 已通過的格位保留：外溢區只會讓 E 的比對區域變大，原本是 0 的仍然是 0。任務板 320×568 用新規則重判後繼續。

---

## 2R16（2026-11-25）：視覺審核結果與兩項修正（Ed 決定）

### Ed 的審核（2026-11-25）
- **整體核准**：紙面摘要、筆記本彈窗、wood 公告板、任務板圖示、表單鎖定／離線圖示、更正標示的內容與三語字串。修完下面兩點即可。
- 小德審閱時核對過：
  - 4 個推廣素材的 SHA-256 在 approved、`web/public` 兩處一致，`event-return` 就是 G1 的 02；manifest 已推廣 86／134；
  - 三語訊息檔都只新增 §5.1 的 3 個 key，既有 767 個 key 逐字不變；
  - 更正標示用 `target_amount_minor`，已對照後端 `shared-corrections.service.ts` 確認是更正後總額；
  - corrections 已沿著 `next_cursor` 讀到結束，並有重複 cursor 防護；
  - `backend/` 沒有變更。

### 修正 1：基金摘要拿掉舊的量條裝飾
- `.pooled-balance-card::after`（4px 灰條，`right:.5rem; bottom:.5rem; width:28%`）包進筆記本後成了殘留物，而且在 ja 390×844「使える残高」的說明行壓到文字（「差し引いた額」）。
- 在 `.summary-notebook` 內把它拿掉（`content: none`）。筆記本外沒有其他 consumer，但仍只限定在 `.summary-notebook` 範圍內。

### 修正 2：更正標示的圖示放在左側
- 現在 `notebook-lock` 沒有版面規則，所以 32 px 圖示自成一行，文字在下面。
- 改成 flex：`align-items: start; gap: .5rem`。圖示在左、不縮放；右側是兩行文字（`min-width: 0`，可以換行）；圖示上緣和第一行文字對齊。
- 只改更正標示的 class，不影響 personal 的 lock badge。

### 審閱資料夾瘦身（commit 前）
- 目前 `i1/` 約 48 MB。下面這些移到 `.tmp/guild-pixel-archive/`，**不 commit**，在 `pixel-regression-sha256.txt` 留 SHA-256：
  - 所有 `*-base.png`、`*-control.png`、`*-paddedCandidate.png`；
  - 被後續 2R 取代的中間候選圖（例如 `*-2r2-*`～`*-2r14-*` 中，同一格位已經有更新版的）。
- 保留：每個格位最後一版的候選截圖、證據 JSON、`verification.md`、彈窗索引、`2R11` 目視清單用的 6 張圖、每類一組 390×844 範例。
- 目標 ≤ 30 MB；超過的話列出前 20 大檔案再停下。
- `i1/decision-log.md` 的內容要併進權威的 `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/decision-log.md`（由小德在 commit 時處理），之後從審閱資料夾刪除。

### 修正輪的回歸
- 修改前，先把目前 I1 候選的 production build 保存到 `.tmp/guild-i1-r1-build/`，當作「修正前」的基線。
- 修正後和修正前比較（軟體繪製旗標、三語、§6 的寬度）：
  - 只有基金摘要本子、共同分帳的更正標示行可以不同；套用 2R14／2R15 的 E 規則；
  - 其他頁面、所有彈窗：逐像素相同；
  - DOM 文字：除了修正 1 拿掉的偽元素（不是文字節點）以外，完全相同。
- 三語候選截圖：基金 320／390／1440、共同分帳更正 320／390／1440，覆蓋舊檔。
- 用 WSL Docker `node:22` 跑 CI 五個 job。

---

## 2R17（2026-11-25）：E 的比對區域納入文字字形的外溢（技術停止點，小德判定）

### 事實（小德用 `.tmp/guild-i1/2r16-captures/shared-corrections-en-320x568-2r16-{control,paddedCandidate}.png` 重算）
- E＝更正標示容器，rect left＝110。差異像素在 (109,1833)。
- 修正前（control）這一列是 "Voided" 的 **V**：V 的左上斜筆抗鋸齒畫到 x=109，像素值 `(203,184,146)`，下一欄 x=110 是 `(98,78,60)`；修正後文字移到圖示右側，x=109 是紙色 `(234,215,172)`。
- 這是字形墨跡超出文字盒（左側 bearing 為負）。V、W、斜體、部分 CJK 標點都會這樣，CSS 的 box 量不到。
- 這是 2R15 的外溢只算 box-shadow／outline、沒算文字的缺口，**不是實作問題**，也沒有放寬：差異仍然必須落在 E 自己的文字附近。

### 規則（補充 2R15）
- E 的比對區域，再聯集「E 內每個文字節點用 `Range.getClientRects()` 量出的每個矩形，四邊各往外擴 2 px」（兩方都算，用各自擷取時的 DOM）。
- 擴張只針對 E 內的文字；E 以外的文字不擴。
- 證據 JSON 記錄文字外溢的矩形數量，以及落在「擴張帶」內的差異像素數與座標。
- 已通過的格位保留：E 區域只會變大，原本是 0 的仍是 0。英文共同分帳更正 320×568 重判後繼續。

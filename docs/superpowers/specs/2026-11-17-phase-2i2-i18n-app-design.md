# Phase 2I-2：App 內頁多語系＋後端分類名稱（中／英）

日期：2026-11-17。狀態：**待 Codex 實作**。

依據：2I-1 已核准並 commit（`fc9f820`、`d7cee7a`），`main` = `origin/main` = `d7cee7a`。2026-11-17 小德確認 staging 沒有 cookie 時是 `lang="zh-Hant"`，帶 `mimic-locale=en` 時是 `lang="en"`。

上層規格是 `docs/superpowers/specs/2026-11-16-phase-2i-i18n-design.md`（以下稱「2I spec」）。本規格沿用它的 §1、§1.1、§2（架構）、§4（語氣與長度規則）、§6（術語表），以及 2R–2R5。

**為什麼另開新檔**：2I spec 在 decision-log 已經記了 SHA-256（`79e63b96…`）。如果追加內容，核准紀錄裡的 hash 就會失效，所以 2I-2 另開本檔。2I spec 的 §9 大綱以本檔為準。

## 0. 範圍與部署

| 部分 | 內容 | 部署 |
|---|---|---|
| web | §3 列的所有 App 內頁檔案進訊息檔；`formatMinorUnit` 的 11 個呼叫點改用 `useFormatMoney`；邀請到期時間依語言格式化；`no-hardcoded-copy` 擴到整個 `web/src`；英文版面處理（§4） | 第一次 push（web＋docs） |
| 後端 | taxonomy 依 `users.locale` 回傳；Home `recent_categories` 改用本地化名稱；`PATCH /me` 驗證 locale（§5） | 第二次 push |

- API **欄位不變**，只有部分欄位的**內容**會變（§5.4），所以新 web 接舊 API、舊 web 接新 API 都可以運作。
- 仍依 Ed 的要求分兩次 push：web 先，後端後。
- **一輪做完，不再拆分**（Ed 2026-11-17 決定）。

## 1. Ed 的決定（2026-11-17）

1. **新術語用遊戲風**（§6）：
   - 參與者 Participant；寶箱管理者 Keeper；
   - 目前位置 Your position；應收 You're owed；應付 You owe；已結清 Settled up；
   - 結算批次 Settlement round；
   - 帳面餘額 Ledger balance；可用餘額 Available balance；待付代墊 Fronted, unpaid；
   - 私人參照 Ledger link；群組治理 Party admin。
2. **Home 的 Mimiku 台詞用 2I spec §6.4 的草稿**，不再修改。
3. **Home 情境分頁在英文用短名**：Personal／Shared／Fund。其他位置仍用全名（§6.2）。
4. **一輪做完**：web 全部範圍加後端，不再拆成 2I-2a／2I-2b。

## 2. 審閱者決定（附理由）

1. **中文逐字不變**。§3 裡原本是中文的字串，zh-TW 訊息要與現在的字元完全相同，包括全形標點、`·`、`→`、`（）`、空白。
   - 理由：Home、三種寶箱頁、任務頁要逐像素相同（§8）。
   - 例外只有兩處，都是會讓使用者看到開發者用語的錯誤，而且只出現在彈窗或群組頁，不在像素回歸的整頁範圍內：
     - `settlement-panel.tsx`「截止日由 backend 推導連續期間並快照支出、位置與更正。」改為「截止日之前的支出、位置與更正會被快照，這段期間隨即鎖定。」／"Expenses, positions and corrections up to the cutoff are snapshotted, and that period is locked."；
     - `leave-group-dialog.tsx` "NestJS will reject departure until reconciliation rules are satisfied." 改為「還有未結清的款項時，不能離開群組。」／"You can't leave while balances are still open."
2. **頁首 eyebrow**：
   - 中文維持現狀，包括中英並列的 `PERSONAL EXPENSES · 個人記帳`，以及純英文的 `CONTRIBUTION TRAIL`、`FUND SPENDING`、`PARTICIPANTS`、`CLOSE THE VAULT`、`SETTLEMENT TRAIL`、`QUEST BOARD`；
   - 英文版去掉重複的部分並對齊術語表（§6.6）。
   - 理由：這些是裝飾性的英文小標，不是 2I-1 決策 4 所說「寫死英文的頁面內容」；而且它們在像素回歸的頁面裡。
   - 2I-1 決策 4 仍然適用於群組與邀請：這些頁面寫死的英文，在中文版改成中文。
3. **清單分隔符**：用訊息 key `common.listSeparator`（`、`／`, `），不用 `Intl.ListFormat`。
   - 理由：實測 zh-TW 的 `Intl.ListFormat` 會產生「A、B和C」，與現在的 `、` 串接不同，會破壞像素。
   - 「名字＋金額」這類片段改成 ICU 訊息，例如 `{name} {amount}`，不用模板字串拼接。
4. **英文斷字**：
   - 現有的 `overflow-wrap:anywhere` 保留（防止溢出）；
   - 在 `:lang(en)` 下，對同樣這些容器加 `hyphens:auto`，讓長字優先在音節處加連字號斷開，不要在任意字母處硬切。
   - 只加在 `:lang(en)` 選擇器裡，中文的計算結果不變。
   - 審閱時特別看斷字。`hyphens:auto` 處理不了的長字（例如術語），改用較短的譯法，不要改字級。
5. **邀請到期時間**：
   - 改成 `Intl.DateTimeFormat(intlLocale(locale), { dateStyle: 'medium', timeStyle: 'short' })`；
   - 中文顯示「到期：{time}」，英文顯示 "Expires {time}"；
   - 時區沿用瀏覽器（與現在相同）。其他日期仍是 ISO（2I spec §1.1-4）。
6. **群組類型**：`Couple`／`Group` 的中文是「雙人」「多人」，英文是 "Duo"／"Party"。只改顯示文字，值（`couple`／`group`）不變。
7. **「寶庫」「treasury」改成術語表用語**：
   - `group-switcher.tsx` 的 `aria-label` 改成「選擇群組」／"Choose a party"。這個元件目前沒有被任何檔案 import，不影響畫面；
   - groups 頁的 treasury 系列英文改成 chest／party 用語。
8. **系統分類沒有對應語言的翻譯時**（例如之後的 `ja`），沿用 `term.name`，也就是現行行為。理由：2I-b 再補 `ja` 翻譯。
9. **`users.locale` 的值不在 `['zh-TW','en','ja']` 內時**（以前 `PATCH /me` 沒有驗證，可能存了其他值），後端在讀取時當作 `zh-TW`，不做資料 migration。
10. **e2e 依賴的英文 `aria-label`**：除了 `Primary app sections`，Codex 先盤點 App 內頁是否還有。有的話列在 verification，並放進 `no-hardcoded-copy` 的白名單（附理由），不改。

## 3. web 檔案範圍

以下檔案裡所有使用者看得到的文字都要進訊息檔，包括 JSX 文字、`aria-label`、`title`、`alt`、`placeholder`、`role="status"`／`alert` 的訊息、錯誤代碼對應的文字、`navigator.share` 的文字，以及確認彈窗的輸入提示。數字是 2026-11-17 盤點的去重字串段數，僅供參考。

- **Home**：`features/home/home-page.tsx`（31）、`home-scene.tsx`（6：四句台詞＋speaker）、`features/quick-expense/quick-expense.tsx`（8）。
  - speaker 用 2I-1 已有的 brand／speaker key；
  - 待辦台詞用 ICU 複數。
- **個人**：`features/personal-expenses/personal-page.tsx`（55）、`personal-expense-form.tsx`（21）、`personal-reference-form.tsx`（16）、`personal-box-form.tsx`（7）。
- **分帳**：`features/shared-expenses/shared-workspace.tsx`（37）、`shared-expense-form.tsx`（31）、`shared-expense-list.tsx`（10）、`personal-reference-form.tsx`（15）、`shared-space-list.tsx`（12）、`shared-space-form.tsx`（7）。
- **結算／更正／生命週期**：`features/shared-settlements/settlement-panel.tsx`（28）、`correction-form.tsx`（20）、`shared-lifecycle-panel.tsx`（24）。
- **基金**：`features/pooled-funds/pooled-workspace.tsx`（103，含 eyebrow）、`pooled-expense-form.tsx`（15）、`pooled-space-list.tsx`（13）、`pooled-space-form.tsx`（7）。
- **分類**：`features/taxonomy/taxonomy-manager.tsx`（19）、`taxonomy-picker.tsx`（16）。
  - 使用者自訂的分類與標籤名稱不翻。
- **任務**：`features/tasks/task-center.tsx`（25）。
- **草稿**：`shared/drafts/draft-recovery.tsx`（7）、`blocked-expense-drafts.tsx`（3，草稿份數用 ICU 複數）。
- **其他共用**：`shared/ui/pixel-notebook.tsx`（離線訊息）、`shared/ui/pixel-dialog.tsx`（`Close dialog`）、`features/groups/group-switcher.tsx`。
- **群組（原本是英文）**：
  - `app/app/groups/page.tsx`、`groups/new/page.tsx`、`groups/join/page.tsx`、`groups/[groupId]/page.tsx`、`groups/[groupId]/invite/page.tsx`；
  - `features/groups/group-detail.tsx`、`group-form.tsx`、`group-list.tsx`、`member-roster.tsx`、`archive-empty-group-dialog.tsx`、`leave-group-dialog.tsx`、`group-client-api.ts`（10 則錯誤訊息）。
- **App 內邀請（原本是英文）**：`features/invitations/invite-create-panel.tsx`、`invite-share-panel.tsx`、`join-group-form.tsx`。
- **頁面 metadata**：`app/app/**/page.tsx` 若有 `metadata`／`generateMetadata` 的 title 或 description，一併處理（Codex 盤點後列出）。
- 上面沒有列到、但掃描（§7.1）找到的檔案也要處理，並在 verification 補列。

**Namespace**：沿用 2I spec §2.4 預留的 `home`、`personal`、`shared`、`pooled`、`settlement`、`taxonomy`、`tasks`、`groups`、`drafts`、`errors`。重複出現的字（關閉、重新讀取、確認中…、編輯、刪除、載入更多、儲存修改、重新讀取最新資料等）放進 `common`。

- 預估新增約 480 個 key；verification 要列出每個 namespace 的實際數量。
- 不要用字串拼接組句子（2I spec §2.4）。像「已刪除「{title}」，月支出將重新計算。」這類句子一律用參數；中文輸出要與現在逐字相同。

## 4. 英文文案與版面

- 語氣與長度規則照 2I spec §4.1、§4.2：
  - 按鈕用動詞開頭、sentence case、不用驚嘆號（Mimiku 台詞除外）；
  - 可以換行；不縮小字級、不截斷、沒有水平捲動。
- **Home 情境分頁**（Ed 決定）：
  - 英文顯示 Personal／Shared／Fund；
  - 在 360、390、1440 下，分頁列的 `scrollWidth <= clientWidth`（不需要捲動）；
  - 中文不變。
- **eyebrow**：依 §6.6；保持大寫。
- **斷字**：依 §2-4。
- **停止點**（Codex 遇到就停下回報，附截圖與實測寬度，不要自行改樣式或文案）：
  1. 任何英文文字被截斷、溢出邊框，或造成頁面水平捲動；
  2. 摘要卡或筆記本列的金額欄被擠到換行，或金額本身被斷開；
  3. 結算面板、基金投入列的狀態標籤（例如 "Sent, awaiting receipt"）把同一列的按鈕擠出框外；
  4. 任一英文按鈕在 360 寬換成三行以上；
  5. 加了 `hyphens:auto` 後，仍有字在非音節處被切開。
- **只為英文加的 CSS 一律限定在 `:lang(en)`**。中文像素必須通過 §8。

## 5. 後端

### 5.1 共用 helper
- 新增 `backend/src/modules/taxonomy/term-locale.ts`：
  - `resolveUserLocale(tx, userId)`：讀 `users.locale`，若在 `['zh-TW','en','ja']` 內就回傳原值，否則回 `'zh-TW'`（§2-9）；
  - `localizedTermName(term, locale)`：取 `translations[locale]`，若是字串就回傳，否則回 `term.name`（§2-8）。
- `personal-expense-queries.service.ts` 的 private `termName` 改用這兩個 helper。**輸出必須與現在相同**，用既有測試證明。

### 5.2 taxonomy
- `TaxonomyService.list`、`listForSpace`：`query.locale` 有值就用它（明確指定優先，維持現有 API 行為）；沒有值就用 `resolveUserLocale(actorId)`。
- `TaxonomyQueryDto.locale` 維持 `@IsIn(['zh-TW','en'])`。
- create／rename 等 mutation 回應的投影維持現狀：自訂項目沒有 translations，結果不變。
- 搜尋（`q`）沿用現有邏輯：本地化名稱或原名任一符合就算。

### 5.3 Home 與 /me
- `home.service.ts` 的 `participantCards`：
  - 每個請求只呼叫一次 `resolveUserLocale(actorId)`；
  - `recent_categories[].category_name` 改用 `localizedTermName(row.category, locale)`；
  - 分組鍵、排序、取前三筆、`category_id` 都不變（不在這輪處理合併後的 canonical 歸併）。
- `UpdateMeDto.locale`：`@IsOptional() @IsIn(['zh-TW','en','ja'])`。不合法的值回 400，格式沿用 ValidationPipe 現行的錯誤格式。
- 註冊 DTO 仍然不接受 `locale`（2I spec §2.6）。

### 5.4 哪些回應的內容會改變（欄位不變）
| 端點 | 變化 | 影響的使用者 |
|---|---|---|
| `GET /me/taxonomy`、`GET /spaces/:id/taxonomy`（沒帶 `locale`） | 系統分類與標籤的 `name` 依 `users.locale` 回傳 | 只有 `users.locale = en` 的使用者（zh-TW 本來就是預設） |
| `GET /home` | `recent_categories[].category_name` 從 `term.name`（英文）改成本地化名稱 | 所有使用者；**中文使用者從 `Food` 變成 `飲食`** |
| `PATCH /me` | 不合法的 locale 改回 400 | 只有送了不合法值的請求；web 只會送已啟用的語言 |
| 個人月支出（`category_name`） | 不變（本來就有本地化） | — |

### 5.5 後端測試
- unit：`resolveUserLocale`（`zh-TW`／`en`／`ja`／亂值／`null`）、`localizedTermName`（有翻譯、沒有翻譯、translations 不是物件）。
- e2e（real DB，`127.0.0.1` 專用）：
  - taxonomy 不帶 locale：zh-TW 使用者回 `飲食`、en 使用者回 `Food`；帶 `locale=zh-TW` 的 en 使用者回 `飲食`；
  - 自訂項目在兩種語言下都回原名；
  - Home：zh-TW 使用者的 `recent_categories` 是 `飲食`，en 使用者是 `Food`；
  - `PATCH /me`：`fr` 回 400；`ja`、`en`、`zh-TW` 回 200；
  - 既有 backend 測試全部照跑。

### 5.6 push 順序
1. 第一次 push：web＋docs。新 web 不依賴後端變更。
2. 確認 CI 綠燈、staging web 已部署之後，第二次 push 後端。
   - 部署前後，Home 的近期分類分別是 `Food` 與 `飲食`。這是預期變化，用功能實測確認（`mimic-api` 沒有對外網址）。

## 6. 術語表增補（zh-TW／en；ja 留給 2I-b）

2I spec §6 的條目照用。下列是 2I-2 新增的術語，2I-b 時一併搬到 `docs/i18n/glossary.md`。

### 6.1 角色與參與
| zh-TW | en | 備註 |
|---|---|---|
| 參與者 | Participant | 寶箱的參與者；群組的成員仍是 member |
| 寶箱管理者／管理者 | Keeper | Ed 決定 |
| 已離開的參與者 | Former participant | |
| 設為管理者／改為參與者 | Make keeper / Make participant | |
| 加入參與者／結束參與 | Add participant / End participation | |
| 離開這個寶箱 | Leave this chest | |
| 群組治理 | Party admin | 「僅群組治理資訊」→ Party admin info only |
| 群組類型：雙人／多人 | Party type: Duo / Party | §2-6 |

### 6.2 寶箱模式（全名與短名）
| zh-TW | en 全名 | en 短名（只用在 Home 分頁） |
|---|---|---|
| 個人記帳 | Personal expenses | Personal |
| 共同分帳 | Shared expenses | Shared |
| 共同基金 | Pooled fund | Fund |

### 6.3 位置、結算、更正
| zh-TW | en |
|---|---|
| 目前位置 | Your position |
| 應收／應付／已結清 | You're owed / You owe / Settled up |
| 共同支出總額 | Total shared spending |
| 這不是帳戶餘額。 | This isn't an account balance. |
| 結算批次 | Settlement round |
| 開始結算批次／取消批次 | Start settlement round / Cancel round |
| 結算截止日 | Settlement cutoff |
| 建立批次並鎖定期間 | Create round and lock period |
| 期間／開放期間／永久鎖定 | Period / Open period / Permanently locked |
| 作廢 | Void |
| 更正原因 | Reason for correction |
| 原始紀錄 | Original entry |
| 稽核紀錄 | Audit history |

### 6.4 基金
| zh-TW | en |
|---|---|
| 帳面餘額 | Ledger balance |
| 可用餘額 | Available balance |
| 待付代墊 | Fronted, unpaid |
| 已送出待收款 | Sent, awaiting receipt |
| 基金支出 | Fund expense |
| 基金直接支付 | Paid from fund |
| 參與者先代墊／代墊參與者 | Fronted by a participant / Fronted by |
| 預期投入／實際投入 | Expected contribution / Actual contribution |
| 確認已投入 | Confirm contribution |
| 略過這次／取消這次 | Skip this one / Cancel this one |
| 每月／每週 | Monthly / Weekly |
| 每幾期 | Repeat every |
| 產生到 | Generate until |
| 預設投入金額 | Default amount |
| 基金退回／退回計畫 | Fund return / Return plan |
| 準備結清／開始結清 | Ready to close out / Start closing out |
| 投入狀態：即將到期／今天到期／已逾期／已確認投入／已略過 | Due soon / Due today / Overdue / Contributed / Skipped |
| 已送出，待收款確認 | Sent, awaiting receipt |

### 6.5 私人參照、分類、草稿、任務、群組、邀請
| zh-TW | en |
|---|---|
| 私人參照 | Ledger link |
| 移除參照 | Remove link |
| 私人資訊／私人標籤／私人備註 | Private details / Private tags / Private note |
| 類別／標籤 | Category / Tag |
| 合併至／重新命名 | Merge into / Rename |
| 預設項目／自訂項目 | Default items / Custom items |
| 幣別／時區 | Currency / Time zone |
| 確認記帳 | Save expense |
| 重新讀取／重新讀取最新資料 | Reload / Load latest |
| 檢視草稿／重新送出草稿／丟棄草稿 | Review draft / Resend draft / Discard draft |
| 未提交草稿 | Unsent draft |
| 任務中心 | Your quests（eyebrow 已有 QUEST BOARD） |
| 待辦任務／目前沒有待辦 | Open quests / No quests right now |
| 需要注意／待處理 | Needs attention / To do |
| 開啟寶箱 → | Open chest → |
| 建立群組／加入群組／離開群組 | Create party / Join party / Leave party |
| 刪除空群組 | Delete empty party |
| 危險區 | Danger zone |
| 產生邀請／邀請連結／複製連結／複製邀請碼 | Generate invite / Invite link / Copy link / Copy code |
| 到期 | Expires |

Codex 翻譯其他字串時要先查 2I spec §6 與本節。需要本節以外的新術語時，在 verification 列出（中文、英文、出現位置），由小德審閱。

### 6.6 eyebrow（英文版；中文不變）
| 目前 | en |
|---|---|
| PERSONAL EXPENSES · 個人記帳 | PERSONAL EXPENSES |
| SHARED EXPENSES · 共同分帳 | SHARED EXPENSES |
| POOLED FUND · 共同基金 | POOLED FUND |
| CONTRIBUTION TRAIL／FUND SPENDING／PARTICIPANTS／SETTLEMENT TRAIL／QUEST BOARD | 原字不變 |
| CLOSE THE VAULT | CLOSE OUT |

### 6.7 2R 審閱補充

| zh-TW | en | 位置 |
|---|---|---|
| 群組名冊／群組詳情 | Party roster / Party details | 群組列表／詳情 eyebrow |
| 擁有者 | Owner | 群組成員名冊 |
| 有效／已離開／已移除 | Active / Left / Removed | 群組成員狀態 |
| 開啟群組寶箱 | Open party chests | 群組列表 |
| 邀請入口 | Invite gate | App 內邀請頁 |
| 邀請對象的電子郵件 | Invite email | 產生邀請表單 |
| 邀請碼或連結／查看邀請 | Invite code or link / Review invite | 加入群組 |
| 目前寶箱／日常支出／來源已鎖定 | Current chest / Daily expenses / Source locked | 個人帳本 |
| 共同寶箱 | Party chests | 分帳與基金寶箱清單 |
| 代墊款 | Reimbursement | 基金面板、任務 |
| 使用中 | Active | 分帳與基金寶箱狀態 |
| 指定金額 | Custom amounts | 分攤與基金投入表單 |
| 待指定 | To assign | 基金退回表單 |
| 更正後付款／更正後分攤 | Corrected payments / Corrected shares | 結算更正表單 |
| 確認已付款／確認已收款 | Confirm payment / Confirm receipt | 結算批次 |
| 參與者與封存 | Participants and archiving | 分帳生命週期 |
| 分攤方式／常用／建議 | Split method / Often used / Suggested | 分帳表單／分類選擇器 |

Home 情境列的固定入口沿用 2I spec 的「我的寶箱」／`My Chests`，詳見 2R-3。

## 7. 測試

### 7.1 Vitest
- **`no-hardcoded-copy.test.ts` 擴到整個 `web/src`**，排除 `*.test.*`、`src/test/`、`src/i18n/messages/`。
  - CJK 規則與白名單和 2I-1 相同；
  - **新增英文檢查**（只看 `.tsx`）：JSX 文字節點，以及 `aria-label`、`title`、`alt`、`placeholder`、`label` 的字串常值，只要含拉丁字母就算違規；
  - 例外清單寫在測試裡並附理由：`mimic`、`Mimic ID`、`Mimiku`、幣別代碼、`Primary app sections`、§2-10 盤點出的 e2e aria-label，以及標註 `// i18n-exempt: <理由>` 的行；
  - 先在 `d7cee7a` 上跑一次，把命中清單附在 verification，證明這個檢查真的抓得到。
- 訊息一致性測試（既有）：兩邊 key 集合相同、ICU 參數相同、沒有空字串。
- `useFormatMoney`：11 個呼叫點在 zh-TW 下的輸出與 `formatMinorUnit(…, 'zh-TW')` 逐字相同。
- 邀請到期時間：zh-TW 與 en-US 各一個固定時間的快照（測試裡固定時區）。
- 既有含中文斷言的單元測試：**不改斷言**；需要 provider 的測試用 2I-1 的共用 render helper。

### 7.2 e2e（新增 `web/e2e/i18n-phase-2i2.spec.ts`）
- 在 `mimic-locale=en` 下，用 real backend 測試資料逐頁斷言英文。範圍：
  - Home：empty／ready／offline；待辦 1 件與 2 件時的複數；speaker 是 `Mimiku`；
  - QuickExpense 開啟狀態；
  - 個人、分帳、基金頁，以及每個表單彈窗與面板：新增／編輯支出、私人參照、刪除確認、分類管理、結算面板（含開始批次彈窗）、更正、生命週期、基金投入排程、基金支出、退回計畫、結清；
  - 任務頁；
  - 群組列表、新增、加入、群組詳細（含兩個危險操作彈窗）、App 內邀請建立與分享（到期時間是英文格式）；
  - 草稿復原（一般、損壞、不可寫入）。
- 版面斷言（360、390、1440）：
  - `document.documentElement.scrollWidth <= clientWidth`；
  - Home 分頁列 `scrollWidth <= clientWidth`；
  - 導覽五個標籤沒有 ellipsis（沿用 2I-1）。
- real backend 的語言行為：
  - en 使用者的分類挑選器顯示 `Food`；
  - 切到中文後（`router.refresh()`），同一位使用者看到 `飲食`；
  - Home 近期分類：zh-TW 使用者是 `飲食`，en 使用者是 `Food`。
  - 這幾項需要新後端，只在「全部」樹跑；「只有 web」樹跑時標記為預期失敗或略過，並說明。
- **既有 2A–2I-1 e2e**：預設中文，照跑。只有因為群組／邀請中文化而失效的英文可及名稱，可以依 2I spec 2R-1 的規則改成中文。改了哪些要逐條列出（檔案:行、舊名稱 → 新名稱、訊息 key）。

## 8. 中文像素回歸（容差 0）

做法沿用交接文件「中文像素回歸的做法」：基線用 `d7cee7a` 乾淨 worktree 的 production build，與候選 build 在同一個 API、同一份測試資料、同一個 Chrome 下兩邊都拍，比對整頁 RGBA。

### 8.1 A 組：只有 web（候選 web vs 基線 web，兩邊都接 `d7cee7a` API）
- Home：11 個尺寸 × idle／empty／ready／offline＝44 張；
- 個人、分帳、基金頁：11 個尺寸 × 3＝33 張；
- 任務頁（有待辦的資料）：11 個尺寸＝11 張；
- Landing header 以下：11 張（確認外殼沒有被影響）；
- 彈窗與面板，390×844 各一張：QuickExpense、個人新增支出、分帳新增支出、私人參照、分類管理、結算面板、開始結算批次彈窗、更正、生命週期、基金投入排程、基金支出、退回計畫、草稿復原。
- **全部要逐像素相同。唯一允許的差異是「開始結算批次」彈窗的那一句說明（§2-1）**：
  - 提供遮罩，並證明差異範圍只在該 `<p>` 元素的 bounding box 內。
- 群組頁與 App 內邀請的中文會改變（英文 → 中文）：只交 before／after，不做像素比對。

### 8.2 B 組：後端變更（候選 web＋候選 API vs 候選 web＋`d7cee7a` API，同一份資料）
- Home 44 張：**只有 ready 狀態個人卡片的「近期分類」那一行可以不同**。
  - 驗證方式：差異遮罩的 bounding box 必須落在該 `<small>` 元素的 `getBoundingClientRect()` 內（列出兩者座標）；
  - DOM 文字前後分別是「近期分類：Food…」與「近期分類：飲食…」（列出實際內容）；
  - 其他狀態、其他卡片都要逐像素相同。
  - 測試資料要確保 ready 狀態有系統分類的個人支出。沒有的話，先補資料再拍，兩邊用同一份。
- 三種寶箱頁 33 張與任務頁 11 張：逐像素相同（中文使用者的 taxonomy 本來就是 zh-TW）。

### 8.3 證據保存
- 逐像素相同的成對截圖**不進 git**：移到 `.tmp/phase-2i2-pixel-archive/`；
- commit 一份 `pixel-regression-sha256.txt`（每張圖的 SHA-256＋比對結果），以及每類一組 390×844 範例；
- 有差異的圖（結算彈窗、Home 近期分類、群組 before／after）連同遮罩一起留在 `screenshots/`。

## 9. 英文截圖（360×800、390×844、1440×900）

- §7.2 列出的每一頁、每個彈窗與面板，三種寬度都要拍；
- Home 的 empty／ready／offline 與待辦台詞；
- 長文案的情況：基金頁有逾期投入、有退回計畫；結算面板同時有 To pay／Paid／Received；
- 檔名：`<頁面>-<狀態>-en-<寬>x<高>.png`；中文 before／after 用 `-zh-before`／`-zh-after`。

## 10. 驗證與交付

- 基線：`d7cee7a` 的乾淨 worktree（`.tmp/`）。
- 兩個樹：
  - **只有 web**：`d7cee7a`＋候選的 `web/` 變更（`backend/` 維持 `d7cee7a`）；
  - **全部**：候選工作樹。
  - 兩個樹都在 Linux（WSL Docker `node:22`，`core.autocrlf=false` 乾淨 checkout）跑 CI 四個 job 的步驟（Active Mimic naming、Backend、Web PWA、Production containers）。
- 兩個 web Dockerfile（`web/Dockerfile`、`web/Dockerfile.railway`）都要 build、以 `node` 執行並通過 `/api/health/live`，在容器內確認 `lang` 依 cookie 切換。
- **實跑新 web 接 `d7cee7a` API**（§8.1 已涵蓋），確認 Home、三種寶箱頁、任務、群組在中英文都能正常載入。
- real-backend 只用 `127.0.0.1` 專用 DB。
- 產品程式不得 import `web/` 以外的檔案（`web-build-context.test.ts`）。
- Vitest 用預設設定全套跑，不要同時跑多套 Playwright。
- 交付在 `docs/design/assets/reviews/2026-11-17-phase-2i2/`：
  - `verification.md`：
    - 檔案清單；每個 namespace 的 key 數；§2-10 的 aria-label 盤點；§3 補列的檔案；§6 以外的新術語；
    - `no-hardcoded-copy` 在 `d7cee7a` 的命中清單；
    - 兩個樹的 Linux／Docker 結果；Vitest、e2e、後端測試結果（逐項標明失敗是既有還是本輪造成）；
    - §8 的 A、B 兩組結果；英文截圖清單與發現的版面問題；測試修改清單；未完成事項；
  - `screenshots/`、`pixel-regression-sha256.txt`。
- `.agents/devlog.md` 追加一筆（CRLF）。
- **停在視覺審核：不要 commit、不要 stage。**

## 11. commit 與 push（小德執行，Ed push）
1. `feat(web)`：§3、§4、§7 的 web 部分 → 只動 `web/`。
2. `docs(visual)`：本規格、verification、截圖、SHA-256 清單、devlog、decision-log → 只動 `docs/`、`.agents/`。
3. `feat(api)`：§5 → 只動 `backend/`。
- 第一次 push：`git push origin <docs commit>:main`。小德確認 CI（Ed 看 Actions）、staging `/sw.js` chunk 含新字串、`lang` 切換正常。
- 第二次 push：`git push origin main`。Ed 確認 Railway `mimic-api` 已部署，再實測中文 Home 的近期分類顯示「飲食」。

## 待辦
- 2I-b 日文：`ja.json`、`ja` 系統分類翻譯、術語表搬到 `docs/i18n/glossary.md`（含本檔 §6）。
- 系統標籤的英文名是由 key 自動產生的（例如 `Date`、`Fuel`、`Work reimbursement`）。2I-2 不改，2I-b 補翻譯時一併檢查。
- Home `recent_categories` 沒有依合併後的 canonical 項目歸併；`personal-reference-policy.ts` 的 `resolveReferenceCategory` 目前沒有被使用。兩者都不在本輪範圍。

## 2R（2026-11-18，Codex 停止點；Ed 決定＋審閱者決定）

Codex 在 verification 回報兩個停止點：英文分帳頁的位置列在 390 寬換行，以及 A 組 Home idle 1024×768 有 38 個像素差異。另外，Home 的情境列實際上沒有模式分頁。

1. **文字節點切分要與基線相同（審閱者決定）**。
   - 1024×768 的差異遮罩 `[369,939,377,949)` 剛好落在「狀態時間：」與日期的交界。兩邊 DOM 文字相同，但 `d7cee7a` 是兩個相鄰的文字節點（`狀態時間：{formatGeneratedAt(…)}`），候選改成 `t('common.asOf', { date })` 之後合併成一個節點。Chrome 在非整數縮放下，節點邊界的字形定位因此不同。
   - **規則**：凡是 `d7cee7a` 在 JSX 裡由多個相鄰文字節點組成的句子（字面文字與 `{變數}` 交錯，例如 `common.asOf`、`shared.positionLine`、「付款：」「分攤：」「最近：」、`近期分類：`、各種「已刪除「…」」通知），候選在 zh-TW 下必須產生**相同的文字節點切分**。
     - 做法：用 `t.rich`，讓每個插值都成為獨立的 React 子節點（例如 `"asOf": "狀態時間：<date></date>"`，搭配 `date: () => value`），英文訊息用同樣的標籤；
     - 仍然不得用字串拼接組句子；具體寫法由 Codex 決定，在 verification 說明。
   - **新增自動檢查**（在重跑像素之前執行）：對 §8.1 的每一頁與每個狀態，在基線與候選上各序列化 `document.body` 的所有文字節點（父元素路徑＋文字內容，依文件順序），zh-TW 下必須完全相同。把結果列在 verification。不同的就先修，再拍像素。
   - 1024×768 修好後重拍。A 組仍然是容差 0；唯一允許的差異還是 §8.1 的結算彈窗那一句。
2. **位置列自然換行（Ed 決定）**。
   - 接受英文 `Your position` 列在 390 寬把金額換到第二行。這是可以換行的一句文字，金額本身沒有被斷開；中文在 360 寬本來也會換行，而且測試資料的名字（23 字元）比實際使用的名字長很多。
   - §4 停止點第 2 項縮小為：**摘要卡的主金額**（`<strong>` 大字）與**筆記本列右側的金額欄**不得換行或被擠出。句子裡的金額可以隨著句子換行，但金額本身（例如 `NT$0.00`）不得從中間斷開。
3. **Home 情境列的固定入口（Ed 決定）**：
   - Home 實作的情境列是固定的「我的寶箱」加上各群組的自訂名稱，沒有 Personal／Shared／Fund 三個模式分頁（§1-3 的前提是 2026-11-17 盤點時判斷錯誤）；
   - 固定入口的英文用 **My Chests**（與導覽列、術語表一致），不是 `Personal`。群組名稱不翻；
   - §4 的「分頁列 `scrollWidth <= clientWidth`」改成：英文在 360、390、1440 下，情境列的行為與中文相同（中文本來就可以橫向捲動時，英文也可以）。截圖要能看到固定入口完整顯示。
4. **表外術語統一（審閱者決定）**：
   - verification 列出的表外術語，原則上照 Codex 的譯法；
   - 有兩種譯法的統一成一種：共同寶箱 → `Party chests`（`pooled.sharedChests` 改掉 `Shared chests`）；使用中 → `Active`（`shared.space.inUse` 改掉 `In use`）；指定金額 → `Custom amounts`（`shared.form.fixed` 改掉 `Set amounts`）；
   - 這些都補進 §6 術語表，作為 2I-b 搬遷的來源。
   - App 內邀請建立面板的英文 "Bring a partner into this quest." 是 2I-1 前留下的舊文案，誤用了 quest（術語表裡 quest 是任務）。改成 "Bring a partner into this party."；中文照 Codex 的譯法。
   - 英文 `/app/groups/<id>/invite` 的整頁截圖從頁面頂端開始拍。目前 390 的圖是捲動後拍的，h1 被固定頂欄蓋住，看不出標題是否完整。
5. **接下來完成 verification 列為待辦的部分**：A 組其餘項目、結算彈窗遮罩、群組／邀請的 before／after、B 組（含「全部」樹的 taxonomy／Home 語言 e2e）、混合 To pay／Paid／Received 的英文結算畫面、既有 2A–2I-1 Playwright 全部回歸、新 web 接舊 API 的中文瀏覽器矩陣。
   - 1～4 的修改會動到已拍的英文截圖，受影響的頁面要重拍：Home 三種寬度、分帳頁、基金頁、群組／分帳／基金清單。

## 2R2（2026-11-18，審閱後補件；Ed 決定＋審閱者決定）

小德審閱 2R 交付：自行重算 200 對像素，結果與 verification 一致（188 對相同；12 對是核准例外，差異範圍都在對應元素內）。也看過 360 與 1440 的全部英文截圖，沒有截斷或溢出。

唯一要修的是：英文筆記本列在 360／390 寬會把 ISO 日期從連字號處斷開，例如分帳列的 `Shared expense · 2026-` ／ `11-18`。

1. **英文的 ISO 日期與時間不得從中間換行（Ed 決定）**。
   - 範圍：App 內頁所有顯示 `YYYY-MM-DD`、`YYYY-MM`、`YYYY-MM-DD → YYYY-MM-DD` 的區段，以及「As of …」時間的訊息。例如筆記本列的類型・日期、基金投入列、任務卡、Home 卡片的 Latest、結算批次期間、摘要卡的月份。
   - **做法（審閱者決定）**：只在 `en.json` 用 rich 標籤包住日期參數（例如 `"Shared expense · <nowrap>{date}</nowrap>"`），元件端用 `t.rich` 提供 `nowrap` 標籤，渲染成套 `white-space:nowrap` 的 `<span>`。
     - **zh-TW 訊息不加標籤、不變**，所以中文 DOM 與像素不受影響；
     - 日期前後的文字仍然可以換行，整個日期作為一個單位移到下一行。
   - 訊息一致性測試：允許 `nowrap` 這個標籤只出現在 en，在測試裡註明理由。ICU 參數名稱仍要兩邊相同。
   - 如果某個日期加了 `nowrap` 後在 360 寬造成水平溢出，就停下回報。
2. **驗證**：
   - 重跑 §8.1 的 DOM 文字節點比對（23 組），要與上一輪結果相同；
   - 重跑 A 組受影響頁面（Home 44、三種寶箱 33、任務 11）的中文像素，容差 0；
   - B 組不必重跑（後端沒有變更）；
   - 新增 e2e 斷言：英文 360／390 下，被 `nowrap` 包住的每個日期元素 `getClientRects().length === 1`；
   - 重拍受影響的英文截圖（360、390、1440）；
   - 在 Linux 重跑 Web PWA job 與兩個 web Dockerfile 的 build。

## 2R3（2026-11-19，2R2 審閱後補件；審閱者決定）

小德審閱 2R2：
- 自行重算 200 對像素，與 SHA-256 清單一致；這輪重拍的 A 組 88 對都是 0。
- 英文 360 寬的日期不再從中間斷開。

發現一個由 2R2 實作造成的退化：`web/src/shared/i18n/nowrap-date.tsx` 用 `display:inline-block`。inline-block 不會繼承外層連結的底線，所以英文 Home 卡片的連結「Lunch · Daily chest · 2026-11-18」，底線在日期前就斷了。中文沒有使用這個標籤，不受影響。

1. `nowrapDate` 的 style 加上 `textDecoration: 'inherit'`，讓日期盒跟著外層的底線。保留 `inline-block`（2R2 用它解決結算期間 `getClientRects` 的問題）。
2. 新增 e2e 斷言：英文下，外層 `<a>` 的 `getComputedStyle(link).textDecorationLine` 原本含 `underline` 時，其內每個 `[data-iso-nowrap]` 的 `getComputedStyle(el).textDecorationLine` 也要包含 `underline`。
   - 2026-11-19 Ed 確認將斷言限定於原本有底線的連結。既有 `.space-card` 明訂 `text-decoration: none`，日期盒依外層連結繼承樣式。Home ready／offline／quests-1／quests-2 另確認存在受檢的日期連結，避免空集合通過。
3. 重拍英文 Home（empty／ready／offline／quests-1／quests-2，360／390／1440）。其他頁面的日期不在連結裡，不必重拍。
4. 在 Linux 跑 Web PWA job（lint／typecheck／Vitest／build）。中文 DOM 與像素不受影響（zh 訊息沒有 `nowrap` 標籤），不必重跑像素，但要在 verification 寫明理由。

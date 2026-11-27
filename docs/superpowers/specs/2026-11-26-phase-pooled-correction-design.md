# Phase 基金更正：在畫面上建立與顯示共同基金的更正

- 日期：2026-11-26（小德起草；Ed 的決策見 §1）
- 狀態：**草稿，尚未 commit**。
- 基線：`<SPEC>`，也就是把本 spec 加進 repo 的 commit（小技術輪 `54c31cb`／`a95955c` 之後）。
- 像素回歸：依 `docs/design/pixel-regression-standard.md`。
- 執行：Claude Code（在 Ed 本機）。不需要新素材。

---

## 1. Ed 已定的決策（2026-11-26）
1. **支援三種來源**，都是已經鎖住、沒有其他辦法修正的紀錄：
   - 已確認的**投入**（`CONTRIBUTION`）；
   - 已送出或已收到的**代墊還款**（`REIMBURSEMENT`）；
   - 已送出或已收到的**退回**（`RETURN`）。
   - 基金直接付的支出（`EXPENSE`）**不加**更正入口，因為它本來就能直接編輯。
2. **表單填「正確金額」**：畫面算出差額後送給後端；使用者不用自己算正負。
3. **顯示方式**：和共同分帳一樣，在原紀錄列下加標示：更正圖示＋「已更正 N 次 · 更正後 金額」＋最新原因；右側大金額維持原紀錄的金額。

## 2. 現況（基線 `e5a4320` 盤點）
- 後端已經有 `POST /spaces/:spaceId/pooled-funds/corrections`（`CreatePooledCorrectionDto`）：
  - 欄位：`request_id`、`source_kind`、`source_id`、`amount_minor`（**有號差額**，不能是 0）、`occurred_on`、`reason`（1–2000 字）；
  - 權限：只有**寶箱管理者**（`operations.run(..., manager=true)`）；寶箱狀態要是 `ACTIVE` 或 `CLOSING`；
  - 日期：開立日 ≤ `occurred_on` ≤ 今天（寶箱時區）；
  - 來源檢查：投入要存在；代墊還款與退回的狀態要是 `SENT` 或 `COMPLETED`；
  - 更正建立後**不能修改或刪除**。帳面餘額＝… ＋ Σ更正差額（`pooled-values.ts`）。
- web：
  - `pooledWorkspaceSchema.corrections` 有收到資料，但畫面完全沒用到；
  - 也沒有任何更正入口。
  - **投入列拿不到投入的 id**：`occurrenceSchema` 只有排程項目的 id，沒有 `pooled_contributions.id`，而更正的 `source_id` 需要後者。

## 3. 後端（小變更）
- workspace 的每個排程項目（occurrence）新增 `contribution_id: uuid | null`：狀態是 `CONFIRMED` 時就是對應投入的 id，其他狀態是 `null`。
- 不改更正 API，也不需要新增 migration（只是投影多一個欄位）。
- 測試：projection 的 unit 測試；HTTP 測試確認 `CONFIRMED` 時 id 存在、其他狀態是 `null`。
- **部署（2H 規則）**：
  - web 先上，新欄位設成 optional，缺欄位時「投入」列不顯示更正按鈕；
  - 再上後端；
  - 之後另開一輪把欄位改成必填。

## 4. 畫面

### 4.1 入口
- 只有**寶箱管理者**、而且寶箱狀態是 `ACTIVE` 或 `CLOSING` 時才顯示。按鈕用 ghost，文字是 `pooled.correction.action`。
  - **投入**：投入筆記本中 `CONFIRMED`、並且有 `contribution_id` 的列；
  - **代墊還款**：支出筆記本中有 `reimbursement`、狀態是 `SENT` 或 `COMPLETED` 的列（`source_id` 用 `reimbursement.id`）；
  - **退回**：結清公告板中狀態是 `SENT` 或 `COMPLETED` 的退回列。
- 按鈕的 `aria-label` 要包含對象，例如「更正：王小明的投入」。
- 離線時停用（和其他按鈕一致）。

### 4.2 更正彈窗（`PixelDialog`，notebook 紙面）
- 標題 `pooled.correction.title`。
- 第一行說明原紀錄：「{對象} · 原金額 {amount}」；如果已經更正過，再加一行「目前（更正後）{amount}」。
- 欄位：
  - **正確金額**（`inputMode="decimal"`，必填，≥ 0）；
  - **更正日期**（預設今天，最小值是開立日，最大值是今天）；
  - **更正原因**（必填，最多 2000 字）。
- 輸入時即時顯示「差額：+NT$200／−NT$200」。差額是 0 時停用送出，並顯示 `pooled.correction.noChange`。
- 差額＝正確金額 − 目前金額（原金額＋既有更正的差額總和）。
- 送出：`POST …/pooled-funds/corrections`，`request_id` 用和其他基金操作相同的冪等做法（同樣的內容重試要用同一個 id）。
- 成功：關閉彈窗，重新讀取 workspace，顯示 `role="status"` 通知 `pooled.correction.saved`。不播 record-ledger 動畫（2G 規則）。
- 錯誤對應：
  - `POOLED_CORRECTION_INVALID` → `pooled.correction.invalid`；
  - `POOLED_CORRECTION_SOURCE_NOT_FOUND` → `pooled.correction.sourceChanged`；
  - `SPACE_MANAGER_REQUIRED`／`POOLED_SPACE_STATE_CONFLICT` → 既有的對應訊息；
  - 其他 → `pooled.correction.unconfirmed`。

### 4.3 標示（三種來源都一樣）
- 位置：原紀錄列的文字欄最下方。格式和共同分帳的更正標示完全一樣：同一個 CSS class、圖示在左（`event-correction` 32 px），兩行文字在右。
  - 第一行：`pooled.correction.correctedTo`（`count`、`amount`）；
  - 第二行：`pooled.correction.reason`。
- 「更正後金額」＝原金額＋該來源所有更正的差額總和。
- 對應方式：`corrections.filter(c => c.source_kind === 種類 && c.source_id === id)`；「最新」看 `created_at`，相同時再看 `id`。
- 所有參與者都看得到標示，不只管理者。
- 右側大金額、摘要卡、帳面餘額的顯示方式都不變（帳面餘額本來就已經包含更正）。
- `EXPENSE` 類型的更正（可能來自舊資料或 API 直接建立）：在支出列一樣顯示標示，但不提供入口。

## 5. 字串（三語；日文加到 `docs/design/assets/reviews/2026-11-19-phase-guild/ja-strings-for-review.md`）

| key | zh-TW | en | ja（草稿） |
|---|---|---|---|
| `pooled.correction.action` | 更正 | Correct | 訂正 |
| `pooled.correction.actionLabel` | 更正：{target} | Correct {target} | 訂正：{target} |
| `pooled.correction.targetContribution` | {name}的投入 | {name}'s contribution | {name}の入金 |
| `pooled.correction.targetReimbursement` | 給{name}的代墊還款 | Repayment to {name} | {name}への立替金の精算 |
| `pooled.correction.targetReturn` | 給{name}的退回 | Return to {name} | {name}への返金 |
| `pooled.correction.title` | 更正這筆紀錄 | Correct this entry | この記録を訂正 |
| `pooled.correction.original` | <target></target> · 原金額 <amount></amount> | <target></target> · Original <amount></amount> | <target></target> · 元の金額 <amount></amount> |
| `pooled.correction.current` | 目前（更正後）<amount></amount> | Currently <amount></amount> after corrections | 現在（訂正後）<amount></amount> |
| `pooled.correction.correctAmount` | 正確金額（{currency}） | Correct amount ({currency}) | 正しい金額（{currency}） |
| `pooled.correction.date` | 更正日期 | Correction date | 訂正日 |
| `pooled.correction.reasonLabel` | 更正原因 | Reason for correction | 訂正の理由 |
| `pooled.correction.difference` | 差額：<amount></amount> | Difference: <amount></amount> | 差額：<amount></amount> |
| `pooled.correction.noChange` | 金額沒有變動，不需要更正。 | The amount hasn't changed. | 金額が変わっていないため、訂正は不要です。 |
| `pooled.correction.immutable` | 更正建立後不能修改；原紀錄保持不變。 | Corrections can't be changed once added. The original entry stays the same. | 訂正は追加後に変更できません。元の記録はそのまま残ります。 |
| `pooled.correction.submit` | 確認建立更正 | Create correction | 訂正を作成 |
| `pooled.correction.saved` | 已建立更正，帳面餘額已更新。 | Correction added. The ledger balance is updated. | 訂正を追加しました。帳簿残高が更新されました。 |
| `pooled.correction.invalid` | 更正日期必須在寶箱開立日到今天之間，金額不能是負數。 | Choose a date between the chest's opening day and today, and an amount of zero or more. | 訂正日は宝箱の開始日から今日までの日付にし、金額は0以上にしてください。 |
| `pooled.correction.sourceChanged` | 這筆紀錄的狀態已變更，請重新讀取後再試。 | This entry has changed. Reload and try again. | この記録の状態が変わりました。再読み込みしてからもう一度お試しください。 |
| `pooled.correction.unconfirmed` | 更正尚未確認。相同內容重試不會建立重複更正。 | We couldn't confirm the correction. Retrying the same details won't create a duplicate. | 訂正が確認できませんでした。同じ内容で再試行しても重複しては作成されません。 |
| `pooled.correction.correctedTo` | 已更正 {count} 次 · 更正後 <amount></amount> | Corrected {count, plural, one {once} other {# times}} · Now <amount></amount> | {count}回訂正済み · 訂正後 <amount></amount> |
| `pooled.correction.reason` | 最新更正原因：<reason></reason> | Latest reason: <reason></reason> | 最新の訂正理由：<reason></reason> |

- 術語依 `docs/i18n/glossary.md`：投入／Contribution／入金；代墊／立替金；退回／Return／返金；更正／Correction／訂正。
- 中文既有字串逐字不變；`messages.test.ts`、`no-hardcoded-copy.test.ts` 要通過。

## 6. 展示資料
- `web/scripts/demo-data.mjs` 新增步驟 `pooled-corrections`（後端上線後才能執行；缺 `contribution_id` 時要清楚提示，不要失敗）：
  - 在「展示：共同基金」把隊長已確認的投入從 1000 更正成 800；
  - 在「展示：結清退回」把已送出的退回（600）更正成 550。
- 冪等，可以對 staging 重跑。

## 7. 驗證
- 像素回歸照標準做，基線 `<SPEC>`：
  - A 組：候選 web 對基線 web，都接基線 API；
  - B 組：候選 web 分別接候選 API 與基線 API。
  - 三語 × 6 個視窗。
- 預期差異：只有基金寶箱頁：
  - 管理者視角：符合條件的列多出「更正」按鈕；
  - 有更正的列：多出標示；
  - 更正彈窗。
- 零差異：其他所有頁面；**沒有任何更正、而且以參與者（非管理者）身分看的基金頁**。
- 測試資料要包含：三種來源各有 0、1、2 次更正；更正成 0；管理者與參與者兩種視角；`CLOSING` 狀態的寶箱。
- 新 web 接舊 API：投入列不顯示更正按鈕；代墊還款與退回照常；不報錯。
- web lint／typecheck／Vitest，後端 unit／HTTP；兩棵樹（只有 web、全部）都要過 CI 五個 job；兩個 web Dockerfile 都要能建置。

## 8. 停止點
1. 任何語言、寬度出現截斷、溢出或橫向捲動。
2. 「更正後金額」的計算和後端帳面餘額不一致（用測試資料逐筆核對）。
3. 需要新增 migration，或需要修改更正 API 的行為。
4. 預期外的像素差異（附三張原圖與座標，不要自己放寬）。

# Phase 2H：Home ledger 觸發修正與 CI 逾時防護

日期：2026-11-13。狀態：待 Codex 實作。**純技術輪**：不改任何畫面，不需視覺審核；小德審閱後直接記錄與 commit。

依據：2A–2G 已核准；`main` = `origin/main` = `8089cc6`，staging 已部署 2G。規則沿用 2C（Home ledger）、2G（記帳完成小夥伴、`home-activity.ts`）。

## 0. 問題

Home ledger 判斷「有新活動」用的是 `occurred_on/UUID` 的字串比較（`home-scene-motion.ts`，2G 抽到 `web/src/shared/scene/home-activity.ts`）。`ExpenseRecord.id` 是 UUID v4（隨機），所以：

- 同一天新增的支出，只有新 UUID 剛好比上次記錄的大時才會播，大約一半；
- 補記過去日期的支出，`occurred_on` 比較小，**永遠不播**；
- Home 只看得到每張卡片的 `recent_activity` 前 3 筆（依支出日期排序），補記的舊日期支出根本不在裡面。

另外，Vitest 預設 5 秒逾時，在 2F、2G 的本機負載下多個未修改的測試會逾時（`--testTimeout=20000` 全過）。CI 一紅，Railway 就會跳過部署。

## 1. Ed 已定的決策（2026-11-13）

1. **新活動**＝在這個情境裡**新建立**的紀錄，以伺服器的建立時間判斷：
   - 不論支出日期（含補記舊日期），也不論是自己或群組夥伴記的；
   - 個人情境另外包含「加入我的帳本」（私人參照的建立）；
   - 編輯、刪除不算。
2. **Home 卡片不變**：「最新活動」連結與卡片上的「最近：…」仍依支出日期排序。補記舊日期的支出會觸發 ledger，但卡片顯示的仍是日期最新的那筆。這是刻意的取捨，不是 bug。
3. **分兩次 push**：web 先上線、能接受新欄位，等部署完成後再上後端，避免 strict 合約在部署交錯時讓 Home 打不開（§5）。

## 1.1 審閱者自行決定的事（附理由）

1. **新欄位放在每張參與者卡片**：`latest_recorded: { id: string; recorded_at: string } | null`。不放在 `recent_activity` 裡，因為補記的舊日期紀錄不在前 3 筆。
   - `recorded_at` 是 `createdAt.toISOString()`，與其他 API 一致。
   - 支出的 `id` 是 expense id；私人參照的 `id` 是 reference id，與 `recent_activity` 的 id 規則相同。
2. **比較改成數值**：先比 `Date.parse(recorded_at)`，相同才比 id 字串。不再比 ISO 字串，避免格式差異（毫秒位數、時區寫法）造成誤判。
3. **換新的 localStorage key**：`mimic.home.latest-recorded.<context>`，值為 `${recorded_at}|${id}`。
   - 不沿用 `latest-activity`：舊值的格式不同，直接比較會在升級後的第一次進入誤播一次。
   - 新 key 不存在時與 2C 相同：只記錄、不播。
   - Home 進入時順手刪除舊的 `mimic.home.latest-activity.<context>`（try/catch）。
4. **沒有新欄位時（部署交錯中、舊 API）**：context 的 latest 為 null，不播、不寫入。
5. **2G 小夥伴**改寫新 key：用 mutation 回應裡的 `record.created_at` 與 `record.id`，規則仍是 max。三種寶箱的 record schema 都已有 `created_at`。
6. **CI 逾時**：在 `web/vitest.config.ts` 的 `test` 設 `testTimeout: 20000`、`hookTimeout: 20000`。後端 Jest 沒有出現逾時，這輪不動。

## 2. 後端（第二次 push）

檔案：`backend/src/modules/home/home.types.ts`、`home.service.ts`、相關測試。

- `ParticipantHomeCardBase` 加 `latest_recorded: { id: string; recorded_at: string } | null`。
- `participantCards()` 已經載入空間內**全部** ACTIVE expense rows 與 references，直接從已載入的資料取最大值，**不新增查詢**：
  - 支出：同一 space 內 `createdAt` 最大的 row，平手比 id；
  - 個人卡片：再納入通過現有 `linked` 篩選的私人參照，取參照本身的 `createdAt` 與 `id`。`linked` 目前沒保留 reference 的 createdAt，請帶上；
  - 沒有任何紀錄時為 `null`。
- GOVERNANCE 卡片不加欄位。
- `recent_activity` 與其他欄位**完全不變**。
- 測試（Jest＋HTTP e2e，`backend/test/home-tasks.e2e-spec.ts` 或新檔）至少涵蓋：
  - 補記舊日期後 `latest_recorded` 是該筆；
  - 同日新增多筆，`latest_recorded` 一律是最後建立的那筆；
  - 刪除最新一筆後，退回上一筆；
  - 加入我的帳本後，個人卡片的 `latest_recorded` 是該參照；
  - 群組夥伴新增的紀錄，對另一位參與者也可見。

## 3. Web（第一次 push）

- `web/src/shared/api/home-contracts.ts`：參與者卡片加 `latest_recorded: z.object({ id: uuid, recorded_at: iso }).strict().nullable().optional()`。**必須是 optional**，這樣舊 API 照樣能解析。等兩次部署都完成後的下一輪，再改成必填（列入待辦）。
- `web/src/shared/scene/home-activity.ts`：改成新 key 名稱、序列化 `${recorded_at}|${id}`、解析與數值比較（§1.1-2）。保留函式邊界，讓 Home 與小夥伴繼續共用。
- `home-page.tsx`：取所有參與者卡片 `latest_recorded` 的最大者，作為 Home scene 的觸發 key。原本依 `recent_activity` 計算的 `latestActivity()` **只留給卡片顯示**，顯示不變。
- `home-scene.tsx`／`home-scene-motion.ts`：觸發改用新 key；`enter()` 的其餘邏輯（暫停時不排入、首次只記錄、storage 不可用時不播、播放時序）不變。刪除舊 key（§1.1-3）。
- `record-ledger-companion.tsx` 與三頁呼叫端：`activityKey` 改用 `created_at`／`id`（§1.1-5）。2G 的其他行為不變。
- `web/vitest.config.ts`：§1.1-6。

## 4. 驗證

### 4.1 基線與指令
- 基線：`8089cc6` 的乾淨 worktree（`.tmp/`）。
- web、backend 都跑 `npm run lint`、`typecheck`、`npm test`、`build`、`test:e2e`。逐項標明失敗是「既有」還是「本輪造成」。
- **Linux 要驗兩個樹**（WSL Docker `node:22`，`core.autocrlf=false` 乾淨 checkout），每個樹都跑 CI 四個 job 的步驟，`web/Dockerfile` 與 `web/Dockerfile.railway` 都要 build、以 `node` 執行並通過 `/api/health/live`：
  - **樹 A**：只有 web 變更（＝第一次 push 的內容），後端維持 `8089cc6`；
  - **樹 B**：web＋後端全部變更。
- real-backend 只用 `127.0.0.1` 專用 DB。
- 產品程式不得 import `web/` 以外的檔案。

### 4.2 e2e（擴充 `home-phase-2c` 或新增 `home-ledger-trigger-phase-2h.spec.ts`）
- 先進 Home 記錄 → 用 API 補記 30 天前的支出 → 回 Home：ledger 播放（`data-ledger` 出現）。
- 同一天連續新增 6 筆，每筆後回 Home：6 次都播。
- 編輯或刪除後回 Home：不播。
- 個人情境「加入我的帳本」後回 Home：播。
- 群組情境，夥伴 B 新增 → 使用者 A 回 Home：播。
- 2G 去重：在記帳頁新增（小夥伴出現）→ 回 Home：不播。
- 升級相容：只有舊 key `latest-activity` 時進 Home：不播、寫入新 key、舊 key 被刪除。
- 部署交錯：攔截 `/api/app/home` 回應並移除 `latest_recorded`（模擬樹 A＋舊後端），Home 正常顯示、不播、不寫新 key。
- 暫停偏好、減少動態：沿用 2C 規則（暫停不排入；減少動態第 4 格 1.5 秒後回 idle）。

### 4.3 回歸（容差 0）
- Home 11 個尺寸 × idle／empty／ready／offline 的場景區與卡片，與基線逐像素相同（卡片顯示不變）。
- Landing header 以下 11/11。
- 2A–2G 的 e2e 全綠（2G 的 key 斷言改成新 key）。

### 4.4 交付
- `docs/design/assets/reviews/2026-11-13-phase-2h/verification.md`：觸發規則與程式位置；新 API 範例回應；樹 A／樹 B 的 Linux 與 Docker 結果；Vitest 全套在**預設設定**（新的 20 秒逾時）下的結果；回歸結果；測試修改清單；未完成事項。
- 不需要截圖或錄影，除非回歸失敗需要佐證。
- `.agents/devlog.md` 追加一筆（CRLF）。

## 5. commit 與 push 順序（小德執行，Ed push）

1. `fix(web)`：§3 全部（含 Vitest 設定）→ 只動 `web/`。
2. `docs`：spec、verification、devlog、decision-log（只動 `docs/`、`.agents/`，不觸發部署）。
3. `feat(api)`：§2 → 只動 `backend/`。

- **第一次 push**：`git push origin <commit 2 的 sha>:main`。Railway 只會重新部署 web（watch path `/web/**`）。
- 小德確認 staging web 已上新版，且 Home 正常、沒有新欄位時不播。
- **第二次 push**：`git push origin main`。只會重新部署 api。
- 小德確認 `/api/app/home` 回應帶 `latest_recorded`；Ed 實測一次補記舊日期 → Home 會播。

## 待辦
- 兩次部署都完成後，`latest_recorded` 改為必填。
- production 開放後，凡是 strict 合約加欄位都比照本輪分兩次部署。

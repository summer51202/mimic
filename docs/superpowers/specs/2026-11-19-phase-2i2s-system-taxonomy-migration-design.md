# Phase 2I-2S：系統分類寫入 migration（技術輪）

日期：2026-11-19。狀態：**待 Codex 實作**。純技術輪（沒有 web 畫面變更），不需要 Ed 做視覺審核；小德審閱 verification 後就 commit。

依據：2I-2 已核准並 commit（`84ee53b`、`d1ade8b`、`0ffdf91`）。web＋docs 已 push（origin＝`d1ade8b`），後端 `0ffdf91` 待 push。

## 0. 問題（2026-11-19 Ed 在 staging 實測）

- staging 的記帳表單「類別」下拉只有使用者自建的「11」，沒有任何系統類別（飲食、交通…）。
- 選「未分類」按「確認記帳」會失敗：後端 `TaxonomyService.resolveSelection` 找不到 `UNCATEGORIZED_ID`（`20000000-0000-4000-8000-000000000016`），丟出 `SYSTEM_TAXONOMY_MISSING`（500）。**目前 staging 上任何沒選自訂類別的支出都存不起來。**
- 原因：
  - 15 個系統類別與 15 個系統標籤（`backend/src/modules/taxonomy/system-taxonomy.ts` 的 `CATEGORY_CATALOG`／`TAG_CATALOG`）只會由 `backend/prisma/seed.ts` → `seed-taxonomy.ts` 寫入；
  - `seed.ts` 有 `assertLocalSeedTarget`，只能對本機資料庫執行；
  - 所有 migration 都沒有寫入這些資料，而 Railway 的 pre-deploy 只跑 `npm run prisma:migrate:deploy`。
  - 所以 staging（以及將來的 production）從來沒有系統類別。Codex 的驗證都在本機 seed 過的資料庫上跑，所以沒有發現。
- 影響 2I-2 的驗收：「中文 Home 近期分類顯示飲食」「英文分類顯示 Food」在 staging 上沒辦法驗證。2I-2 的程式本身不必改。

## 1. 審閱者決定（附理由）

1. **用 Prisma migration 寫入系統分類**，不用啟動時同步、也不開放 production seed。
   - 理由：pre-deploy 已經會跑 `migrate deploy`，不必新增部署步驟，也不必手動連資料庫；migration 只會執行一次，歷史可以追蹤；
   - 也不改 `assertLocalSeedTarget`：seed 還會建立 demo 使用者與群組，不能碰到 staging／production。
2. **新增 migration**：`backend/prisma/migrations/20261119000100_system_taxonomy_terms/migration.sql`（時間戳記必須排在現有最後一個 migration 之後）。
   - 內容是 30 筆 `INSERT INTO "taxonomy_terms" (...) VALUES (...) ON CONFLICT ("system_key") DO UPDATE SET "name"、"normalized_name"、"translations"、"category_keys"、"updated_at"`；
   - 欄位值與 `system-taxonomy.ts` 的 catalog **完全相同**：`id`、`kind`、`scope='SYSTEM'`、`scope_key='SYSTEM'`、`system_key`、`name`、`normalized_name`、`translations`（`{"zh-TW": …, "en": …}`）、`category_keys`、`status='ACTIVE'`、`version=1`，以及 `created_at`、`updated_at`（`CURRENT_TIMESTAMP`；`updated_at` 在資料庫沒有預設值，必須明確給）；
   - 理由：本機已經 seed 過的資料庫，id 與 system_key 都一樣，衝突時只會更新成同樣的值，所以可以重複執行；staging 是全新寫入。
   - `DO UPDATE` 不改 `status`、`merged_into_id`、`version`：系統項目不能被使用者封存或合併（現行規則），而且就算未來有變更，也不應該由 migration 覆蓋。
   - 不寫 `TaxonomyAuditEvent`：系統項目不是使用者操作，現行 seed 也不寫。
3. **防止兩邊不同步**：新增 `backend/prisma/migrations/system-taxonomy-migration.spec.ts`（或併入現有的 `migration-contract.spec.ts`，由 Codex 依現有結構決定，並在 verification 說明）。
   - 解析新 migration 的 30 筆 VALUES，與 `CATEGORY_CATALOG`、`TAG_CATALOG` 逐欄比對（id、kind、system_key、name、normalized_name、translations、category_keys），必須完全一致；
   - 測試註明：之後修改 catalog（例如 2I-b 加 `ja` 翻譯），要新增一個新的 migration，**不得修改這個已部署的 migration**；測試改成比對「所有系統分類 migration 依序套用後的最終結果」與 catalog 一致。這輪先只有一個。
   - 理由：catalog 與 migration 兩份資料，以後一定會有人只改其中一邊。
4. **seed 保留現狀**：`seed-taxonomy.ts` 照樣 upsert（migration 之後執行，結果相同），本機與測試資料庫的流程不變。
5. **這輪不改 web**。分類名稱的顯示已在 2I-2 處理。

## 2. 驗證

- **全新資料庫**（只跑 `prisma migrate deploy`，**不跑 seed**；`127.0.0.1` 專用 DB）：
  - `taxonomy_terms` 有 30 筆 `scope='SYSTEM'`（15 CATEGORY、15 TAG），逐欄與 catalog 相同；
  - 新使用者記一筆「未分類」的個人支出 → 201（修正前是 500 `SYSTEM_TAXONOMY_MISSING`；先在 `0ffdf91` 上跑一次，證明會失敗）；
  - `GET /me/taxonomy?kind=CATEGORY`：zh-TW 使用者看到 15 個中文系統類別，en 使用者看到英文；
  - Home：zh-TW 使用者記一筆「飲食」後，`recent_categories[0].category_name` 是「飲食」。
  - 這些寫成 backend HTTP／e2e 測試，固定在「不 seed」的資料庫上跑，以後再發生同樣的缺口就會被擋下來。
- **已經 seed 過的資料庫**：先 seed、再套用新 migration → 30 筆的內容不變（列出套用前後的 hash 或逐欄比對），沒有重複資料，`taxonomy_active_name` 唯一索引沒有衝突。
- **重複套用**：把同一份 SQL 再手動執行一次 → 不報錯，內容不變。
- **Prisma 一致性**：`prisma migrate diff`（schema vs migrations）沒有差異；`prisma migrate status` 正常。
- **CI**：在 Linux（WSL Docker `node:22`、`core.autocrlf=false` 乾淨 checkout）跑 Backend job 全部步驟與 Active Mimic naming；web 沒有變更，Web PWA 與 Production containers 照樣跑一次確認全綠。
- 既有 backend unit、HTTP、`test:spaces-db` 全部照跑。
- 交付：`docs/design/assets/reviews/2026-11-19-phase-2i2s/verification.md`；`.agents/devlog.md` 追加一筆（CRLF）。**不要 commit、不要 stage**，停在小德審閱。

## 3. commit 與部署（小德執行，Ed push）

1. `fix(api)`：新 migration＋測試 → 只動 `backend/`。
2. `docs(visual)`：本規格、verification、devlog、decision-log → 只動 `docs/`、`.agents/`。
- 這兩個 commit 接在 `0ffdf91` 之後，Ed 用一次 `git push origin main` 同時部署 2I-2 後端與這個 migration。
- 部署後 Ed 在 staging 實測：
  1. 記帳表單的類別下拉出現 15 個系統類別（飲食、日用品、住房…），標籤出現早餐、午餐…；
  2. 選「未分類」可以存檔；
  3. 記一筆「飲食」後，中文 Home 的近期分類顯示「飲食」；
  4. 切到 English 後，分類與標籤是英文（Food、Breakfast…），Home 顯示 `Top categories: Food`。

## 待辦
- 2I-b 補 `ja` 翻譯時：改 catalog、新增一個 `ON CONFLICT … DO UPDATE` 的 migration，並更新 §1-3 的測試。
- production 開放前，在部署檢查清單加上「系統分類 30 筆存在」的確認（`docs/operations/railway-deployment.md`）。這輪 Codex 可以順手加一行到該文件的 readiness 段落；動到的話在 verification 說明。

## 2R（2026-11-19，審閱後更正；審閱者決定）

- **筆數是 31，不是 30**：「未分類」本身也是系統類別（`category.uncategorized`），所以是 16 個類別＋15 個標籤。本規格裡的「30 筆」「15 個系統類別」都改以 catalog 為準（31 筆、16 個類別），實作與測試照 catalog。
- 接受實作加的 `WHERE … IS DISTINCT FROM`：內容相同時完全不更新，已 seed 的資料庫連 `updated_at` 都不變；內容不同的列照樣修正。
- 接受「不 seed」測試另開 `test:migration-only-db`（獨立 DB 名稱與 guard，與 seed 的 `assertLocalSeedTarget` 互斥）。它和 `test:spaces-db` 一樣不在 CI 裡（CI 的 Backend job 沒有 PostgreSQL）；要不要把兩者加進 CI，留到之後處理。
- 小德獨立比對：31 筆 VALUES 與 `CATEGORY_CATALOG`＋`TAG_CATALOG` 逐欄相同（id、kind、scope、scope_key、system_key、name、normalized_name、translations、category_keys、status、version）。

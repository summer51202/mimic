# Phase 2I-2S 驗證紀錄：系統分類寫入 migration

日期：2026-11-19。實作與驗證：小德（Claude，本 session 取代 Codex 執行）。規格：`docs/superpowers/specs/2026-11-19-phase-2i2s-system-taxonomy-migration-design.md`。
狀態：**未 commit、未 stage、未 push、未碰 staging**，停在小德（另一個 session）審閱。

## 0. 起點

- 本地 `main` = `0ffdf91`（`.git/refs/heads/main`）。
- 注意：裝置上 `.git/refs/remotes/origin/main` 也是 `0ffdf91`，與規格／交接文件寫的「origin＝`d1ade8b`」不同。可能 Ed 已經 push 了後端，也可能只是本地追蹤 ref 被更新；請審閱時向 Ed 確認 `mimic-api` 是否已部署 `0ffdf91`。
- 工作樹中 `landing-prop-position-review.html` 的 M 未動；2I-2S 規格仍是未追蹤檔，未動。

## 1. 變更檔案

| 檔案 | 狀態 | 說明 |
|---|---|---|
| `backend/prisma/migrations/20261119000100_system_taxonomy_terms/migration.sql` | 新增 | 31 筆 `INSERT … ON CONFLICT ("system_key") DO UPDATE` |
| `backend/prisma/migrations/migration-contract.spec.ts` | 修改 | 併入現有檔：新增 1 項「依序套用所有系統分類 migration 的最終結果＝catalog」 |
| `backend/test/system-taxonomy-migration.e2e-spec.ts` | 新增 | 只跑 `migrate deploy`、不 seed 的 HTTP 測試（6 項） |
| `backend/test/helpers/migration-only-db.ts` | 新增 | DB 名稱 guard：只接受 loopback 的 `/mimic_migration_only_test` |
| `backend/test/helpers/migration-only-db.spec.ts` | 新增 | guard 的 unit 測試（10 項，仿 `financial-spaces-db.spec.ts`） |
| `backend/test/jest-migration-only-db.json` | 新增 | 新 jest 設定（仿 `jest-financial-spaces-db.json`） |
| `backend/package.json` | 修改 | 新增 `test:migration-only-db` 腳本（1 行） |
| `backend/test/jest-e2e.json` | 修改 | `testPathIgnorePatterns` 加入新 e2e 檔，避免 CI 的無 DB `test:e2e` 撿到它 |
| `docs/operations/railway-deployment.md` | 修改 | smoke／readiness 段落後加一行「系統分類 31 筆存在」 |
| `docs/design/assets/reviews/2026-11-19-phase-2i2s/verification.md` | 新增 | 本檔 |
| `.agents/devlog.md` | 追加 | 一筆（CRLF，只追加） |

不在 repo 的輔助檔（`.tmp/`）：`gen-2i2s-system-taxonomy-sql.ts`（產生 SQL）、`probe-uncategorized.sh`（對真實 server 打 HTTP 的紅綠燈探針）。
未改：`web/`、`seed.ts`、`seed-taxonomy.ts`、`local-seed-target.ts`（`assertLocalSeedTarget`）、`system-taxonomy.ts`。
所有變更檔都是 CRLF（與 Windows 工作樹其他檔一致；`core.autocrlf=true` commit 時會轉成 LF）。

## 2. 與規格不同之處（請審閱）

1. **筆數是 31，不是 30。** `CATEGORY_CATALOG` 有 16 個類別（含「未分類」`category.uncategorized`），`TAG_CATALOG` 15 個標籤。規格寫「30 筆（15 CATEGORY／15 TAG）」「15 個中文系統類別」少算了「未分類」。既有測試 `personal-expenses.e2e-spec.ts` 也斷言 seed 後是 31 筆。規格要求「與 catalog 完全相同」，所以以 catalog 為準：migration 31 筆；`GET /me/taxonomy?kind=CATEGORY` 回傳 16 個系統類別（含未分類）；railway 文件寫 31。
2. **`DO UPDATE` 加了 `WHERE … IS DISTINCT FROM`**：SET 的欄位與規格相同（name、normalized_name、translations、category_keys、updated_at），但只在內容真的不同時才更新。效果：已 seed 的 DB 套用後**連 `updated_at` 都不變**，手動重跑是 `INSERT 0 0`；內容有差異的列仍會被修正（見 §4-4）。
3. **no-seed 測試另開一個 DB 名稱與 jest 設定**，而不是併入 `test:spaces-db`：`createSpaceTestApp()` 每次都會 `seedTaxonomy()`，同一個 DB 上跑完 spaces-db 就不再是「不 seed」。做法沿用 spaces-db 的模式（獨立 jest config＋loopback DB 名稱 guard＋`--runInBand`），沒有另起一套。兩個 guard 互斥：新測試拒絕 `/mimic`、`/mimic_financial_spaces_test`；`seed.ts` 的 `assertLocalSeedTarget` 拒絕 `/mimic_migration_only_test`（已實測，見 §4-6）。
4. 測試第一項用「所有 SYSTEM 列的 `updated_at = created_at`」證明這個 DB 從沒被 seed 的 upsert 改寫過（Prisma upsert 一定會更新 `updatedAt`），另外確認沒有 `demo@mimic.local`。

## 3. 產生 SQL 的方式

```bash
cd backend
node ../.tmp/gen-2i2s-system-taxonomy-sql.ts > prisma/migrations/20261119000100_system_taxonomy_terms/migration.sql
```

- 腳本直接 import `src/modules/taxonomy/system-taxonomy.ts`（Node 22 type stripping），依 `[...CATEGORY_CATALOG, ...TAG_CATALOG]` 順序輸出，字串單引號跳脫、translations 用 `JSON.stringify(...)::JSONB`、category_keys 用 `ARRAY[...]::TEXT[]`，輸出 CRLF。
- 每列：`id, kind, scope='SYSTEM', scope_key='SYSTEM', system_key, name, normalized_name, translations, category_keys, status='ACTIVE', version=1, created_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP`。不寫 `taxonomy_audit_events`。
- 比對測試（`migration-contract.spec.ts`）自己解析 VALUES（處理引號、巢狀括號、`''` 跳脫），不依賴產生腳本。

**突變測試**（確認比對測試真的會擋）：把 SQL 的「飲食」改成「餐飲」→ 失敗；catalog 的 coffee 加一個 category key → 失敗；DO UPDATE 多 SET `status` → 失敗；還原後 5/5 通過，`cmp` 確認還原。

## 4. 驗證結果

環境：雲端工作環境，Node v22.23.5，**PostgreSQL 16.15**（`initdb`＋`pg_ctl`，只聽 `127.0.0.1:55432`），`npm ci` 675 套件，Prisma 5.22。

### 4-1 紅燈（0ffdf91 程式、全新 DB、只 `migrate deploy`）
- 新 e2e 測試：`npx jest --config ./test/jest-migration-only-db.json --runInBand` → **5 failed, 1 passed**（通過的是「未被 seed」那項）。未分類那項 `Expected: 201, Received: 500`；分類清單 `Received length: 0`；Home 那項記「飲食」得到 400（找不到類別）。
- 真實 server 探針：`node dist/src/main.js`（全新 DB `mimic_probe_red`）＋`.tmp/probe-uncategorized.sh` →
  `HTTP 500` `{"message":"SYSTEM_TAXONOMY_MISSING","error":"Internal Server Error","statusCode":500}`

### 4-2 綠燈（加上新 migration、全新 DB、只 `migrate deploy`）
- `npm run test:migration-only-db` → **6/6 通過**（全新 DB 上跑；同一個 DB 再跑一次也 6/6，測試會清掉自己建立的使用者，`"User"` 剩 0 筆）。
- `taxonomy_terms`：`CATEGORY|16`、`TAG|15`；`updated_at<>created_at` 的 SYSTEM 列 0 筆。逐欄（id、kind、scope、scope_key、system_key、name、normalized_name、translations、category_keys、status、version、merged_into_id、owner_user_id、group_id、created_by_id）與 catalog 相同，由測試第 2 項斷言。
- 探針（全新 DB `mimic_probe_green`）→ `HTTP 201`，`category_id = 20000000-0000-4000-8000-000000000016`。
- 涵蓋：未分類 201；zh-TW 使用者 16 個系統類別是中文、en 使用者是英文（逐一比對 catalog 的 translations）；zh-TW 記「飲食」後 Home `recent_categories[0] = {category_id: food, category_name: "飲食", spending_minor: "150"}`。

### 4-3 已 seed 過的 DB
步驟：暫時移開新 migration → 全新 DB `mimic` `migrate deploy` → `prisma db seed`（3 使用者、31 筆 SYSTEM）→ 放回新 migration → `migrate deploy`。
- 套用前後查詢 17 欄（含 created_at／updated_at）：31 列，**`cmp` 完全相同**，SHA-256 前後皆 `35fb41a43032e1697b4eb81d60c338b33be3c0ef9d4b3933cd5279cfd493fb79`。
- `count(*)=31, count(distinct system_key)=31, count(distinct id)=31`，沒有重複。
- `taxonomy_active_name`（scope_key, kind, normalized_name WHERE ACTIVE）沒有重複組合；migration 紀錄 `20261119000100_system_taxonomy_terms` finished、未 rollback。

### 4-4 冪等
- `psql -v ON_ERROR_STOP=1 -f migration.sql` 連跑兩次，兩個 DB 都是 `INSERT 0 0`、不報錯：
  - `mimic_migration_only_test`：`84415b375a844d1d… → 84415b375a844d1d…`（17 欄 hash，前後相同）；
  - `mimic`（seed 過）：`35fb41a43032e169… → 35fb41a43032e169…`。
- 額外：把 `category.food` 改成 `translations={"zh-TW":"舊名"}`、`version=2`、`updated_at=2020-01-01` 後重跑 → `INSERT 0 1`，translations 修回「飲食」、**version 仍是 2（不覆蓋）**、updated_at 更新。之後把 version 改回 1。`taxonomy_audit_events` 0 筆。

### 4-5 Prisma 一致性
- `prisma migrate status`：`mimic_migration_only_test`、`mimic` 都是 `Database schema is up to date!`。另把所有 migration.sql 轉成 LF（模擬 Linux CI／Railway checkout）對 CRLF 套用過的 DB 跑 status，也是 up to date（checksum 不受行尾影響）。
- `prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url … --exit-code`：**exit 2，但為既有差異**。在移除新 migration 的 0ffdf91 狀態下跑同一指令也是 exit 2，**兩份輸出 `cmp` 完全相同**（74 行：13 個資料表、32 個 FK 改名、16 個 index 改名，都是既有手寫 SQL 的約束命名與 Prisma 預設命名不同，與 taxonomy 無關）。新 migration 是純資料、不影響 schema。

### 4-6 backend 全套（CI Backend job 的步驟＋DB 測試）
backend 沒有 lint 腳本；`nest build` 的 tsconfig 含 `src`、`test`、`prisma`，等同 typecheck，另跑 `tsc --noEmit`。

| 項目 | 指令 | 結果 | 2I-2 基準 |
|---|---|---|---|
| build | `npm run build` | 通過 | — |
| typecheck | `npx tsc --noEmit -p tsconfig.json` | 通過 | — |
| unit | `npm test -- --runInBand` | 38 套、346 項全過 | 37 套、335 項（＋guard 10 項＋contract 1 項） |
| HTTP | `npm run test:e2e -- --runInBand` | 5 套、37 項全過 | 37 項（新檔已排除） |
| spaces-db | `npm run test:spaces-db`（全新 `mimic_financial_spaces_test`） | 20 套、156 項全過 | 20 套、156 項 |
| migration-only-db | `npm run test:migration-only-db` | 1 套、6 項全過 | 新增 |
| guard 互斥 | 新測試指向 `/mimic` | `LOCAL_MIGRATION_ONLY_TEST_DATABASE_REQUIRED` | — |
| guard 互斥 | `prisma db seed` 指向 `/mimic_migration_only_test` | `LOCAL_SEED_DATABASE_REQUIRED` | — |
| Active Mimic naming | 裝置上 `node --test scripts/verify-mimic-naming.test.mjs`＋`node scripts/verify-mimic-naming.mjs` | 6 pass；`Mimic naming verification passed.` | — |

unit／HTTP 在 CI 相同的環境變數下跑（`JWT_*` 設 CI 值、不設 `DATABASE_URL`）。**沒有失敗項，無需區分既有／本輪。** CRLF 正規化後以最終位元組重跑 build、unit、HTTP、migration-only-db、migrate status，結果相同。

### 4-7 環境差異（由 push 後的 GitHub Actions 把關）
- PostgreSQL 16.15（Codex 與 Railway 用 18）。
- 沒有跑 WSL Docker `node:22` 的 CI 四個 job（雲端沒有 Docker）。Web PWA、Production containers 兩個 job 本輪沒有相關變更（沒動 `web/`、Dockerfile、`ops/`）。
- `test:migration-only-db` 與 `test:spaces-db` 一樣**不在 CI**（CI Backend job 沒有 PostgreSQL service），要在本機或 Codex 的 WSL Docker 跑。是否把兩者加進 CI 由審閱者決定。

## 5. 裝置與雲端檔案 SHA-256 對照

寫回前先確認裝置上 4 個原檔與打包時相同（＝`0ffdf91` 工作樹版本）：`package.json 5c24d834…`、`migration-contract.spec.ts 77a6f432…`、`jest-e2e.json 5a5b638b…`、`railway-deployment.md 1a613f62…`，雙方一致。寫回後：

| 檔案 | 雲端（驗證版本） | 裝置 `D:\Project\mimic` |
|---|---|---|
| backend/package.json | `018e1e341657724cc36b511df67b079ef072cebf536cc01473381507bb78aa0f` | 相同 |
| backend/prisma/migrations/migration-contract.spec.ts | `298790a038644b64050d6265fa12d055c37ba984a3e31438ddf10389159f1a35` | 相同 |
| backend/test/jest-e2e.json | `fd5d1334faf223a8b9a8fa199884da4d153a43a944c04196aa14c210ae634d00` | 相同 |
| docs/operations/railway-deployment.md | `6ccb9f407db3392640b62e0f8c71316c5d1085978198d2a2eee218e84e3ec683` | 相同 |
| backend/prisma/migrations/20261119000100_system_taxonomy_terms/migration.sql | `d848d10b4edb71195b731678595b40183c3e9959a89ec977b1d818f1310c4d88` | 相同 |
| backend/test/helpers/migration-only-db.spec.ts | `820a1d261da66d2961786ac9cb5c0af702181ce483b7895d286c6f2166059806` | 相同 |
| backend/test/helpers/migration-only-db.ts | `644796e418ab4951b5e491f88de3d9241f3c5c195f15a30701e0cb2cc8654c52` | 相同 |
| backend/test/jest-migration-only-db.json | `9a095284cbe6a192691f9d0e1d9f4787bb044ec845297e678b323316ad6747de` | 相同 |
| backend/test/system-taxonomy-migration.e2e-spec.ts | `bd587a333d8c256b1093b3ae57d718effab20aa674d16b06e31a03d067fb6949` | 相同 |
| .tmp/gen-2i2s-system-taxonomy-sql.ts | `025b8e65833ac05548d4ba78982c979fa1032956ee71a577f4498530404f779b` | 相同 |
| .tmp/probe-uncategorized.sh | `1b7f54b6b881332bfc6a8beb56122ca2c67f10259f32e670c414e074b923e531` | 相同 |

裝置 `git status --short -- backend docs/operations docs/superpowers .agents`：4 個 M＋5 個新增路徑＋未追蹤的 2I-2S 規格（verification、devlog 寫入後另見 devlog）；`.git/index.lock` 不存在；`main` 仍為 `0ffdf91`。打包用的 `.tmp/2i2s-backend.tgz` 與寫回用的 tar 已刪除。

## 6. 未完成／待辦

- 小德審閱後 commit（規格 §3：`fix(api)` 只動 `backend/`；`docs(visual)` 動 `docs/`、`.agents/`，含 `docs/operations/railway-deployment.md`）。
- 規格 §0／§2 的「30 筆／15 個類別」要更正為 31／16（另開 2R 或在 decision-log 註明；規格 hash 若已記錄就不要改原檔）。
- 確認 origin 的真實位置（§0）。
- push 後看 GitHub Actions 四個 job（PostgreSQL 18、WSL 以外的 Linux）；Railway pre-deploy 的 `migrate deploy` 會套用此 migration；Ed 依規格 §3 在 staging 實測四項。
- 2I-b 加 `ja` 翻譯時：改 catalog＋新增一個同形式的 migration；`migration-contract.spec.ts` 已會依序折疊所有 `INSERT INTO "taxonomy_terms"` migration，不需改測試結構。

# Phase 2I-2T 驗證：把資料庫測試加進 CI

- 日期：2026-11-19
- 實作：獨立 session 的小德（純技術輪，沒有畫面變更）
- 起點：本地 `main` = `origin/main` = `848074c`；工作樹只有 `landing-prop-position-review.html` 是 M（未動）
- 狀態：**未 commit、未 stage、未 push**，等另一個 session 的小德審閱

> ⚠️ **`.github/workflows/ci.yml` 是遠端工具的受保護檔案，這個 session 無法寫入**（`device_commit_files` 回 `protected file`；小德沒有繞過）。
> 候選版放在 `.tmp/2i2t/ci.yml`，請 Ed 在 Windows 複製到位後再審閱／commit：
>
> ```powershell
> cd D:\Project\mimic
> Copy-Item .tmp\2i2t\ci.yml .github\workflows\ci.yml
> (Get-FileHash .github\workflows\ci.yml -Algorithm SHA256).Hash   # 應為 12FB00C9E2FB2C98…（全文見 §6）
> ```
>
> **在複製之前，裝置工作樹上的合約測試會失敗**（新 scripts＋舊 ci.yml：7 過、43 敗，因為找不到 `backend-db` job）。`ci.yml` 與兩個 scripts 必須在同一個 commit。

## 1. 變更檔案

| 檔案 | 變更 | 說明 |
| --- | --- | --- |
| `.github/workflows/ci.yml` | 修改（＋58 行；候選版在 `.tmp/2i2t/ci.yml`） | 新增 `backend-db` job「Backend database」，其他四個 job 一個位元組都沒改 |
| `scripts/verify-ci-workflow.mjs` | 修改 | 新增 `validateBackendDatabaseJob()`；必要 job 改為五個；action 參照數改為 `必要 job 數 × 2`；全 workflow 禁止 seed |
| `scripts/verify-ci-workflow.test.mjs` | 修改（只追加） | 新增 18 項測試（32 → 50） |
| `docs/design/assets/reviews/2026-11-19-phase-2i2t/verification.md` | 新增 | 本文件 |
| `.agents/devlog.md` | 追加 | CRLF，只追加 |

未改：產品程式、`backend/`（含 migration、jest 設定、guard）、`web/`、`containers` job（所以 `reviewedContainersJobHash` 不變）。

換行：三個檔案原本就是 CRLF／LF 混合（git autocrlf 在 add 時會正規化）；這輪只**插入** CRLF 行，既有位元組不動。

## 2. 設計

### 2-1 新增獨立 job，而不是加進 Backend job

1. **Backend job 的環境不變**：unit 與 HTTP 測試在 2I-2S 驗證時是「不設 `DATABASE_URL`」跑的；放進同一個 job 雖然可以只在 step 設 env，但 service 一起啟動會改變那個 job 的前提。分開後 Backend job 位元組不動。
2. **平行執行**：DB job 和 Backend／Web 同時跑，CI 總時間不會因此變長（實測 DB 步驟約 1 分鐘，Web job 本來就是最長的）。
3. **失敗歸因清楚**：GitHub Actions 上會直接看到「Backend database」紅，而不是混在 Backend 裡。
4. 代價：多一次 `npm ci`（實測 15 秒，setup-node 有 npm cache）與一個 runner。
5. Railway 開了「Wait for CI」，會把新 job 一起算進去：**DB 測試紅了，`mimic-web`／`mimic-api` 都會跳過部署**，這正是 2I-2S 想要的保護。

### 2-2 PostgreSQL service

```yaml
services:
  postgres:
    image: postgres:18.7@sha256:e754b839f447639b7004895f4d8a4bfcb4e9dbe3a1bc035f27f646562a16fd61
    env: { POSTGRES_USER: mimic_ci, POSTGRES_PASSWORD: mimic-ci-postgres-only, POSTGRES_DB: postgres }
    ports: [ "127.0.0.1:5432:5432" ]
    options: --health-cmd "pg_isready --host=127.0.0.1 --port=5432 --username=mimic_ci --dbname=postgres" --health-interval 5s --health-timeout 5s --health-retries 20
```

- **版本**：與 Railway 一致的 18。2026-11-19 從 Docker Hub registry API 查到 `postgres:18`、`18.7`、`18.7-trixie` 都指向同一個 index digest `sha256:e754b839…`（`18.8` 還不存在）。照 ci.yml 固定 action SHA 的風格，image 用「tag＋digest」固定；tag 寫 `18.7` 方便人讀，digest 才是實際生效的。之後升級要同時改 tag 與 digest（合約要求 `postgres:18[.x]@sha256:<64 hex>`）。
- **只在 runner 的 loopback**：`127.0.0.1:5432:5432`，不綁 `0.0.0.0`。步驟直接跑在 runner 上（不是 container job），所以用 `127.0.0.1` 連；兩個 guard 都接受 `127.0.0.1`。
- **health check 用 TCP（`--host=127.0.0.1`）**：官方 image 在初始化階段會先啟動一個只聽 unix socket 的暫時 server，用 socket 檢查可能在初始化完成前就回報 ready；用 TCP 只有最終 server 起來後才會通過。GitHub 會等 service 變成 healthy 才開始跑 steps。
- **帳密**：CI 專用的假值，直接寫在 workflow（加了註解說明），不用 secrets。合約會擋 `secrets.` 出現在這個 job。
- **`POSTGRES_DB: postgres`**：不預先建立任何測試 DB。兩個測試 DB 都由 `prisma migrate deploy` 建立（已實測：DB 不存在時 `migrate deploy` 會自動建立），所以 CI 上永遠是全新的。

### 2-3 步驟與資料庫隔離

| 順序 | step | `DATABASE_URL`（step 層級） |
| --- | --- | --- |
| 1 | `npm ci` | — |
| 2 | `npm run prisma:generate` | — |
| 3 | `npm run prisma:migrate:deploy`（不 seed） | `…@127.0.0.1:5432/mimic_migration_only_test?schema=public` |
| 4 | `npm run test:migration-only-db` | 同上 |
| 5 | `npm run prisma:migrate:deploy` | `…@127.0.0.1:5432/mimic_financial_spaces_test?schema=public` |
| 6 | `npm run test:spaces-db` | 同上 |

- `test:spaces-db` 照它現有的準備方式：全新 DB → `migrate deploy` → 測試自己的 `createSpaceTestApp()` 會 `seedTaxonomy()`（2I-2S verification 也是這樣跑）。
- 兩組用不同的 DB；`DATABASE_URL` 只放在 step，job 層級不設，避免 spaces 那組的 seed 汙染「不 seed」那組。migration-only 先跑，就算順序反過來也不會互相影響（不同 DB）。
- job 層級 env 只有和 Backend job 相同的兩個 JWT CI 值（兩組測試其實會自行覆寫）。
- 整個 CI 都沒有任何 seed 指令（`prisma migrate deploy` 本身不會觸發 seed）。

### 2-4 timeout

`timeout-minutes: 10`。雲端實測 DB 相關步驟合計約 63 秒（§3-2，2 vCPU）；GitHub `ubuntu-latest` 是 4 vCPU，另外要加上 checkout、setup-node、拉 postgres image 與 health check。10 分鐘約為實測的 5～8 倍餘裕，仍然比 Backend job 的 15 分鐘短，卡住時能較早失敗。

### 2-5 合約檢查（`scripts/verify-ci-workflow.mjs`）

新增 `validateBackendDatabaseJob()`，Web PWA job 的 `node --test ../scripts/verify-ci-workflow.test.mjs` 會跑到它：

- 必要 job 由四個變五個（`backend-db` 也要 checkout 一次且 `persist-credentials: false`、timeout 1～60）；action 參照數由寫死的 8 改為 `必要 job 數 × 2`。
- job 只能有 `name / runs-on / timeout-minutes / services / env / defaults / steps`（擋 `if`、`continue-on-error`、`strategy`、`container` 等）；不得出現 `secrets.`；job env 只能是兩個 JWT 值；defaults 只能是 `working-directory: backend`（擋自訂 shell）。
- service 只能有 `postgres`，只能有 `image / env / ports / options`；image 必須是 `postgres:18[.x]@sha256:<64 hex>`；ports 必須剛好是 `["127.0.0.1:5432:5432"]`；options 必須有 `--health-cmd` 與 `pg_isready`；`POSTGRES_DB` 必須是 `postgres`。
- run 步驟必須**逐字且依序**是 §2-3 的六個指令（擋刪除、調換、`|| true`、多塞指令／寫 `$GITHUB_ENV`），而且除此之外只能有 checkout 與 setup-node；run 步驟只能有 `name / env / run`（擋 step 的 `if`、`continue-on-error`、`shell`）。
- 四個 DB 步驟的 env 只能有 `DATABASE_URL`，必須是 `postgresql://…@127.0.0.1:5432/<對應 DB 名>`，且 migrate 與 test 用同一個 URL。
- 全 workflow 任何 run 指令出現 `seed` 都會被擋。

沒有像 containers job 那樣用整個 job 的 hash：這裡的規則都能逐條描述，升級 postgres digest 時不必另外更新 hash。

## 3. 實跑結果

### 3-1 環境

- 雲端工作環境：Ubuntu 24.04、2 vCPU、Node v22.23.5、npm `ci` 675 套件、Prisma 5.22。
- **PostgreSQL 18.7**（apt.postgresql.org 的 `postgresql-18 18.7-1.pgdg24.04+2`，與 CI image 同為 18.7）。用和 service 相同的設定啟動：`initdb -U mimic_ci`（密碼 `mimic-ci-postgres-only`、scram-sha-256）、`listen_addresses=127.0.0.1`、port 5432、只有 `postgres` DB。`pg_isready --host=127.0.0.1 --port=5432 --username=mimic_ci --dbname=postgres` → accepting connections。
- 雲端沒有 Docker daemon，所以不是用 image 本身跑；image digest 是從 registry API 查的（§2-2）。
- 指令與環境變數照 workflow：`working-directory: backend`、`JWT_ACCESS_SECRET=mimic-ci-access-secret`、`JWT_REFRESH_SECRET=mimic-ci-refresh-secret`、`CI=true`，`DATABASE_URL` 只在對應步驟設定；從刪掉 `node_modules` 開始。

### 3-2 綠燈與耗時

| 步驟 | 結果 | 耗時 |
| --- | --- | --- |
| `npm ci` | 675 套件 | 14.9 s |
| `npm run prisma:generate` | OK | 1.3 s |
| `prisma:migrate:deploy` → `mimic_migration_only_test`（DB 原本不存在） | 建立 DB 並套用全部 migration | 0.9 s |
| `npm run test:migration-only-db` | **1 套、6 項全過** | 7.6 s |
| `prisma:migrate:deploy` → `mimic_financial_spaces_test`（DB 原本不存在） | 建立 DB 並套用全部 migration | 0.8 s |
| `npm run test:spaces-db` | **20 套、156 項全過**（jest 36.97 s） | 37.5 s |
| **合計** | | **約 63 s** |

數字與 2I-2S 後的基準一致（spaces-db 20 套 156 項、migration-only 6 項）。

### 3-3 紅燈：CI 會擋 2I-2S 那類問題

同一串指令，但把 `prisma/migrations/20261119000100_system_taxonomy_terms` 暫時移開（模擬「系統分類只靠 seed」）：

- 全新 `mimic_migration_only_test` → `migrate deploy` → `test:migration-only-db`：**exit 1，5 failed／1 passed**（通過的是「沒被 seed 過」那項；其餘：catalog 比對、未分類 201、zh／en 分類清單、Home「飲食」都失敗），與 2I-2S 的紅燈相同。
- 放回 migration、重建 DB 後 → 6/6 通過。雲端副本已還原，裝置上的 backend 沒有任何變更。

### 3-4 actionlint

- actionlint **1.7.12**（GitHub release 的 linux_amd64 二進位）＋ shellcheck 0.9.0。
- 候選 ci.yml：**唯一的問題是 containers job 既有的 `SC2034: attempt appears unused`**（`Bootstrap API and Web health endpoints` 的 `for attempt in …`）。對 `848074c` 的原始 ci.yml 跑也是同一則，所以不是這輪引入的；修它會改到 containers job 而觸發 `reviewedContainersJobHash` 審查，不在本輪範圍（列為後續）。
- 新 job 本身零問題；`-shellcheck=` 關掉 shellcheck 時整份 exit 0。

### 3-5 合約測試與命名檢查

| 檢查 | 位置 | 結果 |
| --- | --- | --- |
| `node --test scripts/verify-ci-workflow.test.mjs`（候選 ci.yml） | 雲端 | 50 項全過（原 32 項＋新 18 項） |
| 同上，從 `web/` 以 CI 的方式執行（候選 ci.yml＋新 scripts 放在 `.tmp/2i2t/check/`，用裝置上的 `web/node_modules` 的 js-yaml 4.3.0） | 裝置 | 50 項全過 |
| 同上，裝置工作樹（**舊** ci.yml＋新 scripts） | 裝置 | 7 過、43 敗——預期，證明合約會要求新 job；Ed 複製 ci.yml 後即為上一列 |
| `node --test scripts/verify-mimic-naming.test.mjs` | 裝置 | 6 項全過 |
| `node scripts/verify-mimic-naming.mjs` | 裝置 | `Mimic naming verification passed.`（命名檢查不掃 `.github/`、`scripts/`；三個檔案也 grep 過，沒有 `pairfund`） |

### 3-6 Web 的 Vitest

在 `web/src`、`web/e2e`、`web/scripts`、web 根目錄的設定檔搜尋 `ci.yml`、`.github`、`workflows/`、`verify-ci-workflow`、`runs-on`、job 名稱、`js-yaml`：**沒有任何 Vitest 讀 ci.yml**。workflow 合約只有 Web PWA job 裡的 `node --test ../scripts/verify-ci-workflow.test.mjs`（`web/` 只是提供 js-yaml），已在 §3-5 以相同方式執行。這輪沒有改 `web/`，所以沒有重跑整套 Vitest。

## 4. 突變測試

在雲端副本對**實際的 ci.yml 文字**做突變，再跑驗證器與測試：

| 突變 | actionlint | 驗證器 | 合約測試 |
| --- | --- | --- | --- |
| A. 刪掉「Test migration-only database」與「Test financial spaces database」兩個步驟 | exit 0（語法仍合法） | **拒絕**：`backend-db job must run exactly: npm ci -> … -> npm run test:spaces-db` | 19 過、**31 敗** |
| B. 刪掉整個 `backend-db` job | exit 0 | **拒絕**：`missing backend-db job` | 7 過、**43 敗** |
| C. 反向：驗證器拿掉 `validateBackendDatabaseJob()` 呼叫（ci.yml 不動） | — | — | 34 過、**16 敗** |

A／B 證明「有人把這兩個步驟拿掉」時 actionlint 擋不住、合約會擋住，Web PWA job 會紅；C 證明新增的測試真的依賴新檢查，不是空轉。

測試檔另外以物件層級的突變涵蓋：刪掉任一個 DB 步驟（4 項）、兩個測試都刪、migrate／test 對調、`|| true`、step 的 `continue-on-error`／`if`、job 的 `if`／`continue-on-error`、插入 seed 步驟、Backend job 加 `prisma:seed`、兩組共用同一個 DB、job 層級 `DATABASE_URL`、非 loopback 主機、`postgres:18`／`latest`／16／17 image、`5432:5432`／`0.0.0.0`／只寫 `5432` 的 port、沒有 health check、密碼改用 `secrets`、插入寫 `$GITHUB_ENV` 的步驟。

## 5. 未完成事項與注意

1. **ci.yml 需要 Ed 手動複製到位**（受保護檔案，見開頭）。複製後請用 hash 核對，再由審閱的小德 commit。
2. **真正的 GitHub Actions 結果要等 Ed push 後才知道**。特別要看：
   - service 的 `ports: 127.0.0.1:5432:5432` 在 GitHub runner 上照預期綁定（這個 session 沒有 runner／Docker daemon，無法實證）；
   - 拉 image＋health check 的時間，以及整個 job 的實際耗時（用來確認 10 分鐘 timeout）；
   - 五個 job 都綠，Railway「Wait for CI」照常部署。
3. 雲端驗證用的是 apt 的 PostgreSQL 18.7，不是 `postgres:18.7` image 本身；版本相同，但 image 的初始化流程未在本機重現。
4. containers job 既有的 actionlint `SC2034` 警告未處理（需另外審查 containers hash）。
5. 這輪沒有跑 WSL Docker 版的 CI 四個 job；變更只涉及 workflow 與合約腳本，Backend／Web／containers 的內容都沒有改。
6. 之後 2I-b 新增分類 migration 時，`backend-db` 會在全新、不 seed 的資料庫上檢查它。

## 6. 檔案 SHA-256（工作樹位元組）

| 檔案 | SHA-256 |
| --- | --- |
| `.tmp/2i2t/ci.yml`（→ `.github/workflows/ci.yml`） | `12fb00c9e2fb2c987a977249a7576cbcceb0f4aafe3daddb289ae13e6a4e5ee4` |
| `scripts/verify-ci-workflow.mjs` | `50449a284cbe8189240f7da5ecfbbe4e0278819903f3494e554efced5e77fc2c` |
| `scripts/verify-ci-workflow.test.mjs` | `c8d17aed0ad34f626ae9d93e63db47aaa91855af6b04aacba7bf390d4d340ed2` |

`.tmp/2i2t/` 裡還有 `mimic-ci-src.tgz`（給雲端的原始碼快照）與 `check/`（裝置上的合約測試用目錄），審閱後可以刪除，不要 commit。

<p align="center">
  <img src="docs/assets/readme/mimic-cover.png" alt="mimic pixel-art treasury beside a moonlit lake" width="100%">
</p>

# mimic

**一起存，一起花，一起在異世界探險。**

mimic 是一個以 PWA 為主要介面的財務空間應用：個人帳本、共同分帳與共用基金各自保有清楚的資料、權限與會計規則。

> 專案目前處於 pre-release 階段，適合本機開發、功能驗證與試用；尚未完成正式營運所需的法律文件與部署流程。

Railway 基礎設施設定放在 `.railway/railway.ts`，並以 `staging` 優先、
`production` 明確核准的方式逐環境套用。正式環境目前仍維持關閉，且備份 cron
必須等專用唯讀資料庫帳號、外部儲存、簽章與還原演練全部通過後才能建立。詳見
[`docs/operations/railway-deployment.md`](docs/operations/railway-deployment.md)。

## 功能特色

- 建立私人的個人支出寶箱，或在群組內建立共同分帳與共用基金寶箱。
- 共同分帳支援多付款人、精確分攤、最少轉帳建議與雙方確認。
- 共用基金支援承諾、發生期、提撥、代墊、核銷、短缺、退款與結束流程。
- 首頁與任務中心只投影目前使用者有權知道的內容。
- 鎖定已完成的結算期間，以新增更正交易保留完整歷史。
- 在離線或送出失敗時保存 context-isolated 草稿，恢復後必須明確檢視、重試或丟棄。

## 核心會計規則

1. 金額一律以最小貨幣單位儲存，例如新台幣元或美元分，避免浮點誤差。
2. 三種模式各自計算，沒有跨模式的「通用基金餘額」。
3. 完成結算後，該日期區間即被鎖定，不得回溯修改或刪除交易。
4. 過往錯誤必須以新的更正交易處理，不覆寫歷史紀錄。

## 技術架構

| 區域 | 技術 | 職責 |
|---|---|---|
| Web PWA | Next.js 16、React 19、Serwist | 公開頁面、登入、三模式流程、BFF 與離線草稿邊界 |
| Backend | NestJS 10、Prisma 5 | JWT 驗證、領域規則、帳務計算與 REST API |
| Database | PostgreSQL | 財務空間、交易、參與期間、結算、核銷與稽核資料 |
| Contracts | OpenAPI、class-validator、Zod | API 契約、輸入驗證與前端資料邊界 |

所有 API 路由位於 `/api/v1`。除了註冊、登入與 token 更新外，端點皆受 JWT 保護。

## 快速開始

### 前置需求

- Node.js 22
- npm
- PostgreSQL

### 啟動 Backend

```powershell
# 從 repository 根目錄執行
Set-Location backend
Copy-Item .env.example .env
npm ci
npm run prisma:generate
npx prisma migrate dev
npm run prisma:seed
npm run start:dev
```

預設 API 位址為 `http://localhost:3000/api/v1`。請在 `backend/.env` 設定自己的資料庫連線與 JWT secrets；不要將該檔案提交到版本控制。

### 啟動 Web PWA

另開一個終端機：

```powershell
# 從 repository 根目錄執行
Set-Location web
Copy-Item .env.example .env.local
npm ci
npm run dev -- --hostname localhost --port 3010
```

上述命令會在 `http://localhost:3010` 啟動 Web，並透過 `MIMIC_API_BASE_URL` 連線至 Backend。

## 驗證

Backend：

```powershell
# 從 repository 根目錄執行
Set-Location backend
npm run prisma:generate
npm run build
npm test -- --runInBand
```

Web PWA：

```powershell
# 從 repository 根目錄執行
Set-Location web
npm run lint
npm run typecheck
npm test
$env:MIMIC_API_BASE_URL = 'http://localhost:3000/api/v1'
$env:MIMIC_COOKIE_SECURE = 'false'
npm run build
```

## 專案結構

```text
backend/   NestJS API、Prisma schema、migration 與測試
web/       Next.js PWA、UI、BFF routes 與測試
docs/      產品需求、設計規格、API 契約與實作計畫
.agents/   專案 feature map、devlog 與 repository skills
```

`backend/prisma/schema.prisma` 是唯一的 Prisma schema source of truth。

## 主要文件

- [產品需求文件](docs/design/mimic-prd-v0.2-final.md)
- [Backend 帳務模組與規則](docs/design/mimic-backend-accounting-module-map-v0.2.md)
- [OpenAPI 規格](docs/api/mimic-openapi-v0.2.yaml)
- [功能地圖](.agents/features.md)
- [Alpha readiness](docs/alpha-readiness.md)

## 專案狀態

- 個人支出、共同分帳與共用基金三種完整垂直流程已具備 Backend 與 PWA 實作。
- 舊版通用 Fund route、UI、BFF 與資料表已移除；舊網址安全回傳 not-found。
- 正式隱私權政策與服務條款尚未完成，目前頁面僅為 pre-release 說明。
- 專案尚未選定開源授權。未取得著作權人許可前，請勿假設程式碼可自由重製、修改或散布。

---

## English

**Save together, spend together, and explore another world together.**

mimic is a financial-space Web PWA with separate personal-expense, shared-expense, and pooled-fund modes, each with explicit data, permission, and accounting boundaries.

> The project is currently pre-release. It is suitable for local development, functional verification, and trials, but its production legal documents and deployment workflow are not final.

Railway infrastructure is declared in `.railway/railway.ts` and applied one
environment at a time, Staging first and Production only after explicit
approval. Production remains closed, and the backup cron cannot be added until
the dedicated read-only database role, external storage, signing, and restore
drill gates pass. See
[`docs/operations/railway-deployment.md`](docs/operations/railway-deployment.md).

## Features

- Keep a private personal ledger or create shared-expense and pooled-fund spaces inside a group.
- Split multi-payer shared expenses exactly and confirm minimum-transfer settlements.
- Track pooled commitments, occurrences, contributions, advances, reimbursements, shortfalls, returns, and closing.
- Show actor-private home and task projections.
- Lock completed settlement periods and preserve history through new correction transactions.
- Persist context-isolated failure/offline drafts that require explicit review, retry, or discard.

## Core Accounting Rules

1. Money is stored in minor units, such as cents, to avoid floating-point errors.
2. Each mode has independent accounting; there is no universal cross-mode fund balance.
3. Completing a settlement locks its date range; transactions in that range cannot be edited or deleted retroactively.
4. Past mistakes are corrected with new correction transactions instead of rewriting history.

## Architecture

| Area | Technology | Responsibility |
|---|---|---|
| Web PWA | Next.js 16, React 19, Serwist | Public pages, authentication, three-mode flows, BFF, and offline draft boundaries |
| Backend | NestJS 10, Prisma 5 | JWT authentication, domain rules, accounting calculations, and REST API |
| Database | PostgreSQL | Financial spaces, transactions, participation periods, settlements, reimbursements, and audit data |
| Contracts | OpenAPI, class-validator, Zod | API contracts, request validation, and client data boundaries |

All API routes use the `/api/v1` prefix. Routes are JWT-protected except registration, login, and token refresh endpoints.

## Quick Start

### Prerequisites

- Node.js 22
- npm
- PostgreSQL

### Start the Backend

```powershell
# Run from the repository root
Set-Location backend
Copy-Item .env.example .env
npm ci
npm run prisma:generate
npx prisma migrate dev
npm run prisma:seed
npm run start:dev
```

The API defaults to `http://localhost:3000/api/v1`. Set your database connection and JWT secrets in `backend/.env`; never commit that file.

### Start the Web PWA

Open another terminal:

```powershell
# Run from the repository root
Set-Location web
Copy-Item .env.example .env.local
npm ci
npm run dev -- --hostname localhost --port 3010
```

The command above starts the Web app at `http://localhost:3010` and connects it to the Backend through `MIMIC_API_BASE_URL`.

## Verification

Backend:

```powershell
# Run from the repository root
Set-Location backend
npm run prisma:generate
npm run build
npm test -- --runInBand
```

Web PWA:

```powershell
# Run from the repository root
Set-Location web
npm run lint
npm run typecheck
npm test
$env:MIMIC_API_BASE_URL = 'http://localhost:3000/api/v1'
$env:MIMIC_COOKIE_SECURE = 'false'
npm run build
```

## Repository Layout

```text
backend/   NestJS API, Prisma schema, migrations, and tests
web/       Next.js PWA, UI, BFF routes, and tests
docs/      Product requirements, design specs, API contracts, and implementation plans
.agents/   Feature map, development log, and repository skills
```

`backend/prisma/schema.prisma` is the only Prisma schema source of truth.

## Key Documentation

- [Product requirements](docs/design/mimic-prd-v0.2-final.md)
- [Backend accounting modules and rules](docs/design/mimic-backend-accounting-module-map-v0.2.md)
- [OpenAPI specification](docs/api/mimic-openapi-v0.2.yaml)
- [Feature map](.agents/features.md)
- [Alpha readiness](docs/alpha-readiness.md)

## Project Status

- Personal-expense, shared-expense, and pooled-fund verticals are implemented across the Backend and PWA.
- The legacy universal Fund routes, UI, BFF, and tables are removed; old URLs return a safe not-found result.
- The production privacy policy and terms of service are not final; the current pages are pre-release notices.
- No open-source license has been selected. Do not assume permission to reproduce, modify, or distribute the code without authorization from the copyright holder.

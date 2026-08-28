<p align="center">
  <img src="docs/assets/readme/mimic-cover.png" alt="mimic pixel-art treasury beside a moonlit lake" width="100%">
</p>

# mimic

**一起存，一起花，一起在異世界探險。**

mimic 是一個以 PWA 為主要使用介面的共享財務應用，協助伴侶與小型群組管理共同基金、分攤支出、追蹤成員部位並完成結算。

> 專案目前處於 pre-release 階段，適合本機開發、功能驗證與試用；尚未完成正式營運所需的法律文件與部署流程。

Railway 基礎設施設定放在 `.railway/railway.ts`，並以 `staging` 優先、
`production` 明確核准的方式逐環境套用。正式環境目前仍維持關閉，且備份 cron
必須等專用唯讀資料庫帳號、外部儲存、簽章與還原演練全部通過後才能建立。詳見
[`docs/operations/railway-deployment.md`](docs/operations/railway-deployment.md)。

## 功能特色

- 建立共享群組、邀請成員並管理共同基金。
- 記錄成員提撥與多付款人支出。
- 支援平均、比例、固定金額與混合分攤。
- 檢視基金餘額、期間統計與每位成員的淨部位。
- 產生最少轉帳次數的結算建議並完成結算。
- 鎖定已完成的結算期間，以新增更正交易保留完整歷史。
- 提供響應式 Next.js PWA、登入流程與離線邊界控制。

## 核心會計規則

1. 金額一律以最小貨幣單位儲存，例如新台幣元或美元分，避免浮點誤差。
2. 成員部位 = 提撥總額 − 分配給該成員的支出總額。
3. 完成結算後，該日期區間即被鎖定，不得回溯修改或刪除交易。
4. 過往錯誤必須以新的更正交易處理，不覆寫歷史紀錄。

## 技術架構

| 區域 | 技術 | 職責 |
|---|---|---|
| Web PWA | Next.js 16、React 19、Serwist | 公開頁面、登入流程、群組與基金操作、PWA 快取邊界 |
| Backend | NestJS 10、Prisma 5 | JWT 驗證、領域規則、帳務計算與 REST API |
| Database | PostgreSQL | 交易、成員、基金、結算與稽核資料 |
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

- 核心群組、基金、提撥、支出與結算領域已具備 Backend 實作。
- PWA 已完成驗證、群組、邀請與基金摘要主流程；交易活動與結算操作仍在擴充。
- 正式隱私權政策與服務條款尚未完成，目前頁面僅為 pre-release 說明。
- 專案尚未選定開源授權。未取得著作權人許可前，請勿假設程式碼可自由重製、修改或散布。

---

## English

**Save together, spend together, and explore another world together.**

mimic is a shared-finance application built around a Web PWA. It helps couples and small groups manage shared funds, split expenses, track member positions, and settle balances.

> The project is currently pre-release. It is suitable for local development, functional verification, and trials, but its production legal documents and deployment workflow are not final.

Railway infrastructure is declared in `.railway/railway.ts` and applied one
environment at a time, Staging first and Production only after explicit
approval. Production remains closed, and the backup cron cannot be added until
the dedicated read-only database role, external storage, signing, and restore
drill gates pass. See
[`docs/operations/railway-deployment.md`](docs/operations/railway-deployment.md).

## Features

- Create shared groups, invite members, and manage common funds.
- Record member contributions and multi-payer expenses.
- Split expenses equally, proportionally, by fixed amount, or with a hybrid allocation.
- Review fund balances, period totals, and each member's net position.
- Generate minimum-transfer settlement suggestions and complete settlements.
- Lock completed settlement periods and preserve history through new correction transactions.
- Use a responsive Next.js PWA with authentication and private-cache boundaries.

## Core Accounting Rules

1. Money is stored in minor units, such as cents, to avoid floating-point errors.
2. A member's position equals total contributions minus expenses allocated to that member.
3. Completing a settlement locks its date range; transactions in that range cannot be edited or deleted retroactively.
4. Past mistakes are corrected with new correction transactions instead of rewriting history.

## Architecture

| Area | Technology | Responsibility |
|---|---|---|
| Web PWA | Next.js 16, React 19, Serwist | Public pages, authentication, group and fund flows, PWA cache boundaries |
| Backend | NestJS 10, Prisma 5 | JWT authentication, domain rules, accounting calculations, and REST API |
| Database | PostgreSQL | Transactions, members, funds, settlements, and audit data |
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

- The core group, fund, contribution, expense, and settlement domains are implemented in the Backend.
- The PWA includes authentication, groups, invitations, and fund summaries; transaction activity and settlement actions are still expanding.
- The production privacy policy and terms of service are not final; the current pages are pre-release notices.
- No open-source license has been selected. Do not assume permission to reproduce, modify, or distribute the code without authorization from the copyright holder.

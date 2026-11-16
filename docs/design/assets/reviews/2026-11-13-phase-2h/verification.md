# Phase 2H 驗證紀錄

2026-11-13 · 基線 `8089cc6122f6c288c204631648cd73c5123106cb`

## 觸發規則與程式位置

- [`home.service.ts:12`](../../../../../backend/src/modules/home/home.service.ts#L12) 從已載入的 ACTIVE 支出及通過權限篩選的私人參照取最大 `createdAt`，同毫秒比較 ID。參照使用自己的 ID 與建立時間。每張參與者卡片提供 `latest_recorded`，沒有紀錄時為 `null`。`recent_activity` 仍用支出日期排序與截取，查詢數維持原有路徑。
- [`home-contracts.ts:12`](../../../../../web/src/shared/api/home-contracts.ts#L12) 讓舊 API 省略欄位。治理卡片維持原有嚴格合約。 [`home-page.tsx:31`](../../../../../web/src/features/home/home-page.tsx#L31) 取所有參與者卡片的最大值，原本的冒險卡連結及各卡片「最近」文字仍取自 `recent_activity`。
- [`home-activity.ts:1`](../../../../../web/src/shared/scene/home-activity.ts#L1) 使用 `mimic.home.latest-recorded.<context>`、`recorded_at|id` 與 `Date.parse` 數值比較。 [`home-scene-motion.ts:15`](../../../../../web/src/features/home/home-scene-motion.ts#L15) 進入時清理目前情境的舊 key，沒有有效資料時保留新 key 原值。有資料且新 key 尚未建立時只記錄。相同或較舊的紀錄、暫停狀態、storage 無法使用時皆無播放。
- [`record-ledger-companion.tsx:74`](../../../../../web/src/shared/scene/record-ledger-companion.tsx#L74) 使用 mutation 回應的 `record.created_at` 與 `record.id`，小夥伴播放時才更新已看過的最大值。三個記帳頁共用同一套比較。
- [`vitest.config.ts:29`](../../../../../web/vitest.config.ts#L29) 將測試與 hook 的預設逾時都設為 20,000 ms。

## API 回應範例

`GET /api/v1/home` 的個人情境。此範例的 `latest_recorded` 是剛補記的舊日期支出，卡片仍按 `recent_activity` 顯示支出日期最新的項目。外層為既有 API envelope。

```json
{
  "data": {
    "context": {
      "kind": "PERSONAL"
    },
    "cards": [
      {
        "access": "PARTICIPANT",
        "id": "0225de49-59dc-49b1-83de-2ee70e235fb8",
        "name": "日常帳本",
        "mode": "PERSONAL_EXPENSES",
        "currency": "TWD",
        "status": "ACTIVE",
        "month": "2026-11",
        "spending_minor": "15000",
        "recent_categories": [
          {
            "category_id": "20000000-0000-4000-8000-000000000016",
            "category_name": "Uncategorized",
            "spending_minor": "15000"
          }
        ],
        "recent_activity": [
          {
            "id": "54945edd-5b69-482d-bbf6-fd7386717d77",
            "title": "午餐",
            "occurred_on": "2026-11-13",
            "amount_minor": "15000"
          },
          {
            "id": "1637cc46-8010-4b19-ae8d-d2c0d0390136",
            "title": "補記車票",
            "occurred_on": "2026-10-14",
            "amount_minor": "8500"
          }
        ],
        "latest_recorded": {
          "id": "1637cc46-8010-4b19-ae8d-d2c0d0390136",
          "recorded_at": "2026-11-13T07:34:28.113Z"
        }
      }
    ],
    "task_count": 0,
    "generated_at": "2026-11-13T07:34:28.523Z"
  }
}
```

## 測試修改

| 測試 | 驗證內容 |
| --- | --- |
| `backend/src/modules/home/home.service.spec.ts` | 超出前三筆的補記、同毫秒 ID 平手、查詢次數 |
| `backend/test/home-tasks.e2e-spec.ts` | 空卡片、同日多筆、補記、編輯、刪除、私人參照及群組夥伴可見性 |
| `web/src/shared/api/home-contracts.test.ts` | 舊合約、新欄位、`null`、巢狀 strict 及治理卡片隔離 |
| `web/src/shared/scene/home-activity.test.ts` | key 與值格式、時間數值、時區表示、ID 平手及無效舊值 |
| `web/e2e/home-ledger-trigger-phase-2h.spec.ts` | 補記與同日六筆、編輯刪除、夥伴記帳、私人參照、升級清理、暫停、減少動態、實際 Web/API 部署交錯 |
| `web/e2e/home-phase-2c.spec.ts` | 先建立一筆以記錄初始游標，再驗證後續播放 |
| `web/e2e/record-confirmation-phase-2g.spec.ts` | 三頁小夥伴與 Home 去重、新 key 格式，使用單次 API 新增驗證播放。時序檢查改在 `hidden` 屬性寫入時取樣，沿用原有上下限與影格斷言 |

## Linux CI 與 Docker

- Windows 基線為 `.tmp/phase-2h-baseline` 的乾淨 detached worktree。Linux 在 WSL 原生檔案系統建立三個獨立 checkout，均從 `8089cc6` 開始，以 `core.autocrlf=false` 確認乾淨後才套用本輪檔案。樹 A 的 `backend/` 仍與基線相同，樹 B 包含 Web 與後端變更。CI 使用 Docker `node:22`（`v22.23.4`）。
- 後端 package 沒有 `lint` 或 `typecheck` script。後端型別另外以 `./node_modules/.bin/tsc --noEmit` 驗證。真實 HTTP 與瀏覽器使用專用 PostgreSQL 18，資料庫端點為 `127.0.0.1:39448`。

| 驗證 | 樹 A | 樹 B |
| --- | --- | --- |
| Naming job | 通過 | 通過 |
| Backend job | build、Jest 322 項、HTTP e2e 37 項通過 | build、Jest 323 項、HTTP e2e 37 項通過 |
| Backend 額外驗證 | TypeScript、專用 DB Home HTTP 4 項通過 | TypeScript、專用 DB Home HTTP 5 項通過 |
| Web job | 安裝、Prisma、workflow contract、lint、typecheck、Vitest 128 檔／668 項、build 通過 | 安裝、Prisma、workflow contract、lint、typecheck、Vitest 128 檔／668 項、build 通過 |
| Production containers job | API、Web、backup 映像與 contract、runtime、health 步驟通過 | API、Web、backup 映像與 contract、runtime、health 步驟通過 |
| `web/Dockerfile.railway` | build、`node` 帳號及 `/api/health/live` 通過 | build、`node` 帳號及 `/api/health/live` 通過 |

兩樹的標準 Web 映像均使用 `node` 帳號與 `node server.js`，且 `/api/health/live` 回應 `{"data":{"ok":true}}`。Railway 映像也使用相同的帳號與啟動命令。最後一版測試取樣同步至兩樹後，再依序跑 Web lint、typecheck、Vitest 和 build，全部通過。兩樹的 `npm test` 均使用新版預設逾時及 worker 設定，各為 128 檔、668 項通過。產品 Web import 邊界檢查也都通過。

乾淨基線的 Web lint、typecheck、build 通過。基線預設 Vitest 結果為 126 檔通過、1 檔失敗，665 項通過、1 項失敗。**既有**失敗為 `landing-warm-rest-composition.test.ts` 的 `keeps two unapproved composition drafts and immutable asset lineage`，達到原本 5,000 ms 逾時。該測試在樹 A 與樹 B 的新預設設定下皆通過。

另一次樹 A 的高負載重跑與多套 Playwright 同時執行，出現 7 項 20,000 ms 逾時。失敗項均為基線已有且本輪未改的影像測試，屬**既有**的負載敏感性。該次共 661 項通過，逾時細項如下。

| 檔案 | 逾時測試 |
| --- | --- |
| `asset-style-gate.test.ts` | `keeps all Gate B sources in the approved directory and records production promotions` |
| `avatar-classes-calibration.test.ts` | `publishes the fixed review-only roster with clean deterministic rasters` |
| `landing-a-title-calibration.test.ts` | `keeps A unchanged except mage removal, with genuine ImageGen title lineage` |
| `landing-war-room-calibration.test.ts` | `keeps deterministic review rasters and source lineage without runtime promotion`、`cleans actual transparent layer exports and uses exact 2x desktop pixels` |
| `landing-warm-rest-composition.test.ts` | `keeps two unapproved composition drafts and immutable asset lineage`、`writes real dimensions, exact 2x pixels, grayscale and clean transparent layers` |

## 實際部署交錯

樹 A production Web 使用 `127.0.0.1:3751`，對接未改動的 `8089cc6` API `127.0.0.1:3749`。Playwright 1 項通過。實際 `/api/app/home` 回應省略 `latest_recorded`，Home 仍顯示原有支出。只有舊 key 時會清理舊 key，新增舊 API 支出後既有新 key 保留原值，兩次進入 Home 均未播放。

## 瀏覽器回歸

樹 B 使用 production Web `127.0.0.1:3752` 及 API `127.0.0.1:3750`。Phase 2H 的補記、同日六筆、編輯刪除、夥伴記帳、私人參照、升級清理、暫停與減少動態皆通過。Phase 2G 的個人、共同分帳與共同基金三個 Home 去重案例也已通過。

最終 Phase 2A–2H 以預設產品模式及 `--retries=1` 執行，68 首次通過、1 重試通過、3 跳過、0 最終失敗。跳過的兩項是選用錄影，另一項部署交錯已在樹 A 單獨通過。重試項為 Phase 2C 1920×1080 idle 影格間距，首次 349.2 ms 超過原有 330 ms 門檻。量測發生於 ledger 觸發之前的既有 idle 路徑，分類為**既有**的計時抖動。

首輪 Phase 2A–2H 為 68 通過、3 跳過、1 失敗。390×844 的共同分帳小夥伴測得 1,926.4 ms，單獨重跑測得 1,941.8 ms，均低於既有 1,950 ms 門檻。暫存診斷分別量測基線和候選版的同步 DOM 寫入與非同步回呼。同步顯示至隱藏約 2 秒，回呼可能在同一工作完成後才交付。已修正測試取樣位置。高負載診斷中，影格序列偶發缺格在基線也有重現，分類為**既有**。產品的動畫時序未修改。

選用 `MIMIC_PHASE_2B_SW=1` 時，Landing 的 `session fixture selects the base CTA and logout reload selects registration` 在 8089cc6 與樹 B 都曾在 5 秒內等不到 `navigator.serviceWorker.controller`，分類為**既有**。同一案例用預設測試設定重跑通過。

四個瀏覽器專案執行 `npm run test:e2e`。乾淨基線全套為 491 通過、206 跳過、11 失敗。樹 B 全套為 498 通過、219 跳過、7 失敗。樹 B 的全套執行包含 2G 原始取樣，最終取樣另外由上述 Phase 2A–2H 矩陣驗證。基線另外曾在 `restored-treasure-chest-review`、`treasure-chest-states-review`、`ancient-treasure-chest-review` 與 `asset-style-gate` 的 motion calibration 出現失敗，均為**既有**。

| 樹 B 全套失敗 | 分類與對照 |
| --- | --- |
| `asset-style-gate.spec.ts:90` 的 review index，phone-small、phone、tablet、desktop | **既有**。四個專案皆在乾淨基線重現 |
| `avatar-classes-review.spec.ts:12`，phone | **既有**。乾淨基線同一專案重現 |
| `mimiku-states-actions-review.spec.ts:12`，phone | **既有**。乾淨基線同一專案重現 |
| `shared-expenses.runtime.spec.ts:85`，phone | 判為**既有**流程的偶發失敗。樹 B 全套於離線恢復後等待新增按鈕逾時，phone 單獨重跑通過。乾淨基線同一測試在 tablet 也失敗，當時逾時點是後續的結算期間顯示，並未重現同一斷言 |

### 逐像素比較

Playwright Chromium 以相同資料、時間、暫停偏好與瀏覽器光柵設定，逐張比較 `8089cc6` 與樹 B 的 production 輸出。Home 同時比對場景區與卡片，Landing 取 header 以下，三個記帳頁比對完整頁面。

| 畫面 | 相同組數 | 最終差異 |
| --- | --- | --- |
| Home idle／empty／ready／offline，各 11 個尺寸 | 44／44 | 每個場景區與卡片均 0 像素 |
| Landing header 以下 | 11／11 | 0 像素 |
| 個人、共同分帳、共同基金三頁，各 11 個尺寸 | 33／33 | 0 像素 |

首輪擷取有 11 組出現小範圍差異，其中 1280×720 離線場景的 130 像素差異在 `8089cc6` 對 `8089cc6` 控制組重現，分類為**既有**的擷取變異。最終矩陣保留 0 容差，記錄暫態差異後最多重拍四次。所有成功項均為完整 RGBA 相同，未遮罩像素。原始差異 PNG 和各次紀錄保存在 `.tmp/phase-2h-logs/`。

## 待辦

- Web 先部署，確認 staging 可用後再部署後端。兩次部署皆完成後才將 Web 的 `latest_recorded` 改成必填。
- 實作與驗證保留在工作樹，依指示無 stage、commit 或 push。

## 執行紀錄

原始紀錄位於 `.tmp/phase-2h-logs/`。各樹四個 CI job 與 Railway 映像的退出狀態在 `linux-jobs.log`、`linux-images.log`，最終 Web 重跑在 `linux-a-final-web-checks.log`、`linux-b-final-web-checks.log`。瀏覽器見 `browser-a-interleave.log`、`browser-b-default-phases.log`、`browser-b-full.log`、`browser-baseline-full-retry.log` 與 `pixels-repeat.log`。

Windows 工作區直接執行 Next build 時，sandbox 拒絕建立 `.next/types/app/api`（`EPERM`）。此為**既有環境限制**，最終結果採用兩棵 Linux 樹的 production build 及 Docker build。初次專用 DB seed 與基線 Playwright 啟動曾因依賴尚未就緒失敗，補齊測試依賴後重跑取得上述結果。

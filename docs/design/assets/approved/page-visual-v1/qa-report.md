# Gate B2-2 素材 QA

2026-11-09 · Gate B 最終審核

## 匯出與檔案品質

- 依 [decision-log](../../reviews/2026-09-18-page-visual-phase-1/decision-log.md) 核對全部 23 筆 SHA-256，逐位元組複製 Wordmark 眨眼、16 張職業圖與 6 張 Mimiku 動作。三個修訂動作各自使用最後核准的版本。
- [Production manifest](production-asset-manifest.json) 共 125 筆，包含 121 PNG 和 4 JSON。B1 既有 102 筆與原匯出一致。新 sheet 沿用核准校準頁的逐格時間與最終格。Avatar 與動作的 CSS 尺寸記錄為預定範圍，實際使用依後續 consumer plan 決定。
- 檢查簽章、來源與輸出 SHA-256、唯一性、寬高、逐格可見內容、水平格數、alpha 與全透明 RGB。四個安裝圖示可對應 192／512 的 `any` 與 `maskable` 組合。目視核對普通圖示的金框、maskable 的實色外圍及中央角色。80% 圓形安全區參考 [Maskable 核准審閱頁](../../reviews/2026-09-18-page-visual-phase-1/maskable-icons-review.html)。
- **審核例外。** 七張胸像（Alchemist、Bard、Cartographer、Mage、Physician、Ranger、Warrior）沿胸口裁切接觸底角。Warrior 另有 16 個符合既有亮中性色邊界偵測條件的像素，包含底列 x=46–50。其餘宣告透明的檔案未觸發該偵測。兩項例外保留 decision-log 核准像素，Warrior 的亮邊留待 Gate B 審閱。

## 對比合成

[合成審閱頁](../../reviews/2026-09-18-page-visual-phase-1/gate-b-composites.html) 將八個家族各一張正式樣本放在四個表面。比值以瀏覽器解析的 sRGB 顏色計算。一般文字門檻為 4.5:1，大字與必要邊界為 3:1。營運與財務語意由頁面文字承載，圖像可用空 `alt` 避免重複朗讀。

| 表面 | 背景 | 文字 | 文字對比 | 邊界 | 邊界對比 |
|---|---|---|---:|---|---:|
| 海軍藍 | `#17213a` | `#fffaf0` | 15.35:1 | `#f4b83f` | 8.95:1 |
| 洞窟炭色 | `#242222` | `#fffaf0` | 15.21:1 | `#f4b83f` | 8.87:1 |
| 羊皮紙 | `#fffaf0` | `#17213a` | 15.35:1 | `#8a5a35` | 5.62:1 |
| 暖色 | `#fff7df` | `#17213a` | 14.92:1 | `#8a5a35` | 5.46:1 |

洞窟炭色是審閱頁使用的背景色。其餘背景、所有文字色與邊界色取自 Web 的 live tokens。這些量測適用於本次合成，實際頁面配置仍須依 consumer 驗證。

## 載入失敗與版面

320／390／768／1440 px 均通過。每個寬度逐一攔截 Wordmark、Icons、Mimiku、Avatars、Scenes、Frames、Props、Motion 的正式樣本請求。四種背景上的卡片均保留 live 標題、描述及「Image unavailable」替代文字，海軍藍卡片高度與載入成功時相同，頁面無水平溢出。原校準索引的四張截圖基準已同步至目前審閱頁，更新後再以一般比較模式驗證。

四個合成與 32 張單家族失敗截圖位於本機 `.session/gate-b2-2/asset-e2e/`。同目錄層的 `asset-e2e.json` 包含 Playwright 結果與瀏覽器量測。

## 動畫

- Motion 2R 驗證腳本 4/4 通過，涵蓋單一主要動畫、跳過、焦點保留、完整對話、頁面隱藏暫停及減少動態。
- B2-1 審閱腳本在 1440／390 px 通過。一般模式檢查單次播放、互斥與 Escape 跳到最終格，減少動態模式檢查慶祝立即回待機。正式 PNG 與這些審閱來源的 SHA-256 相同。
- 兩種動態設定皆以瀏覽器確認，對話觸發後點擊 CTA 立即切至 Home，無需推進時鐘，焦點留在 CTA。

## 程式驗證與隔離

| 項目 | 結果 |
|---|---|
| Web lint | 通過。兩個既有 ESLint 設定警告，無錯誤。 |
| Web typecheck | 通過。 |
| Focused Vitest | 6 個檔案、84 項通過。 |
| Playwright 素材審閱 | 4 個視窗、20 項通過。 |
| Playwright 公開頁、登入與響應式 | 32 項通過。Cache Storage 斷言以 URL pathname 的首段比對私有路由，避免把公開頁的 `/_next/static/chunks/app/page-*.js` 誤判為私有回應。修正後四個視窗各自重跑通過。 |
| Web build | 使用 `http://127.0.0.1:3101/api/v1` 在隔離副本執行，exit 0，產生 33 個靜態頁。仍有既有的 `(public)/page_client-reference-manifest.js` standalone 複製警告。 |
| Backend build | 通過。 |
| B1 與 B2-1 可重建性 | B1 的 102 個檔案逐位元組一致，manifest 原有紀錄一致。B2-1R2 重建 2 張修訂 sheet，核對其餘 21 張。 |

以 Git 差異核對 `web/public`、Web runtime、Backend 與 `icon.png`。現有且受 Git 忽略的 `web/public/sw.js` SHA-256 仍為 `205e00320e642f291fa172d46475c886c6871103c5503e91b8e0e523fd0c7c5e`。根目錄 `icon.png` 為 `f69a20b714799566fbe21734419e7480655c37f6417cbd224c1e240b448c40ac`。

### Loopback 財務回歸

本次專用 PostgreSQL 17 使用 `127.0.0.1:55439` 的 `mimic_financial_spaces_test`、schema `page_visual_asset_gate`。套用 12 筆 migration，並以專案的 seed 補齊 31 筆系統分類。API 綁定 `127.0.0.1:3101`，開發 Web 使用 `127.0.0.1:3110`，重跑使用隔離 build 的 loopback Web。財務請求由真實 API 與 PostgreSQL 處理。

開發伺服器的首輪受缺少種子及即時編譯逾時影響。改用本機 build 後，直接使用 Prisma 的兩組測試另須設定 `DATABASE_URL`。首輪漏設時回退至本機 `localhost:5432`，連線失敗。重跑將 `DATABASE_URL` 與 `MIMIC_RUNTIME_DATABASE_URL` 都指向本次專用的 55439 schema。

| 流程 | 320 | 390 | 768 | 1440 |
|---|---|---|---|---|
| Home、快速記帳入口與個人任務 | 通過 | 通過 | 通過 | 通過 |
| 個人帳本 | 通過 | 通過 | 通過 | 通過 |
| 私人引用、結算後鎖定與隱私 | 通過，曾逾時 | 通過 | 通過 | 通過 |
| 共享支出、結算與更正 | 通過 | 通過 | 通過 | 通過 |
| 共用基金與收支生命週期 | 通過 | 通過 | 通過 | 通過 |

20 個財務案例均取得通過紀錄，結果彙整自本機重跑。320 px 的私人引用曾在等候「共同晚餐」標題時逾時，最後以單一 worker 重跑通過。原始 Playwright 結果保留於 `.session/gate-b2-2/` 的 `financial-production.json`、`financial-prisma-retest.json`、`final-built.json`、`reference-phone-small.json` 與 `cache-retest.json`。

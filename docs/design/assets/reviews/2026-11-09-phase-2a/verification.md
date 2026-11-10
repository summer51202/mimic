# Phase 2A 視覺審核

初版 2026-11-09。2R、2R2 更新 2026-11-10。

## 對話框與背景

對比度以 sRGB 相對亮度計算，背景為 `#211a18`。

| Token | 值 | 對比度／依據 |
| --- | --- | --- |
| `--mimic-color-dialogue-field` | `#211a18` | 核准 `frames.json` 的對話框中心色 |
| `--mimic-color-dialogue-edge` | `#b79556` | 核准的黃銅 fallback 邊框，6.08:1 |
| `--mimic-color-dialogue-text` | `#f0dfc4` | 2R2 核准暖米白，13.10:1 |
| `--mimic-color-dialogue-speaker` | `#bc9b65` | 2R2 核准低調黃銅，6.54:1 |
| `--mimic-color-cave-backdrop` | `#121317` | 桌機 `scenes/landing/desktop-architecture.png` 左上外緣，零起算 `(x=0, y=0)`，RGBA `(18, 19, 23, 255)` |

CTA 沿用亮金 `--mimic-color-coin-action`（`#f4b83f`），與對話框背景對比 9.61:1。桌機 1× 安全區向下取整為 118px。依使用者確認，該尺寸的對話框左右內縮各 54px，上下各 34px。

## 2R2 場景實測與審核圖

桌機對話框內文、說話者與 CTA 採 `clamp(1rem, 1rem × s ÷ 1.2, 1.5rem)`。預設根字級 16px 時等於規格的 16–24px，調大根字級時仍支援安全區溢出後移至舞台下方。內文區塊與 CTA 在框內垂直置中，CTA 的 `em` 內距隨字級縮放，點擊區至少 44×44 CSS px。配色與木牌留白均已核准。

| 視窗（CSS px） | 舞台對齊 | s | 內文／說話者／CTA 字級（px） | 包框（CSS px） | 截圖 |
| --- | --- | ---: | ---: | --- | --- |
| 768×1024 | 寬度受限，靠上 | 0.8 | 16 | 768×432 | [全頁](screenshots-2r2/768x1024-full.png) · [舞台](screenshots-2r2/768x1024-stage.png) |
| 1280×720 | 高度受限 | 1.2037037 | 16.0494 | 1156×650 | [全頁](screenshots-2r2/1280x720-full.png) · [舞台](screenshots-2r2/1280x720-stage.png) |
| 1366×768 | 高度受限 | 1.29259259 | 17.2346 | 1241×698 | [全頁](screenshots-2r2/1366x768-full.png) · [舞台](screenshots-2r2/1366x768-stage.png) |
| 1440×900 | 寬度受限，靠上 | 1.5 | 20 | 1440×810 | [全頁](screenshots-2r2/1440x900-full.png) · [舞台](screenshots-2r2/1440x900-stage.png) |
| 1536×864 | 高度受限 | 1.47037037 | 19.6049 | 1412×794 | [全頁](screenshots-2r2/1536x864-full.png) · [舞台](screenshots-2r2/1536x864-stage.png) |
| 1920×1080 | 高度受限 | 1.87037037 | 24 | 1796×1010 | [全頁](screenshots-2r2/1920x1080-full.png) · [舞台](screenshots-2r2/1920x1080-stage.png) |
| 2560×1440 | 高度受限 | 2.53703704 | 24 | 2436×1370 | [全頁](screenshots-2r2/2560x1440-full.png) · [舞台](screenshots-2r2/2560x1440-stage.png) |
| 360×780 | 手機 | 1 | 16 | 360×600 | [全頁](screenshots-2r2/360x780-full.png) · [舞台](screenshots-2r2/360x780-stage.png) |
| 390×844 | 手機 | 1 | 16 | 390×600 | [全頁](screenshots-2r2/390x844-full.png) · [舞台](screenshots-2r2/390x844-stage.png) |
| 430×932 | 手機 | 1 | 16 | 390×600 | [全頁](screenshots-2r2/430x932-full.png) · [舞台](screenshots-2r2/430x932-stage.png) |

寬度決定 s 的 768×1024 和 1440×900，舞台從 header 下緣開始。768×1024 的對話框因安全區高度不足接在舞台下方，1440×900 的對話框留在安全區。兩個尺寸的 `#features` 都直接接在 hero 下方。

360px 手機實測 `scrollLeft = 405`，可視範圍為場景 x=405–764。Mimiku 的 95px 圖層可見 86px，左側裁切 0px、右側裁切 9px。原始 PNG 的右側 9 欄每欄都含非透明像素，共 395 個 alpha > 0 的像素被裁掉。停用 JavaScript 的首屏也從 x=405 開始。390px 與 430px 手機仍從 x=390 開始。

2R2 專項 Vitest 22/22 通過。Playwright 的舞台矩陣 10/10、公開頁回歸 32/32 通過，另有 30 個重複矩陣項目按專案設定跳過。Lint、typecheck 與正式 build 通過，lint 有兩項既有警告，build 有既有的 public client reference manifest 複製警告。初版與 2R 的 34 張截圖已逐檔核對 SHA-256。

## 2R 場景實測與審核圖

桌機以完整精度的 `fit` 縮放 960×540 的場景，包框尺寸四捨五入至 CSS px。下表的倍率顯示到小數八位，桌機可用高度已扣除 70px header。圖層保留 layout 邏輯座標，整個場景共用一個左上原點的 transform。文字與 CTA 使用獨立的 CSS 排版，768px 桌機的對話框因安全區高度不足改排在舞台下方。

2R 舞台圖擷取瀏覽器實際顯示的倍率與裁切。1536×864 是 Windows 125% 對應的 CSS 視窗尺寸。舊版 `screenshots/` 保留原始位元組。

| 視窗（CSS px） | 版型 | 桌機 fit | s | image-rendering | 包框（CSS px） | 內縮左右／上下（px） | 2R 截圖 |
| --- | --- | ---: | ---: | --- | --- | --- | --- |
| 768×1024 | 桌機 | 0.80000000 | 0.80000000 | `auto` | 768×432 | 43／27 | [全頁](screenshots-2r/768x1024-full.png) · [舞台](screenshots-2r/768x1024-stage.png) |
| 1280×720 | 桌機 | 1.20370370 | 1.20370370 | `pixelated` | 1156×650 | 65／41 | [全頁](screenshots-2r/1280x720-full.png) · [舞台](screenshots-2r/1280x720-stage.png) |
| 1366×768 | 桌機 | 1.29259259 | 1.29259259 | `pixelated` | 1241×698 | 70／44 | [全頁](screenshots-2r/1366x768-full.png) · [舞台](screenshots-2r/1366x768-stage.png) |
| 1440×900 | 桌機 | 1.50000000 | 1.50000000 | `pixelated` | 1440×810 | 81／51 | [全頁](screenshots-2r/1440x900-full.png) · [舞台](screenshots-2r/1440x900-stage.png) |
| 1536×864 | 桌機 | 1.47037037 | 1.47037037 | `pixelated` | 1412×794 | 79／50 | [全頁](screenshots-2r/1536x864-full.png) · [舞台](screenshots-2r/1536x864-stage.png) |
| 1920×1080 | 桌機 | 1.87037037 | 1.87037037 | `pixelated` | 1796×1010 | 101／64 | [全頁](screenshots-2r/1920x1080-full.png) · [舞台](screenshots-2r/1920x1080-stage.png) |
| 2560×1440 | 桌機 | 2.53703704 | 2.53703704 | `pixelated` | 2436×1370 | 137／86 | [全頁](screenshots-2r/2560x1440-full.png) · [舞台](screenshots-2r/2560x1440-stage.png) |
| 360×780 | 手機 | — | 1 | `pixelated` | 360×600 | 46／46 | [全頁](screenshots-2r/360x780-full.png) · [舞台](screenshots-2r/360x780-stage.png) |
| 390×844 | 手機 | — | 1 | `pixelated` | 390×600 | 46／46 | [全頁](screenshots-2r/390x844-full.png) · [舞台](screenshots-2r/390x844-stage.png) |
| 430×932 | 手機 | — | 1 | `pixelated` | 390×600 | 46／46 | [全頁](screenshots-2r/430x932-full.png) · [舞台](screenshots-2r/430x932-stage.png) |

頁首與頁尾顯示公開頁原有的產品名稱。Landing 的 h1 以 `mimic` 作為 accessible name，場景內的 wordmark 為 `aria-hidden`。

舊版 14 張截圖以修正前後的 SHA-256 比對確認一致。`landing-prop-position-review.html` 的原始 SHA-256 為 `1021bf073585bb205c2530d1afe83f667578b0fc4fc918f699ee53c2a9e8b415`，已與 `4549d9c` 的 Git blob 逐位元組比對。

## 2R 基線比較

基線為 `.tmp/phase-2r-baseline/` 的 detached worktree，提交為 `4549d9cdfb05dfd7603431102a68875d19e2273c`。修正版使用另一份同提交 worktree，僅套入 Phase 2A 與 2R 的 Web 改動。兩邊使用相同依賴、`npm run test -- --maxWorkers=4 --testTimeout=60000` 與 `npm run test:e2e -- --workers=4`。瀏覽器套件使用正式 build，以及只綁在 `127.0.0.1:55442` 的專用 DB。Vitest 暫寫的 Phase 1 產物只出現在隔離 worktree。

### Vitest

| 版本 | 通過 | 失敗 |
| --- | ---: | ---: |
| 4549d9c | 705 | 24 |
| 2R | 710 | 22 |

「初版」標出原 verification 的 16 個失敗案例。Gate B manifest 檢查在 2A 改名，兩邊同一個歷史 motion fixture 的 SHA-256 斷言失敗。

| 案例 | 初版 | HEAD | 2R | 分類 |
| --- | --- | --- | --- | --- |
| `ancient-treasure-chest-v04.test.ts` · regenerates all51 PNG/HTML/manifest files byte-identically twice | 失敗 | 失敗 | 失敗 | HEAD 即失敗（既有） |
| `ancient-treasure-chest-v04.test.ts` · rejects an incomplete output inventory before writing any output | 失敗 | 失敗 | 失敗 | HEAD 即失敗（既有） |
| `ancient-treasure-chest.test.ts` · regenerates all51 PNG/HTML/manifest files byte-identically twice | 失敗 | 失敗 | 失敗 | HEAD 即失敗（既有） |
| `ancient-treasure-chest.test.ts` · rejects an incomplete output inventory before writing any output | 失敗 | 失敗 | 通過 | HEAD 即失敗（既有） |
| `asset-style-gate.test.ts` · page visual asset style gate defines the accessible motion and reduced-motion calibration contract | — | 失敗 | 失敗 | HEAD 即失敗（既有） |
| `asset-style-gate.test.ts` · stages the complete Gate B manifest and files outside public runtime paths | — | 失敗 | 失敗 | HEAD 即失敗（既有） |
| `home-base-v02.test.ts` · rebuilds v02 and checks both card zones and all sixteen avatar placements | — | 失敗 | 失敗 | HEAD 即失敗（既有） |
| `home-base.test.ts` · rebuilds both Home frames and fits eight classes on each shared anchor | — | 失敗 | 失敗 | HEAD 即失敗（既有） |
| `landing-prop-placement-application.test.ts` · rebuilds the applied scene byte for byte from the verified sources | — | 失敗 | 失敗 | HEAD 即失敗（既有） |
| `landing-prop-positioning.test.ts` · records every source/output hash and rebuilds byte-identically | — | 失敗 | 失敗 | HEAD 即失敗（既有） |
| `pressure-plate-attempt-04-review.test.ts` · pressure plate v02 review only keeps exact source history and the document's first prompt | 失敗 | 失敗 | 失敗 | HEAD 即失敗（既有） |
| `pressure-plate-attempt-04-review.test.ts` · pressure plate v02 review only rebuilds all review outputs byte-identically | 失敗 | 失敗 | 失敗 | HEAD 即失敗（既有） |
| `pressure-plate-attempt-04-review.test.ts` · pressure plate v02 review only refuses a modified output before writing any other target | 失敗 | 失敗 | 失敗 | HEAD 即失敗（既有） |
| `pressure-plate-attempt-05-review.test.ts` · attempt-05 review integrity rebuilds prepared guide, all PNGs, HTML and manifest byte-identically | 失敗 | 失敗 | 失敗 | HEAD 即失敗（既有） |
| `pressure-plate-attempt-05-review.test.ts` · attempt-05 review integrity refuses corrupt output without overwriting review files | 失敗 | 失敗 | 失敗 | HEAD 即失敗（既有） |
| `pressure-plate-attempt-06-review.test.ts` · attempt-06 existing-source appearance review pins all five existing raw sources, prompt chain, measured guide and extra colour references | 失敗 | 失敗 | 失敗 | HEAD 即失敗（既有） |
| `pressure-plate-attempt-06-review.test.ts` · attempt-06 existing-source appearance review rebuilds review outputs without rewriting existing measurement, guide or contracts | 失敗 | 失敗 | 失敗 | HEAD 即失敗（既有） |
| `pressure-plate-attempt-06-review.test.ts` · attempt-06 existing-source appearance review refuses a corrupt review output before overwriting the HTML | 失敗 | 失敗 | 失敗 | HEAD 即失敗（既有） |
| `pressure-plate-v02.test.ts` · pressure plate v02 review only rebuilds all review outputs byte-identically | 失敗 | 失敗 | 失敗 | HEAD 即失敗（既有） |
| `pressure-plate-v02.test.ts` · pressure plate v02 review only refuses a modified output before writing any other target | 失敗 | 失敗 | 失敗 | HEAD 即失敗（既有） |
| `restored-treasure-chest.test.ts` · refuses a changed own output and restores only its own test mutation | — | 失敗 | 通過 | HEAD 即失敗（既有） |
| `restored-treasure-chest.test.ts` · regenerates all51 PNG/HTML/manifest files byte-identically twice | 失敗 | 失敗 | 失敗 | HEAD 即失敗（既有） |
| `restored-treasure-chest.test.ts` · rejects an incomplete output inventory before writing any output | 失敗 | 通過 | 失敗 | 既有共享 fixture 問題，見下方重跑 |
| `treasure-chest-states.test.ts` · rebuilds all own PNG, HTML and manifest bytes identically twice | — | 失敗 | 失敗 | HEAD 即失敗（既有） |
| `treasure-chest-states.test.ts` · refuses changed own output before overwrite and restores only this test mutation | — | 失敗 | 通過 | HEAD 即失敗（既有） |

唯一只在 2R 平行 Vitest 失敗的案例是 `restored-treasure-chest.test.ts` 的 incomplete output inventory。錯誤指向初版也曾被報為變動的 `treasure-chest-states.manifest.json`。平行執行的 `treasure-chest-states.test.ts` 會暫寫同一份 manifest。將該案例獨立單 worker 重跑後通過，分類為既有測試 fixture 競態。兩邊共同的部分歷史素材失敗也與 checkout 位元組有關，例如兩份 worktree 的 `desktop-receipt.json` 都與 HEAD 一致，但都和歷史 composer 固定的 SHA-256 不同。

### Playwright

| 版本 | 通過 | 失敗 | 跳過 |
| --- | ---: | ---: | ---: |
| 4549d9c | 431 | 5 | 0 |
| 2R | 438 | 8 | 30 |

2R 的 30 個跳過是十尺寸矩陣在其他三個 Playwright 專案的重複項目。十尺寸矩陣與 `pixel-responsive`、`public-and-auth` 的 32 個案例全部通過。兩個版本的正式 build 通過，standalone tracing 仍報告既有的 public client reference manifest 複製警告。

「初版」標出原 verification 的八個失敗案例。「2R 單 worker」列出依序執行的結果。Loopback 的初次平行跑出現 Prisma 連線中斷與財務頁等待逾時，已在同一專用 DB 的隔離 schema 重跑。這些案例的應用頁面與 backend 程式在兩份 worktree 相同。

| 案例 | 初版 | HEAD | 2R 完整 | 2R 單 worker | 分類 |
| --- | --- | --- | --- | --- | --- |
| `desktop` · `real-backend-personal-references.spec.ts` · private shared-expense reference follows authority, settlement, exit, and privacy boundaries | — | 通過 | 失敗 | 通過 | 既有 loopback／測試執行不穩，HEAD 本次通過 |
| `desktop` · `shared-expenses.runtime.spec.ts` · shared bookkeeping lifecycle uses real persisted responses | — | 通過 | 失敗 | 通過 | 既有 loopback／測試執行不穩，HEAD 本次通過 |
| `phone-small` · `navigation-home-tasks.real-backend.spec.ts` · navigates treasure modes, quick entry, and actor tasks against the real backend | 失敗 | 失敗 | 失敗 | 通過 | HEAD 即失敗（既有） |
| `phone-small` · `personal-expenses.runtime.spec.ts` · personal box bookkeeping uses the real backend | 失敗 | 失敗 | 失敗 | 通過 | HEAD 即失敗（既有） |
| `phone-small` · `pixel-responsive.spec.ts` · pixel public shell remains responsive and raster sharp | 失敗 | 通過 | 通過 | — | Phase 2A 造成的舊 Hero 斷言，2R 已修正 |
| `phone-small` · `real-backend-personal-references.spec.ts` · private shared-expense reference follows authority, settlement, exit, and privacy boundaries | 失敗 | 失敗 | 失敗 | 通過 | HEAD 即失敗（既有） |
| `phone-small` · `shared-expenses.runtime.spec.ts` · shared bookkeeping lifecycle uses real persisted responses | 失敗 | 通過 | 通過 | 通過 | 既有 loopback／測試執行不穩，HEAD 本次通過 |
| `phone` · `avatar-classes-review.spec.ts` · Avatar / Classes evidence remains usable at every viewport | 失敗 | 失敗 | 失敗 | — | HEAD 即失敗（既有） |
| `phone` · `mimiku-states-actions-review.spec.ts` · Mimiku states and actions evidence remains usable at every viewport | 失敗 | 失敗 | 失敗 | — | HEAD 即失敗（既有） |
| `phone` · `pixel-responsive.spec.ts` · pixel public shell remains responsive and raster sharp | 失敗 | 通過 | 通過 | — | Phase 2A 造成的舊 Hero 斷言，2R 已修正 |
| `phone` · `shared-expenses.runtime.spec.ts` · shared bookkeeping lifecycle uses real persisted responses | — | 通過 | 通過 | 失敗 → 通過 | 既有 loopback／測試執行不穩，HEAD 本次通過 |
| `tablet` · `shared-expenses.runtime.spec.ts` · shared bookkeeping lifecycle uses real persisted responses | — | 通過 | 失敗 | 通過 | 既有 loopback／測試執行不穩，HEAD 本次通過 |

第一次財務單 worker 為 7/8，原先三個 phone-small 失敗均通過。最後六個財務案例的獨立單 worker 重跑為 6/6。完整 2R 比 HEAD 多出的三項，是 tablet 共用分帳等待逾時，以及 desktop 個人引用與共用分帳的 Prisma 連線中斷。這三項在獨立重跑中都通過。

原始 JSON 結果位於 `.tmp/phase-2r-logs/`。完整瀏覽器報告為 `baseline-playwright-final.json` 與 `candidate-playwright.json`。Vitest 報告為 `base-vitest.json` 與 `candidate-vitest.json`。

## 初版場景與審核圖

Build 直接 import 核准的 `layout.json` 與 `frames.json`。手機舞台裁切取初始探索位置可見的 360 或 390 個邏輯像素。2560×1440 的舞台截圖從 2× 螢幕擷取結果以整數步長取樣至 1×，其餘舞台圖保留擷取時的 1× 像素。

正式 build 關閉 JavaScript 時，三個手機視窗的場景均從邏輯 x=390 開始。啟用 JavaScript 後，初始偏移交由原生水平捲動容器維持。左右鍵每次移動可視寬度的十分之一，向下取整。

| 視窗（CSS px） | 版型 | 倍率 | 全頁 | 可視舞台 1× |
| --- | --- | ---: | --- | --- |
| 1280×720 | 桌機 | 1 | [全頁](screenshots/1280x720-full.png) | [舞台](screenshots/1280x720-stage-1x.png) |
| 1440×900 | 桌機 | 1 | [全頁](screenshots/1440x900-full.png) | [舞台](screenshots/1440x900-stage-1x.png) |
| 1920×1080 | 桌機 | 1 | [全頁](screenshots/1920x1080-full.png) | [舞台](screenshots/1920x1080-stage-1x.png) |
| 2560×1440 | 桌機 | 2 | [全頁](screenshots/2560x1440-full.png) | [舞台](screenshots/2560x1440-stage-1x.png) |
| 360×780 | 手機 | 1 | [全頁](screenshots/360x780-full.png) | [舞台](screenshots/360x780-stage-1x.png) |
| 390×844 | 手機 | 1 | [全頁](screenshots/390x844-full.png) | [舞台](screenshots/390x844-stage-1x.png) |
| 430×932 | 手機 | 1 | [全頁](screenshots/430x932-full.png) | [舞台](screenshots/430x932-stage-1x.png) |

## 初版指令結果

| 指令 | 結果 |
| --- | --- |
| `npm run assets:promote` | 通過。28 張來源及 runtime 檔案均符合 manifest。 |
| `npm run lint` | 通過，0 errors。兩個既有的 e2e ESLint 設定仍有 anonymous default export 警告。 |
| `npm run typecheck` | 通過。 |
| `npm run test -- --maxWorkers=4 --testTimeout=60000` | 716 通過，16 失敗。失敗集中在七個 Phase 1 歷史素材測試檔。 |
| Phase 2A 相關 Vitest | 6 檔、41 項全數通過。 |
| `npm run build` | 在隔離目錄通過，產出 33 個靜態頁。與 Phase 1 相同，standalone tracing 報告 `(public)/page_client-reference-manifest.js` 複製警告。 |
| `npm run test:e2e -- landing-phase-2a --project=desktop` | 7 個視窗全數通過，產出 14 張審核圖。 |
| `npm run test:e2e -- pixel-responsive public-and-auth --workers=2` | 32 項全數通過，涵蓋四個既有 Playwright 專案。 |
| `npm run test:e2e -- --workers=4` 完整套件 | 435 通過、8 失敗、21 跳過。正式 build 的 Phase 2A 七尺寸全過。跳過的是由 desktop 專案統一執行的七尺寸矩陣在其餘三個專案中的重複項目。 |
| `npm run test:spaces-db` | 通過，20 個 suite、151 項測試。 |

預設 Vitest 啟動時遇到 Windows 暫存檔改名權限問題。完整重跑將暫存目錄設在工作區內並限制 worker 數。16 個失敗分為舊壓力板 prompt／規格快照 10 項，以及舊寶箱來源 manifest 校驗 6 項。兩個被報為變動的輸入均與本輪開始時的 Git HEAD 逐位元組一致，SHA-256 分別為 `07f4905b7cbaf8e0515a8aa1f17bd1ff0db5352573a79a72e3a660682e195fd5` 與 `61f1bf4e2ec7efca3e3c80a08af1852f674868094d8912962d2c40082c636cb1`。

將三個舊寶箱套件與暫時改寫共享 manifest 的 `treasure-chest-states.test.ts` 分開，改以單 worker 重跑後為 27 通過、2 失敗。剩餘兩項在 `ancient-treasure-chest-v04.test.ts`，一項重製逾時，一項未拒絕測試寫入的變異輸出。

正式 build 的瀏覽器 Cache Storage 已驗證桌機 architecture 進入 `mimic-page-visual-v1`，該次瀏覽未載入手機場景，也沒有 `/pixel-ui/v1/` precache 條目。

完整 Playwright 的 8 個失敗包括 2 個仍載入舊 Hero 圖片斷言的案例、2 個 Phase 1 審核頁測試漏列 `phone` 專案預期寬度，以及 4 個 `phone-small` 的 real-backend 案例。舊 Hero 圖片斷言已更新並在 32 項專項重跑中通過。Phase 1 的審核頁測試為 `avatar-classes-review.spec.ts` 與 `mimiku-states-actions-review.spec.ts`，兩者都將 390px 比對到 `undefined`。

財務驗證使用只監聽 `127.0.0.1:55442` 的 PostgreSQL 17 專用 DB `mimic_financial_spaces_test`。瀏覽器與後端測試分別使用 `browser_regression` 和 `backend_regression` schema，均套用 12 筆 migration。瀏覽器 schema 匯入 31 筆系統詞彙。API 及正式 Web 分別綁定 `127.0.0.1:3048`、`127.0.0.1:3053`。

原本 20 個 real-backend 案例中有 16 個通過。以單 worker 在同一個專用 DB 重跑 `phone-small` 的五個案例後，累計 19 個通過。唯一仍失敗的是 `navigation-home-tasks.real-backend.spec.ts` 的 `phone-small` 案例。進入基金快速新增時，API 的 taxonomy picker 回報 Prisma transaction 啟動逾時，頁面顯示錯誤狀態，測試等待「新增基金支出」對話框逾時。

待視覺審核項目為桌機 letterbox、對話框配色、360px 的探索裁切及留白木牌。

## SHA-256 對照

來源為核准目錄下的相對路徑，目的檔案為 `web/public/pixel-ui/v1/` 下的同一路徑。每列分別重算來源與 runtime 雜湊並與 manifest 比對。

| 素材 | 來源與 manifest | Runtime |
| --- | --- | --- |
| frames/frame-dialogue.png | `a11877b039b95f9e51ba3a8a44c1511e24740164e062cc31e56e6f0db321139f` | `a11877b039b95f9e51ba3a8a44c1511e24740164e062cc31e56e6f0db321139f` |
| motion/title-blink-desktop.png | `c9604f74a66231953600b38528a35ef676de105416a3112d25b71a951d012cbb` | `c9604f74a66231953600b38528a35ef676de105416a3112d25b71a951d012cbb` |
| motion/title-blink-phone.png | `c044a0499103801afa6249b1a8af2663b04bd5b286436a13341098a42432a2c6` | `c044a0499103801afa6249b1a8af2663b04bd5b286436a13341098a42432a2c6` |
| props/landing/bats-desktop.png | `1e2d48012feb4391337e369d54b4f4079232529c0a2977b87402c2df2fe091e2` | `1e2d48012feb4391337e369d54b4f4079232529c0a2977b87402c2df2fe091e2` |
| props/landing/bats-phone.png | `b3fbaffd3d9b478c060b0d4dc7bb28c2149b206a63c788f22918bf391d44c3c2` | `b3fbaffd3d9b478c060b0d4dc7bb28c2149b206a63c788f22918bf391d44c3c2` |
| props/landing/chest-closed-desktop.png | `e2e804ccba88b4fdd3561241c1c7f3aed1415857c45ca84ad752236142b55315` | `e2e804ccba88b4fdd3561241c1c7f3aed1415857c45ca84ad752236142b55315` |
| props/landing/chest-closed-phone.png | `0f3d54212961f17df89d379b267f62a634b153a7cbec3166826f637579499bef` | `0f3d54212961f17df89d379b267f62a634b153a7cbec3166826f637579499bef` |
| props/landing/map-crate-desktop.png | `3b5d8676e99724ee831be2db690a83207a4c948cc611d16d3bc1973a9dcb321f` | `3b5d8676e99724ee831be2db690a83207a4c948cc611d16d3bc1973a9dcb321f` |
| props/landing/map-crate-phone.png | `5d8b731c4215782dafd26442f519bf15d7766bcb2553cb32449cab1e9cd15271` | `5d8b731c4215782dafd26442f519bf15d7766bcb2553cb32449cab1e9cd15271` |
| props/landing/sign-desktop.png | `69b3caae590795ce5866570611fd039c9c1ed337c8a33f301f85a9aa70d7d26d` | `69b3caae590795ce5866570611fd039c9c1ed337c8a33f301f85a9aa70d7d26d` |
| props/landing/sign-phone.png | `8d40ae39e9ebb21e886b1782d48b63d0e97acc7fb0eddb478e95df144e487845` | `8d40ae39e9ebb21e886b1782d48b63d0e97acc7fb0eddb478e95df144e487845` |
| props/landing/torch-high-desktop.png | `59733789a12b4da07217835369b033000b27561dc75ebdf1fc6e23c486744903` | `59733789a12b4da07217835369b033000b27561dc75ebdf1fc6e23c486744903` |
| props/landing/torch-low-desktop.png | `f44a406f22bb657f8a9bb41df947d77d025df8dc335fdfff2cccc8677dc767c0` | `f44a406f22bb657f8a9bb41df947d77d025df8dc335fdfff2cccc8677dc767c0` |
| props/landing/torch-phone.png | `52a52c100aff82f463f6fc9da21317187a30f215d2ed75b68bbc769a88b2e192` | `52a52c100aff82f463f6fc9da21317187a30f215d2ed75b68bbc769a88b2e192` |
| props/landing/wall-carving-hidden-desktop.png | `d174356f2f50d36fa7e96349beadde15b9f2c7c7d5ad2f031163e1bb7f689f7a` | `d174356f2f50d36fa7e96349beadde15b9f2c7c7d5ad2f031163e1bb7f689f7a` |
| props/landing/wall-carving-hidden-phone.png | `ce86f6aee400617cd87b095597a3b16da47aa3f59738e5ac4863317d8e0c4983` | `ce86f6aee400617cd87b095597a3b16da47aa3f59738e5ac4863317d8e0c4983` |
| props/shared/campfire-desktop.png | `3981ef5ce6deda98a36b09aeab2ae5b1169c7ba357c9eeb5689f1e1203c4793b` | `3981ef5ce6deda98a36b09aeab2ae5b1169c7ba357c9eeb5689f1e1203c4793b` |
| props/shared/campfire-phone.png | `b492f79ab23e1631663c50ccb7f105707c3854605ec3490d91823daa1249cbdc` | `b492f79ab23e1631663c50ccb7f105707c3854605ec3490d91823daa1249cbdc` |
| scenes/landing/actors/mimiku-desktop.png | `b7b39f4a4cde431623ff6e76d99476f66b02c4f06e6b95ac251647478c29eec0` | `b7b39f4a4cde431623ff6e76d99476f66b02c4f06e6b95ac251647478c29eec0` |
| scenes/landing/actors/mimiku-phone.png | `1c3cd662a4bf6df2ef7e1567f20d805370d0f96b48ea17666af8d469f71a8693` | `1c3cd662a4bf6df2ef7e1567f20d805370d0f96b48ea17666af8d469f71a8693` |
| scenes/landing/actors/ranger-desktop.png | `fdad776716166112bea51ee254c0bff41e3f8173d60ba00f8c488d12c55ac9ec` | `fdad776716166112bea51ee254c0bff41e3f8173d60ba00f8c488d12c55ac9ec` |
| scenes/landing/actors/ranger-phone.png | `fd2297f9f7cf17d3bdd187a981cdf79987642a732d49caa5d46f546d0d8c5ca9` | `fd2297f9f7cf17d3bdd187a981cdf79987642a732d49caa5d46f546d0d8c5ca9` |
| scenes/landing/actors/warrior-desktop.png | `fa155d31d7668e7d3660f89f4a90de865ca978abd725aa8bc5f591342eb252e1` | `fa155d31d7668e7d3660f89f4a90de865ca978abd725aa8bc5f591342eb252e1` |
| scenes/landing/actors/warrior-phone.png | `fede3c20ad2f3f96a1f909a379019daeee1f85e1417cced2736420cd554cb85b` | `fede3c20ad2f3f96a1f909a379019daeee1f85e1417cced2736420cd554cb85b` |
| scenes/landing/desktop-architecture.png | `0fd9727772539a54dc66d7c3461fd4d4884d4fce17cff53c8d7a0603f1c55931` | `0fd9727772539a54dc66d7c3461fd4d4884d4fce17cff53c8d7a0603f1c55931` |
| scenes/landing/desktop-ground-light.png | `1a934ff25c1585f3805e8bc08504761e50e7ed28ff41b375fbcb2589f10d7a63` | `1a934ff25c1585f3805e8bc08504761e50e7ed28ff41b375fbcb2589f10d7a63` |
| scenes/landing/phone-architecture.png | `4cd2854e8673feb4b7ba61d5f6f8172f0bf200f475085ddda7a52f310ed0f7d4` | `4cd2854e8673feb4b7ba61d5f6f8172f0bf200f475085ddda7a52f310ed0f7d4` |
| scenes/landing/phone-ground-light.png | `a07efe92662e98e028de7f9492e2361e39164278fdd8bed98eb59f548abb2bd7` | `a07efe92662e98e028de7f9492e2361e39164278fdd8bed98eb59f548abb2bd7` |

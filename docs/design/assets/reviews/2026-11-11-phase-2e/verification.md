# Phase 2E 驗證

日期 2026-11-11。規格採用 2R.1 的換色範圍。乾淨基線為 `0ab70b1`，位於 `.tmp/phase-2e-baseline/`。

## 安裝圖示

在 repo 根目錄執行 `node docs/design/assets/reviews/2026-11-11-phase-2e/recolor-install-icons.mjs`。腳本使用 Web lockfile 中的 `pngjs` 解碼六個原版核准 PNG，再依 `a > 0 && b > r && b > g && b <= 192` 選取像素。選取範圍包含背景、外框內底色、輪廓、瞳孔、嘴巴和分隔線。

亮度以 8-bit RGB 的 BT.709 加權值 `L = .2126r + .7152g + .0722b` 計算。每個檔案對所有選取像素求平均亮度 `M`，將每個選取像素寫成 `[33, 26, 24] + round(L − M)`，RGB 三個通道加上相同的數值。理論亮度位移是 `27.3438 − M`。腳本檢查通道範圍，六檔均未截斷。

腳本重新解碼輸出 PNG 與遮罩，逐像素比對 32-bit RGBA，要求變動集合與原圖的選取集合完全一致，且遮罩只有變動像素為白。所有 alpha 值與原圖一致。對輸出掃描 `a > 0 && b <= 192 && b − r > 12`，六檔均為 0。對選取像素逐一檢查實測亮度位移和理論位移的誤差。

| 新檔 | 換色像素 | RGBA 相同 | 平均亮度 M | 理論亮度位移 | 最大誤差 | SHA-256 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| favicon-16.png | 166 | 90 | 12.2322 | +15.1116 | 0.4902 | `c1931765d15fa8dd170dff6c687d1657ccb0cd688d747e893b8f1bc58b06fada` |
| favicon-32.png | 537 | 487 | 11.9195 | +15.4243 | 0.4863 | `3f10529c72c925ef6e6b4d16d90de6a93ed30d22da928c3022d256a7ba0d52eb` |
| icon-192.png | 21,298 | 15,566 | 12.1714 | +15.1724 | 0.4984 | `ace0ad9488fa03a2b2ea132d7cc72eba28ac23eb165e364120f2350807407c51` |
| icon-512.png | 150,723 | 111,421 | 12.2087 | +15.1351 | 0.4995 | `e2f712f15cd692473c6d7fe7c2f7cc3e737eec5b3856eefcdce26aefc5c0b71f` |
| icon-maskable-192.png | 26,420 | 10,444 | 14.9755 | +12.3683 | 0.4943 | `f4c0e49103fd22ea0857a9f8b5b2953c0fbe05fb32fb09ffefba1c147b6957fc` |
| icon-maskable-512.png | 188,081 | 74,063 | 14.9603 | +12.3835 | 0.4991 | `5b90a13f5c57cf5f6fe0109d04c0a75235668c0f6c50e3b1c9be4714cb0587c1` |

`production-asset-manifest.json` 的 SHA-256 為 `105c0c79ee783c72af39eb4dce85d04a8289be6766dd09c4196a23e9fdb4f74f`。原六筆為 `superseded-phase-2e`、`runtime_target: null`，原核准 PNG 供新紀錄的 lineage 使用。從 `web/` 執行 `npm run assets:promote -- --phase-2e`，驗證六個 SHA-256、複製至 `web/public/pixel-ui/v1/icons/install-warm/`、將新紀錄設為 `promoted-phase-2e`，並移除舊的六個 runtime PNG。Manifest 的四個 app icons、Serwist 的四筆安裝圖示 precache 與根 layout 的兩個 favicon PNG 均使用新路徑。

重跑換色及推廣後，manifest、ICO、六個核准 PNG、六個 runtime PNG 與六個遮罩的 SHA-256 逐一相同。與基線 manifest 比對，既有紀錄的差異限於上述六筆的狀態及 runtime 路徑。

ICO SHA-256 為 `f9f53dd908e3181fc64dc02b70d46aaaaba5d49c48354fba2fd3a6fbc08cccf4`。兩個 ICO entry 各以原始 PNG bytes 封裝。拆檔 16×16 為 `c1931765d15fa8dd170dff6c687d1657ccb0cd688d747e893b8f1bc58b06fada`，32×32 為 `3f10529c72c925ef6e6b4d16d90de6a93ed30d22da928c3022d256a7ba0d52eb`。

[圖示審閱頁](install-icons-review.html)含原版、新版、六張黑白遮罩、maskable 安全區與兩種桌布上的 60／40 CSS px 模擬。[主畫面模擬截圖](screenshots/home-screen-simulation.png)可直接檢視。

## 停用文字對比

以 WCAG 的 sRGB 線性化公式計算文字與控制項實際底色的對比。文字欄也涵蓋停用欄位的 placeholder。

| 停用控制項 | 文字 | 控制項底色 | 文字對比 |
| --- | --- | --- | ---: |
| 淺色頁與對話框的 PixelButton，包含所有 emphasis、群組提交、設定儲存及登出 | `#5a4e44` | `#ece3d3` | 6.32:1 |
| 淺色表單的 PixelField、同類樣式的 select 與 textarea | `#5a4e44` | `#ece3d3` | 6.32:1 |
| Home 離線快速記帳，一個寶箱時的 `aria-disabled` 標籤、兩個以上時的原生 disabled 按鈕 | `#bc9b65` | `#3a2c24` | 5.12:1 |
| Landing 左／右探索箭頭，捲動端點時 | `#bc9b65` | `#3a2c24` | 5.12:1 |
| 深色 app 導覽預留的停用按鈕樣式（目前五項均可用） | `#bc9b65` | `#3a2c24` | 5.12:1 |

原生 checkbox／radio 的外部標籤沿用表單文字色。例如 `ink` 在 `surface` 上為 15.35:1，`ink-soft` 在 `surface` 上為 9.95:1。淺色虛線邊對停用底色為 3.18:1，對白色為 4.05:1。深色虛線邊對停用底色為 4.76:1。停用控制項保留原來的 disabled 或 aria-disabled 狀態。手機 Landing 的左右箭頭只有移到端點才套用停用樣式，初始中段的兩個箭頭都可操作。

## 測試修改

- `manifest.test.ts` 鎖定四個 app icon 的 URL、尺寸、MIME 與 purpose。
- `pwa-cache-policy.test.ts` 以暖色圖示路徑驗證 precache。
- `assets.test.ts` 驗證 runtime 資產清單、SHA-256、原六檔的狀態與新六檔的 lineage。
- `asset-style-gate.test.ts` 驗證 131 筆核准紀錄、尺寸、狀態、檔案及來源 SHA-256。對換色圖示逐像素驗證選取集合、alpha 與殘留偏暗藍色。
- `public-pages.test.tsx` 驗證公開 header 的兩個 session 狀態，保留 Landing CTA 測試。
- `page.test.tsx` 等待非同步 layout，再檢查既有 Landing 地標。
- `landing-phase-2b.spec.ts` 將「返回基地」斷言限定在 Landing 內容區，保留登出與 service worker 離線快取驗證。
- `navigation-phase-2d.spec.ts` 對已登入的公開 header、PWA manifest 與 ICO 採用 2E 的預期值，保留導覽驗證。
- `polish-phase-2e.spec.ts` 涵蓋手機與桌機的公開路由 header、Wordmark 鍵盤焦點和往返路徑、群組／設定停用與 hover／active、兩種 Home 離線 CTA、Landing 端點與六個 PNG／ICO。

公開頁沿用 service worker 的 NetworkFirst 策略。離線時可能顯示最近一次快取的公開 header 狀態。

## Linux CI

在 WSL 的原生檔案系統以 `core.autocrlf=false` checkout `0ab70b1`，從乾淨的 Git 快照套入本輪未 stage 的 Web 變更與核准素材。使用 Docker `node:22`（`v22.23.4`）執行四個 CI job 的驗證。後端與 Web 各執行 `npm ci`，後端 Prisma 以 `npm run prisma:generate` 產生。Web 使用 `MIMIC_API_BASE_URL=http://localhost:3000/api/v1`、`MIMIC_COOKIE_SECURE=false`、`VITEST_MAX_WORKERS=2`。

| Job | 結果 |
| --- | --- |
| Naming | 命名守門測試 6 通過，repo 命名掃描通過。 |
| Backend | Prisma generate、build 通過，Jest 322 通過，HTTP e2e 37 通過。 |
| Web | CI workflow contract 32 通過，lint 0 錯誤與兩項既有審閱設定警告，typecheck 通過，Vitest 126 檔、661 測試通過，production build 通過。 |
| Containers | Production image 與備份行為合計 19 個 contract tests 通過。API 和 backup 映像建置通過。備份三支 POSIX shell 的語法、PostgreSQL 18 工具與 age、minisign、AWS CLI 的 runtime 檢查通過。API 和 Web 以 loopback 綁定啟動，健康端點回傳 `{"data":{"ok":true}}`。 |

備份映像第一次在 Alpine 下載依賴時停滯，以原 Dockerfile 加 `--network host` 重跑後完成。後端和 Web 的 Dockerfile、CI workflow、Railway 設定與後端程式維持基線內容。

### 公開路由的建置輸出

| 路由 | 基線 0ab70b1 | Phase 2E |
| --- | --- | --- |
| `/` | ƒ 動態 | ƒ 動態 |
| `/features` | ○ 靜態 | ƒ 動態 |
| `/privacy` | ○ 靜態 | ƒ 動態 |
| `/terms` | ○ 靜態 | ƒ 動態 |
| `/invite/[code]` | ƒ 動態 | ƒ 動態 |

### 兩個 Web 映像

兩次均以 `web` 為 context、`MIMIC_API_BASE_URL=http://127.0.0.1:3000/api/v1` 為 build arg，依原 Dockerfile 建置。兩個 runtime 都使用 Node `v22.23.2`、`node` 使用者及 `["node","server.js"]`。各自以 `--publish 127.0.0.1::3000` 啟動，`/api/health/live` 都回傳 `{"data":{"ok":true}}`。

| Dockerfile | 結果 | Docker image ID |
| --- | --- | --- |
| `web/Dockerfile` | build、health 通過 | `sha256:387cbad3b5b563af22e8973723974ff66009db8ddf72a261571ec14868cf4b7d` |
| `web/Dockerfile.railway` | build、health 通過 | `sha256:80dc01629c8a6fcea0425d4534e92dee83b103002c1ce5c8d3c585ec8dbe71be` |

## 像素回歸

基線與候選都使用 Linux production build。沿用 2E-1 的取樣方式，暫停場景動畫，等待字型與可見圖像載入。Landing 使用訪客初始中段，從整頁 PNG 裁掉 header。Home 使用同一真實帳號及相同線上空白狀態，在 Home 的 fire、idle、ledger 圖層均載入後取樣可見的 `[data-home-viewport]`。逐對檢查尺寸，再逐像素比對 RGBA，容差為 0。

| 區域 | 視窗尺寸 | 配對數 | RGBA 相異像素 |
| --- | --- | ---: | ---: |
| Landing header 以下 | 360×780、390×844、430×932、768×1024、1024×768、1280×720、1366×768、1440×900、1536×864、1920×1080、2560×1440 | 11 | 0 |
| Home 線上場景區 | 同上 | 11 | 0 |

本機逐對 PNG 在 `.tmp/phase-2e-pixels/`，比對結果在 `.tmp/phase-2e-pixels-direct.log`。Home 離線與 Landing 捲動端點的停用控制項由瀏覽器行為測試檢查。

## Playwright

瀏覽器連線到 WSL 上的正式 Web 建置與實際 API。專用 PostgreSQL 18 資料庫 `mimic_phase_2e` 只發布到 `127.0.0.1:38432`，套用 12 個 migration 並建立系統分類。前後版本的畫面取樣使用這個資料庫，停用按鈕取樣會暫停對應的瀏覽器 request。

| Spec | 通過 | 瀏覽器 |
| --- | ---: | --- |
| `landing-phase-2a` | 10/10 | Playwright Chromium Headless Shell |
| `landing-phase-2b` | 22/22 | Chrome Headless 158.0.8127.18，啟用離線 service worker 與動態影片取樣 |
| `home-phase-2c` | 5/5 | Playwright Chromium Headless Shell |
| `navigation-phase-2d` | 11/11 | Playwright Chromium Headless Shell |
| `polish-phase-2e` | 8/8 | Playwright Chromium Headless Shell |

最後調整的兩個 e2e 檔案已再用 Linux `node:22` 通過 typecheck 與 ESLint。產品程式的 Web Docker build context 邊界測試通過。

## 截圖

群組與設定的畫面是在提交後暫停各自的 HTTP request 時擷取。Home 畫面使用一個有效寶箱，從線上切換到離線後擷取對話框。

| 畫面 | 390×844 | 1440×900 |
| --- | --- | --- |
| 公開 header | [訪客](screenshots/public-header-guest-390x844.png) · [已登入](screenshots/public-header-session-390x844.png) | [訪客](screenshots/public-header-guest-1440x900.png) · [已登入](screenshots/public-header-session-1440x900.png) |
| app 頂欄鍵盤焦點 | [Wordmark](screenshots/app-wordmark-focus-390x844.png) | [Wordmark](screenshots/app-wordmark-focus-1440x900.png) |
| 建立群組送出中 | [改前](screenshots/group-pending-390x844-before.png) · [改後](screenshots/group-pending-390x844-after.png) | [改前](screenshots/group-pending-1440x900-before.png) · [改後](screenshots/group-pending-1440x900-after.png) |
| 設定儲存中 | [改前](screenshots/settings-pending-390x844-before.png) · [改後](screenshots/settings-pending-390x844-after.png) | [改前](screenshots/settings-pending-1440x900-before.png) · [改後](screenshots/settings-pending-1440x900-after.png) |
| Home 離線 | [改前](screenshots/home-offline-390x844-before.png) · [改後](screenshots/home-offline-390x844-after.png) | [改前](screenshots/home-offline-1440x900-before.png) · [改後](screenshots/home-offline-1440x900-after.png) |

## 交付

共 19 張審閱截圖與六張像素遮罩。`.agents/devlog.md` 原有 259,321 位元組逐位元組保留，本輪追加段落使用 CRLF。工作區的 HEAD 維持 `0ab70b1`，Git index 無差異。交付停在視覺審核。

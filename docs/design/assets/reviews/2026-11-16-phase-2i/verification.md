# Phase 2I-1 驗證紀錄

2026-11-17。2R4 的 header 預檢通過。下列預檢保留歷次量測與截圖。

## Landing header 預檢

Windows Chrome 使用本機 Next.js 的 Landing 與原有 CSS。量測腳本 `.tmp/phase-2i-header-probe.cjs` 在瀏覽器插入與既有連結同 class 的語言按鈕，換入核准文案，模擬登入前後的連結文字。使用 Chromium 的文字範圍行數和 `max-content` 寬度量測。截圖來自此預檢，正式語言切換尚未接通。

| 視窗 | 語言／狀態 | 導覽內寬 | 結果 |
| --- | --- | ---: | --- |
| 360×800 | 中／英，未登入與已登入 | 328 px | 四組皆單行。最緊的是英文已登入，整列需 326.70 px |
| 390×844 | 中文，未登入 | 358 px | 「功能」、「登入」各分到 43.95 px，單行各需 56.00 px，皆換成兩行 |
| 390×844 | 中文，已登入 | 358 px | 「功能」41.39／56.00 px，「返回基地」58.77／88.00 px，皆換成兩行 |
| 390×844 | 英文，未登入 | 358 px | 「中文」37.34／50.67 px、Log in 56.02／77.36 px，皆換成兩行 |
| 390×844 | 英文，已登入 | 358 px | 「中文」37.34／50.67 px，換成兩行，Back to base 68.19／138.42 px，換成三行 |

360 px 套用既有 `max-width: 380px` 的 header 排版，隱藏副字標並使用較小的間距。390 px 顯示完整字標，並使用一般間距。

- 中文未登入與已登入。[未登入](screenshots/landing-header-preflight-signed-out-zh-Hant-390x844.png) · [已登入](screenshots/landing-header-preflight-signed-in-zh-Hant-390x844.png)
- 英文未登入與已登入。[未登入](screenshots/landing-header-preflight-signed-out-en-390x844.png) · [已登入](screenshots/landing-header-preflight-signed-in-en-390x844.png)

## 2R3 斷點與替代字型

`.tmp/phase-2i-header-2r3.cjs` 在 Chrome 158.0.8127.37 重用 Landing 的 header 和 CSS，加入同 class、同計算字級的語言按鈕。先保留完整版 CSS，量測導覽列內寬減去字標、三個控制項單行所需的寬度與間距，並核對各控制項行數。完整版在 541 px 時英文已登入仍不足 0.19 px，在 542 px 時四組皆單行，因此依 2R3 向上取整，緊湊版上限為 **544 px**。

| 視窗寬度 | 中文未登入餘裕 | 中文已登入餘裕 | 英文未登入餘裕 | 英文已登入餘裕 | 四組皆單行 |
| ---: | ---: | ---: | ---: | ---: | :---: |
| 390 px | −56.14 px | −88.14 px | −90.13 px | −151.19 px | 否 |
| 393 px | −53.14 px | −85.14 px | −87.13 px | −148.19 px | 否 |
| 412 px | −34.14 px | −66.14 px | −68.13 px | −129.19 px | 否 |
| 414 px | −32.14 px | −64.14 px | −66.13 px | −127.19 px | 否 |
| 430 px | −16.14 px | −48.14 px | −50.13 px | −111.19 px | 否 |
| 541 px | 94.86 px | 62.86 px | 60.88 px | −0.19 px | 否 |
| 542 px | 95.86 px | 63.86 px | 61.88 px | 0.81 px | 是 |
| 543 px | 96.86 px | 64.86 px | 62.88 px | 1.81 px | 是 |
| 544 px | 97.86 px | 65.86 px | 63.88 px | 2.81 px | 是 |
| 545 px | 98.86 px | 66.86 px | 64.88 px | 3.81 px | 是 |

360×800 的導覽內寬為 328 px，沿用現有緊湊版 CSS。Chromium DevTools 確認實際使用指定的 Roboto Black 或 Liberation Sans Bold，中文字元使用微軟正黑體，量測節點未使用 Arial。八組都維持單行，且餘裕皆高於 8 px。

| 字型 | 中文未登入餘裕 | 中文已登入餘裕 | 英文未登入餘裕 | 英文已登入餘裕 |
| --- | ---: | ---: | ---: | ---: |
| Roboto | [107.52 px](screenshots/landing-header-preflight-zh-signed-out-roboto-360x800.png) | [78.72 px](screenshots/landing-header-preflight-zh-signed-in-roboto-360x800.png) | [87.56 px](screenshots/landing-header-preflight-en-signed-out-roboto-360x800.png) | [44.16 px](screenshots/landing-header-preflight-en-signed-in-roboto-360x800.png) |
| Liberation Sans | [101.42 px](screenshots/landing-header-preflight-zh-signed-out-liberation-sans-360x800.png) | [72.63 px](screenshots/landing-header-preflight-zh-signed-in-liberation-sans-360x800.png) | [79.03 px](screenshots/landing-header-preflight-en-signed-out-liberation-sans-360x800.png) | [33.38 px](screenshots/landing-header-preflight-en-signed-in-liberation-sans-360x800.png) |

### 320 px 手機補測

既有 Playwright `phone-small` 與 Phase 2B Landing 測試涵蓋 320 px。使用相同的測試頁與目前的緊湊 CSS，保留產品字型設定，Chromium DevTools 確認拉丁字元使用 Arial Black，中文使用微軟正黑體。

| 語言／狀態 | 導覽內寬 | 單行所需寬度 | 餘裕 | 結果 |
| --- | ---: | ---: | ---: | --- |
| 中文未登入 | 288 px | 241.17 px | 46.83 px | 單行 |
| 中文已登入 | 288 px | 269.97 px | 18.03 px | 單行 |
| 英文未登入 | 288 px | 271.75 px | 16.25 px | 單行 |
| 英文已登入 | 288 px | 326.70 px | −38.70 px | 「中文」與 Back to base 都換成兩行 |

英文已登入時，「中文」分到 34.72 px，單行需 43.19 px。Back to base 分到 87.13 px，單行需 117.36 px。320 px 已套用原本的緊湊 CSS，延伸斷點不會改變此尺寸的結果。此輪尚未改產品樣式或文案。[320×720 預檢截圖](screenshots/landing-header-preflight-en-signed-in-default-320x720.png)

## 2R4 英文已登入 header

在 `.tmp/phase-2i-header-2r3.cjs --2r4` 套用獨立的 `Base` 文案與 544 px 緊湊版上限。18 組都維持單行，320 px 的三種字型均高於 8 px。Arial 欄是產品字型設定，在此 Chrome 實際使用 Arial Black，中文沿用微軟正黑體。

| 視窗寬度 | Arial 餘裕 | Roboto 餘裕 | Liberation Sans 餘裕 |
| ---: | ---: | ---: | ---: |
| 320 px | [25.06 px](screenshots/landing-header-2r4-en-signed-in-arial-320x720.png) | [55.25 px](screenshots/landing-header-2r4-en-signed-in-roboto-320x720.png) | [47.78 px](screenshots/landing-header-2r4-en-signed-in-liberation-sans-320x720.png) |
| 360 px | 65.06 px | 95.25 px | 87.78 px |
| 390 px | 95.06 px | 125.25 px | 117.78 px |
| 543 px | 248.06 px | 278.25 px | 270.78 px |
| 544 px | 249.06 px | 279.25 px | 271.78 px |
| 545 px | 74.67 px | 115.72 px | 107.22 px |

## 實作與驗證狀態

- 建立 `.tmp/phase-2i-baseline` 的乾淨 `1915613` worktree。
- 安裝 `next-intl`，依賴範圍為 `^4.15`，lockfile 鎖定 4.15.1。以 Node 22 的 npm 重建 lockfile 後，加回 `next-intl` 的巢狀 SWC peer `@swc/helpers@0.5.24`。
- Home contract 的 participant card 現要求 `latest_recorded` 存在，保留 `null`。治理卡的契約維持獨立。修改契約測試中直接覆蓋缺欄位的案例與同檔有效資料 fixture。

### 架構與盤點

- `web/next.config.ts` 設定 request plugin，依 Next Intl、Serwist、Sentry 順序包裝。`web/src/i18n/` 提供設定、cookie-based request config、訊息型別及中英字典。根 layout 只傳用到的 client namespace，伺服器專用的 Landing 功能、法律文案、header 文案和功能摘要在伺服器翻譯。
- `/api/locale` 沿用現有 mutation 的 double-submit cookie 與 `x-csrf-token` 檢查。語言選擇以既有 client `appFetch` 取得 CSRF token。登入與註冊成功後用新 access token 同步。公開頁 e2e 實測 `router.refresh()` 可更新 `<html lang>`，鍵盤切換後焦點仍在原按鈕。
- API route handlers 回傳狀態與代碼，現有 `messageForStatus` 產生的 `ApiError.message` 沒有作為畫面文案。畫面已透過對應的功能 namespace 翻譯錯誤。保留 API 錯誤文字供診斷使用。
- Auth Zod issue 保存訊息 key，由表單 render 翻譯。全域錯誤邊界用雙語，因它是取代根 layout 的 client 邊界，首次 render 無 request cookie 或 provider。SW fallback 也使用雙語，文件維持 `zh-Hant`。
- 登入後若採用帳號語言而且和登入頁不同，使用完整文件導覽。Production e2e 在新 context 重現登入成功後仍沿用舊根 layout 的 `lang`，而公開頁語言按鈕與設定仍使用 `router.refresh()`。
- 每種語言 165 個 key。各 namespace 為 `brand` 5、`common` 2、`language` 6、`nav` 9、`landing` 46、`auth` 30、`shell` 4、`settings` 22、`routeState` 17、`pwa` 7、`invite` 17。
- 2R2 的 `web/e2e/helpers/omit-home-latest-recorded.mjs` 只綁 `127.0.0.1`。它讀取指向真實 API 的 `MIMIC_API_BASE_URL`；專用 Web 實例的同一變數指向代理。依序啟動並驗證代理健康後才啟動 Web。代理及 Web 埠可用 `MIMIC_PHASE_2I_PROXY_PORT`（32141）與 `MIMIC_PHASE_2I_WEB_PORT`（32142）指定。
- 2R2 指令在 `web/` 執行 `npm run test:e2e -- --config playwright.phase-2i-missing-home.config.ts`，執行前設定真實 `MIMIC_API_BASE_URL` 和專用的 127.0.0.1 `MIMIC_RUNTIME_DATABASE_URL`。Chrome 實測通過既有錯誤狀態、`pageerror` 為 0、沒有新游標。

| 範圍 | 主要檔案 |
| --- | --- |
| 語言選擇與帳號 | `src/i18n/`、`src/app/api/locale/`、`src/shared/i18n/`、登入與註冊 API routes |
| 公開頁與登入表單 | `src/app/(public)/`、`src/shared/brand/`、`src/features/auth/`、`src/features/invitations/invite-accept-panel.tsx`、`invite-errors.ts` |
| 外殼、設定、狀態頁 | `src/shared/navigation/`、`scene-pause-button.tsx`、設定 route 與 form、`app-route-state.tsx`、App 載入頁與 `global-error.tsx` |
| PWA | `src/app/layout.tsx`、`manifest.ts`、`sw.ts`、`src/app/offline/page.tsx`、`update-notice.tsx` |
| Home 與自動驗證 | `home-contracts.ts`、`home-page.tsx`、`i18n-phase-2i.spec.ts`、2H 代理設定、各變更模組旁的 Vitest 與共用 render helper |

### 2R 既有 e2e 可及名稱

| 位置 | 原名 → 中文 | 訊息 key |
| --- | --- | --- |
| `web/e2e/navigation-phase-2d.spec.ts:87` | Settings → 設定 | `settings.title` |
| `web/e2e/navigation-phase-2d.spec.ts:166` | Settings → 設定 | `settings.title` |
| `web/e2e/pixel-responsive.spec.ts:60` | Log in to accept → 登入以接受邀請 | `invite.login` |
| `web/e2e/invitation-flow.spec.ts:19` | Log in to accept → 登入以接受邀請 | `invite.login` |
| `web/e2e/fixtures/accounts.ts:289` | Create account → 建立帳號 | `invite.register` |
| `web/e2e/polish-phase-2e.spec.ts:128` | Display name → 顯示名稱 | `settings.displayName` |
| `web/e2e/polish-phase-2e.spec.ts:131` | Save changes → 儲存變更 | `settings.save` |
| `web/e2e/polish-phase-2e.spec.ts:133` | Saving... → 儲存中... | `settings.saving` |
| `web/e2e/polish-phase-2e.spec.ts:133` | Sign out → 登出 | `settings.signout` |

### 已取得的測試結果

- Windows Web typecheck 與 lint 已執行通過。lint 報告兩個既有的 review ESLint 設定警告。
- Windows Chrome 公開頁切換、登入與註冊驗證、manifest 共 3 案通過。英文 Home 導覽在 360、390、1440 px 三種尺寸都沒有文字截斷。
- Linux Node 22 的 Active Mimic naming job 通過。Backend job 通過組建、323 個 unit tests 與 37 個 HTTP e2e。
- Production Web 以真實專用 PostgreSQL 與 `1915613` API 驗證三個既有 2H ledger 案例，全部通過。缺系統分類的首次直連測試在種入 `seedTaxonomy` 前回傳 `SYSTEM_TAXONOMY_MISSING`。部署錯配的負向案例由 2R2 獨立執行。
- Production browser 通過公開頁、auth 文案驗證、manifest、雙語 SW fallback 與導覽。修正登入後根 layout 語言後，最終映像重跑新 context 登入與設定案例通過，包含帳號 locale、cookie、`<html lang>`、radio 焦點及中文 status。
- Linux Web PWA 安裝、Prisma、CI workflow 契約、lint、typecheck、預設 Vitest 與 webpack build 步驟均通過。最終 Vitest 為 135 個檔案、700 個測試全通過。初次 Linux Vitest 找出寶箱 loading 一處漏搬的文案，最終測試已覆蓋。
- Linux Production containers job 的 image contract、backup 行為契約、三個 CI image 建置、backup shell 與 PostgreSQL 18 客戶端 smoke、API 與 Web health 都通過。最終 `web/Dockerfile` 與 `web/Dockerfile.railway` 各重建一次，都以 `node` 使用者執行 `node server.js`。`/api/health/live` 回 200，`GET /` 無 cookie 是 `zh-Hant`，帶 `mimic-locale=en` 是 `en`。
- Linux checkout 由 `1915613` 以 `core.autocrlf=false` 建立，再套用本輪工作檔案。原始紀錄在 `.tmp/phase-2i-ci-containers-retry.log`、`.tmp/phase-2i-final-web.log` 與 `.tmp/phase-2i-final-images.log`。
- Windows 安裝版 Chrome 額外請求 `favicon-32.png`，使 2A 的資源清單斷言失敗。以同一瀏覽器在乾淨 `1915613` production 基線重現。2A 保留原斷言，使用 Linux Playwright 映像內建 Chromium 重跑，資源清單測試通過。
- 最終 Linux Chromium 單套依序執行 2A–2H、2I，以及既有公開邀請與 responsive 案例。80 通過、0 失敗、3 跳過。兩個跳過項是選用 Landing 錄影，另一個是由獨立設定執行且已通過的 2R2 代理案例。原始紀錄在 `.tmp/phase-2i-e2e-linux-final.log`。
- §7.3 英文浮動按鈕的驗證路徑待定。Home 的記帳入口位於 2I-2 範圍內的對話框。`PixelAppShell` 在 `/app` 隱藏浮動按鈕。§7.4 寶箱驗證依 2R5 改用乾淨基線重拍。

## 中文像素比對

production 基線由乾淨 `1915613` checkout 建置。兩側都連到同一個 `1915613` API 與測試資料，使用相同 Chrome、視窗與瀏覽器字型。測試停用 SW 並使用既有的場景暫停控制，等待圖層解碼完成。比對原始 RGBA，容差為 0，使用整頁截圖。

| 畫面 | 相同／總數 | 比對範圍 |
| --- | ---: | --- |
| Landing | 11/11 | Header 以下，11 張 header 遮罩另存 |
| Home empty | 11/11 | 整頁，含外殼 |
| Home ready | 11/11 | 整頁，含外殼 |
| Home offline | 11/11 | 整頁，含外殼 |
| 2H 個人、分帳、基金寶箱 | 見 2R5 | 以乾淨基線重新擷取整頁 |

Landing 在桌機尺寸每組 header 差 557 px，360×780 差 437 px，390×844 和 430×932 每組差 2,023 px。差異全部在 header 列。後兩個尺寸含緊湊斷點延伸造成的副字標隱藏。Home empty 430×932 首次擷取差 2 px，重拍後為 0；其他組首次擷取即相同。原始比對紀錄在 `.tmp/phase-2i-pixels-zh.log`。

[390 px Landing 基線](screenshots/landing-390x844-zh-before.png) · [390 px Landing 候選](screenshots/landing-390x844-zh-after.png) · [390 px header 差異遮罩](screenshots/landing-390x844-zh-header-mask.png)

## 英文與預期有變化的中文畫面

英文共 76 張。一般頁面各有 360×800、390×844、1440×900。手機 Landing 三段各有 360 與 390 兩種，五句台詞各有 360 與 1440 兩種。檔名依 `<頁面>-<狀態>-en-<寬>x<高>.png`。

| 畫面 | 檔名前綴 |
| --- | --- |
| Landing、分段與互動 | `landing-initial`、`landing-segment-1` 至 `3`、`landing-chest-open`、`landing-chest-closed`、`landing-carving`、`landing-bats`、`landing-torch` |
| 公開頁與邀請 | `features-default`、`privacy-default`、`terms-default`、`invite-valid`、`invite-invalid` |
| 登入與註冊 | `login-default`、`login-validation`、`register-default`、`register-validation` |
| App 與設定 | `home-shell`、`settings-default`、`settings-language`、`settings-language-changed` |
| 錯誤、載入與 PWA | `app-route-error`、`app-route-loading`、`not-found-default`、`global-error-default`、`offline-default`、`update-notice-default` |

GlobalError 與更新通知截圖使用原產品元件的 fixture render。載入和 App 錯誤截圖由 production Web 實際呈現，僅截圖用的 loopback API 依指定請求回傳錯誤或延後群組讀取。雙語 SW fallback 另有實際離線 browser e2e。

中文預期變化使用 390×844 的前後截圖。涵蓋 settings、login、register、invite-invalid、not-found、offline 六頁。

[360 px Landing 台詞](screenshots/landing-carving-en-360x800.png) · [360 px 設定切換成功](screenshots/settings-language-changed-en-360x800.png) · [390 px 錯誤頁](screenshots/app-route-error-en-390x844.png)

## 2R5 副標與中文像素回歸

公開頁和 App 頂欄使用 `brand.speaker`。英文顯示 `Mimiku`，繁中顯示 `咪咪庫 / Mimiku`。Windows 預設設定 Vitest 共 700 個測試通過，TypeScript 檢查通過。ESLint 為 0 錯誤、2 個既有設定檔警告。

基線是乾淨的 `1915613` production Web（127.0.0.1:3780），候選由同一 commit 的 `core.autocrlf=false` Linux checkout 套用本輪 Web 檔案後，用 `web/Dockerfile` 重建（127.0.0.1:3787）。兩側的 `/api/health/live` 均通過，同接 `1915613` API（127.0.0.1:3771）和專用 PostgreSQL（127.0.0.1:39468）。每組使用相同測試帳號、資料、螢幕尺寸與 Windows Chrome 158.0.8127.37。停用 SW、等圖層和字型完成渲染，再以 RGBA 零容差比對。Home idle 使用含一筆個人支出的線上資料，並以同一份資料擷取 offline 畫面。

公開頁英文 header 在 543、544、545 px 各測訪客和已登入。六組可見字標與按鈕都在同一列，每段文字都只有一行，且全數落在導覽列內。543／544 px 依緊湊樣式隱藏副標，545 px 顯示 `Mimiku`。[544 px 訪客](screenshots/2r5/landing-header-guest-en-544.png) · [544 px 已登入](screenshots/2r5/landing-header-signed-in-en-544.png) · [545 px 訪客](screenshots/2r5/landing-header-guest-en-545.png) · [545 px 已登入](screenshots/2r5/landing-header-signed-in-en-545.png)

| 英文重拍 | 360×800 | 390×844 | 1440×900 |
| --- | --- | --- | --- |
| Landing | [360x800](screenshots/2r5/landing-initial-en-360x800.png) | [390x844](screenshots/2r5/landing-initial-en-390x844.png) | [1440x900](screenshots/2r5/landing-initial-en-1440x900.png) |
| Home | [360x800](screenshots/2r5/home-shell-en-360x800.png) | [390x844](screenshots/2r5/home-shell-en-390x844.png) | [1440x900](screenshots/2r5/home-shell-en-1440x900.png) |
| 設定 | [360x800](screenshots/2r5/settings-default-en-360x800.png) | [390x844](screenshots/2r5/settings-default-en-390x844.png) | [1440x900](screenshots/2r5/settings-default-en-1440x900.png) |

### 中文寶箱整頁比對

| 寶箱 | 相同／總數 | 390×844 基線 | 390×844 候選 |
| --- | ---: | --- | --- |
| 個人 | 11/11 | [基線](screenshots/2r5/baseline/personal-390x844-zh-before.png) | [候選](screenshots/2r5/personal-390x844-zh-after.png) |
| 分帳 | 11/11 | [基線](screenshots/2r5/baseline/shared-390x844-zh-before.png) | [候選](screenshots/2r5/shared-390x844-zh-after.png) |
| 基金 | 11/11 | [基線](screenshots/2r5/baseline/pooled-390x844-zh-before.png) | [候選](screenshots/2r5/pooled-390x844-zh-after.png) |

分帳 2560×1440 首次擷取差 2 個像素，重拍基線及候選後差 0。其餘 32 組首次擷取即相同。原始比對紀錄在 `.tmp/phase-2i-2r5-chests.log`。

### 中文 Home 與 Landing 重跑

| 畫面 | 相同／總數 | 範圍 |
| --- | ---: | --- |
| Home idle | 11/11 | 整頁 |
| Home empty | 11/11 | 整頁 |
| Home ready | 11/11 | 整頁 |
| Home offline | 11/11 | 整頁 |
| Landing | 11/11 | Header 以下 |

Home ready 390×844 首次擷取差 2 個像素，重拍基線及候選後差 0。其他 Home 與 Landing 組首次擷取即通過。Landing 桌機八組各差 557 個像素，360×780 差 437 個，390×844 和 430×932 各差 2,023 個，差異皆在 header 內。11 組前後截圖和 header 遮罩均已留存。

三種寶箱、Home 與 Landing 使用 768×1024、1024×768、1280×720、1366×768、1440×900、1536×864、1920×1080、2560×1440、360×780、390×844、430×932。候選、遮罩在 `screenshots/2r5/`，基線在 `screenshots/2r5/baseline/`。原始紀錄在 `.tmp/phase-2i-2r5-zh.log`，擷取及比對程式為 `.tmp/phase-2i-2r5-pixels.cjs`。

[390×844 Home ready 基線](screenshots/2r5/baseline/home-ready-390x844-zh-before.png) · [候選](screenshots/2r5/home-ready-390x844-zh-after.png)  
[390×844 Landing 基線](screenshots/2r5/baseline/landing-390x844-zh-before.png) · [候選](screenshots/2r5/landing-390x844-zh-after.png) · [header 遮罩](screenshots/2r5/landing-390x844-zh-header-mask.png)

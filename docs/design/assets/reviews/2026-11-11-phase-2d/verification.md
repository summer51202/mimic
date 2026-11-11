# Phase 2D 導覽列與圖示驗證

2026-11-11。基線為 `.tmp/phase-2d-baseline` 的 `b767be13f5adb41e06ca76d3edd37bb2b0148cb2`。正式版 Web 於 `127.0.0.1:3325`（基線）與 `127.0.0.1:3326`（候選）。真實 API 為 `127.0.0.1:3324`，專用 PostgreSQL 為 `127.0.0.1:55445/mimic_phase_2d`，已套用 12 個 migration 並補系統分類。前後對照使用同一組 fixture。

## 素材與 PWA

`npm run assets:promote -- --phase-2d` 推廣以下 12 檔。逐檔重算核准原檔及 runtime 副本，兩者都與 manifest 的 SHA-256 一致。其餘 manifest 紀錄逐筆相同。

| 核准路徑 | SHA-256 |
|---|---|
| `icons/install/favicon-16.png` | `3aeff4325d6240fcdaeca8fa9e9ba7d4dd13cf1395dd7f9f7d799271f1942b8f` |
| `icons/install/favicon-32.png` | `a1aa2d33ae24fb27c68ca472c10a965b984d233e608740f7ac001621d4f216cf` |
| `icons/install/icon-192.png` | `c6390c23645fa642e1d3ba561c4506b2cae9606c12c08ffbaded47e7333e9988` |
| `icons/install/icon-512.png` | `4d40441a62d2c3ae15294d6e281a12638e780eb8dbca9a06b8ca8216591a0d56` |
| `icons/install/icon-maskable-192.png` | `834a3812fd56ef0803fcef33412cbbbfebcd6c3200203314d75299eff03859b8` |
| `icons/install/icon-maskable-512.png` | `7f9c937516e8bf30ef6ddbfbb0d513932bf317b82badfacafca557c22061c441` |
| `icons/ui/action-record-expense.png` | `8e559e179652c8b05b2e513e00cc9b5ef6cf3cec87011118ae7bdaf2b21ab0e3` |
| `icons/ui/nav-adventure-log.png` | `e5bbd136aa6fe35c731401fb103e1adcccf83114321bba144b6803c001da196c` |
| `icons/ui/nav-guild.png` | `98194202610f382fe1394077fa889b7b0aa5d573679c5ad30b8631c2dd2971dd` |
| `icons/ui/nav-home.png` | `eb52eed0cf5596a333b361d3cd140ee7b27084af2dad7d4f2a6bb931aabf2364` |
| `icons/ui/nav-settings.png` | `df47c1d7c0c961cb659757e144c6137ac681e8eedbc7909e49133704df023cce` |
| `icons/ui/nav-tasks.png` | `928b10b5a834a23c60e9176aaaefbfc80d252a2dd2ee136fd1feaf09b87b465e` |

- 核准素材 manifest SHA-256 為 `7fc7c236514255504d8cb6e851fc2571b29a4a6dbe871ca7107d680d98a70e9a`。
- ICO SHA-256 為 `ac40289ba4e258b9bd9d7cbd3cba30c2019f1712f49aecf8e7d37f2299a3783b`。兩筆目錄項指向內嵌 PNG，按 offset／length 拆出後的 SHA-256 各等於上表 favicon-16／32。
- `manifest.webmanifest` 的正式版 SHA-256 為 `64ec14613501dd72468fb8678ba5e303adc7b5dbd3e035adb5ad6dbb1a345f11`。四個安裝圖示及 precache 指向 `/pixel-ui/v1/icons/install/`。實測 `theme_color` 為 `#211a18`，`background_color` 為 `#fffaf0`。根頁的 16／32 PNG metadata link 與 ICO 由新 e2e 驗證。
- 舊 `web/public/icons/`、根 `icon.png` 及 2B／2C 的 123 份歷史截圖與錄影逐檔 SHA-256 等於基線。

## 觸發停止的量測

Chromium 載入專案的 `tokens.css`、`globals.css`、`pixel-frame.module.css`。讀取文字色、背景色與 `opacity` 的 computed style，再將整顆按鈕的前景與背景分別與下方白色 panel 合成，以相對亮度計算對比。隔離頁只含樣式與按鈕，未使用財務資料。

| 白色 panel 上的 `PixelButton` | 現行 `#17213a` | 候選 `#211a18` |
|---|---:|---:|
| Primary，啟用 | 8.95:1 | 9.61:1 |
| Primary，停用 | **2.69:1** | **2.80:1**，豁免（停用） |
| Secondary，啟用 | 7.24:1 | 7.76:1 |
| Secondary，停用 | **2.44:1** | **2.54:1**，豁免（停用） |
| Ghost，啟用 | 15.97:1 | 17.13:1 |
| Ghost，停用 | **3.70:1** | **3.85:1**，豁免（停用） |

可追查的實際狀態是 `/app/groups/new` 表單送出時的 `Create group`。頁面以白色 `PixelFrame` 包住表單，送出期間按鈕設為 `disabled={pending}`。停用樣式會把整顆按鈕的透明度設為 `0.55`。對比不足在現行色下已存在，候選色仍低於本案一般文字的 4.5:1 門檻。第一輪因此停止。2R.1 將停用元件列為豁免，候選版的三項數值皆高於基線。[群組頁](../../../../../web/src/app/app/groups/new/page.tsx#L13) · [群組表單](../../../../../web/src/features/groups/group-form.tsx#L125) · [停用樣式](../../../../../web/src/app/globals.css#L101) · [Panel 背景](../../../../../web/src/shared/ui/pixel-frame.module.css#L30)

## 現行 `hud-dark` consumer 盤點

行號以 `b767be1` 為準。各欄列出對應的 CSS 宣告行，來源路徑均相對於 `web/src/`。定義在 `styles/tokens.css:16`，Home 局部覆寫在 `features/home/home.css:1`。

| 檔案 | 邊框 | 文字 | 陰影 | 背景 |
|---|---|---|---|---|
| `app/globals.css` | 45、132、193 | 62、67、77、120、136、161、196 | 92 | 166（遮罩） |
| `styles/tokens.css` | | | 45（`shadow-stepped`） | |
| `shared/ui/pixel-frame.module.css` | | | 25、37（透過 `shadow-stepped`） | |
| `features/home/home.css` | 3、5、7 | 4 | | |
| `features/home/home-scene.module.css` | | 80、99 | | 125 |
| `features/groups/group-switcher.module.css` | 10 | 14 | | |
| `features/groups/group-management.module.css` | 131 | 29、59、84、133 | | |
| `features/invitations/invitation-flow.module.css` | 32 | 34 | | |
| `features/pooled-funds/pooled.css` | 17、18 | 16、32 | | |
| `features/shared-expenses/shared.css` | 176、213 | 147、168、178、188、220 | | |
| `features/tasks/tasks.css` | 2、5 | | | |
| `features/settings/settings.module.css` | 62 | 19 | | 63 |
| `shared/navigation/pixel-app-shell.module.css` | 22 | 24 | 25 | 7（漸層）、44 |


## 2R 對比結論

本表以 CSS 色票的 sRGB 相對亮度計算前景／背景對比。漸層使用最大 10% 混色端點作下限，按鈕透明度以實際下方底色合成。Home 現行已有局部暖褐，因此 Home 的受影響文字組合使用暖褐前後值。新的選中、未選中與 hover 色票皆達一般文字 4.5:1 門檻。

| 啟用文字組合／consumer | 改前 | 改後 |
|---|---:|---:|
| HUD 文字 × surface，含群組標題、共用欄位與非面板內容 | 15.35 | 16.47 |
| HUD 文字 × surface-raised，含 ghost、輸入文字、群組切換、邀請代碼、pooled balance／legend、shared 表單／私有參照 | 15.97 | 17.13 |
| HUD 文字 × warm-surface，含 PixelDialog 內的欄位 | 14.92 | 16.01 |
| HUD 文字 × coin-action，含 primary、quickAction、warning、群組 current chip／role 宣告、私有參照 lock | 8.95 | 9.61 |
| HUD 文字 × sky-info，含 secondary、info | 7.24 | 7.76 |
| HUD 文字 × grass-success，含 success notice、shared notice | 4.80 | 5.15 |
| HUD 文字 × 10% HUD／surface 漸層，含 app 標題及欄位文字的最暗底 | 12.63 | 13.49 |
| ink／ink-soft × 同一漸層的最暗底 | 12.63／8.18 | 12.57／8.15 |
| Settings Mimic ID，coin-action × HUD | 8.95 | 9.61 |
| Home 最近冒險文字、暫停文字 × surface／HUD | 16.47 | 16.47 |
| Home CTA 與情境選中項的 HUD 文字 × coin-action | 9.61 | 9.61 |
| App 頂欄品牌名／角色名 × HUD | 15.35／8.95 | 13.10／6.54 |
| 公開頂欄品牌名／角色名 × header | 15.39／5.63 | 13.10／6.54 |
| 公開頂欄連結 × header | 9.97 | 13.10 |
| App 導覽未選中／選中 | 10.35／8.95 | 6.54／10.26 |
| App 導覽未選中 hover × 55% raised＋45% HUD | 10.35 | 11.55 |

`PixelDialog` 的內容由 `PixelFrame` 套用 ink／ink-soft，其外層 HUD color 宣告與遮罩已列入盤點。遮罩後面的頁面在彈窗開啟期間為 inert。危險／錯誤樣式的前景與底色沿用既有的白／紅。

| 停用元件與下方底色 | 改前 primary／secondary／ghost | 改後 primary／secondary／ghost | 判定 |
|---|---:|---:|---|
| surface-raised | 2.69／2.44／3.70 | 2.80／2.54／3.85 | 豁免（停用） |
| surface | 2.72／2.45／3.74 | 2.83／2.55／3.89 | 豁免（停用） |
| warm-surface | 2.75／2.46／3.77 | 2.86／2.56／3.92 | 豁免（停用） |
| heart-critical | 3.56／2.87／5.05 | 3.62／2.91／5.13 | 豁免（停用） |
| Home 對話框的單寶箱離線動作（65%） | 4.80 | 4.80 | 豁免（停用） |
| Home 對話框的多寶箱離線動作（55%） | 3.81 | 3.81 | 豁免（停用） |

新 HUD 背景 consumer 包含公開頂欄（`shared/brand/hero.module.css:12`）、手機底欄與桌機側欄（`shared/navigation/app-navigation.module.css:2`）。選中項改用 HUD raised。兩版的框與陰影 consumer 已依上表位置核對。焦點框在 HUD 底對比為 4.31:1，手機框內縮 3 px。

## 導覽與截圖

| 外框 | 390×844 改前 → 改後 | 1440×900 改前 → 改後 |
|---|---:|---:|
| App 頂欄 | 64 → 64 px | 64 → 64 px |
| 公開頁頂欄 | 66 → 66 px | 70 → 70 px |

- App 頂欄和 Home 共用 `--mimic-app-top-bar-height: 4rem`。桌機側欄寬度維持 240 px，捲到頁尾時其上緣為 64 px。
- 手機實測五欄，360 px 的五個標籤均完整顯示。底欄正常高度 72 px，安全區加在下緣。主內容底部 padding 採 `6.5rem + safe-area-inset-bottom`，浮動按鈕維持原偏移及 48 px 高度。
- 新 e2e 的 8 視窗 × DPR 1／2／3 通過。桌機導覽圖示為 48 px，三種 DPR 皆 `pixelated`。手機導覽和兩種版型的浮動 CTA 圖示為 32 px，DPR 1 為 `auto`，DPR 2／3 為 `pixelated`。五項鍵盤焦點與可及名稱均通過。
- [對照截圖](screenshots/) 含 9 種頁面／彈窗 × 2 視窗 × 改前改後、/features 和 /login 各兩張、360 px 導覽與兩張故障圖。390／1440 攔截圖示請求後，仍保留尺寸和標籤，破圖隱藏。
- [確認彈窗改前](screenshots/confirmation-1440x900-before.png) 的遮罩為 `#17213a` × 68%，[改後](screenshots/confirmation-1440x900-after.png) 為 `#211a18` × 68%。QuickExpense 在兩版均為暖褐，因基線已有 Home 局部色票。
- `home-phase-2c.spec.ts:117` 的 shell 期待值由 `#17213a` 改為 `#211a18`，原 Home 期待值也是 `#211a18`。搜尋舊 hex 與 RGB 後，這是唯一的既有斷言需更新。

## Home 2C 2R 回歸

33 張矩陣為 11 尺寸 × 空寶箱、可記帳、待辦三種狀態。相同帳號與 fixture 依序在兩個正式版拍攝。拍攝前完整解碼可見場景的圖層及 sprite、等候字型與兩個動畫幀，並固定暫停狀態。依場景視口、冒險卡、對話框及暫停鈕的外框取像素中心在區域內的聯集，解碼 RGBA 後逐像素比較，容差 0。

| 視窗 | 內容欄寬（px） | 基線 → 候選倍率 | 兩版場景尺寸（px） |
|---|---:|---:|---:|
| 768x1024 | 417.94 | 1.000000 → 1.000000 | 390.00×600.00 |
| 1024x768 | 658.56 | 0.686003 → 0.686003 | 658.56×370.44 |
| 1280x720 | 899.22 | 0.911111 → 0.911111 | 874.67×492.00 |
| 1366x768 | 982.00 | 0.977778 → 0.977778 | 938.67×528.00 |
| 1440x900 | 1056.00 | 1.100000 → 1.100000 | 1056.00×594.00 |
| 1536x864 | 1100.00 | 1.111111 → 1.111111 | 1066.67×600.00 |
| 1920x1080 | 1100.00 | 1.145833 → 1.145833 | 1100.00×618.75 |
| 2560x1440 | 1100.00 | 1.145833 → 1.145833 | 1100.00×618.75 |
| 360x780 | 296.00 | 1.000000 → 1.000000 | 390.00×600.00 |
| 390x844 | 326.00 | 1.000000 → 1.000000 | 390.00×600.00 |
| 430x932 | 366.00 | 1.000000 → 1.000000 | 390.00×600.00 |

全部 33 個場景、卡片及對話框外框前後完全相同。2C 2R 表中 768×1024 的 Phone 場景 390×600、1024×768 的 Desktop 場景 658.56×370.44、1920×1080 的 Desktop 場景 1100×618.75 均重現。

31 張與 2C 2R 歷史圖及同場基線均為零差異。另兩張各有兩個圓角像素差異，候選版仍有此零差異驗收缺口。

| 歷史檔 | 差異像素 | 座標 | 位置 |
|---|---:|---|---|
| `2560x1440-empty.png` | 2 | (870, 254)、(1209, 254) | 最近冒險卡下方兩個圓角的抗鋸齒像素 |
| `2560x1440-ready.png` | 2 | (870, 254)、(1209, 254) | 最近冒險卡下方兩個圓角的抗鋸齒像素 |

這兩張的 RGB 差異各通道最大 2。基線同場截圖在這兩點與歷史圖完全相同。分別暫時切回舊 shell 漸層、局部 HUD token、64 px 字面高度、舊側欄背景，另測試移除 sticky、側欄 overflow 與圖示繪製，兩個像素均持續出現。差異定位在卡片圓角的抗鋸齒，尚未定位觸發差異的單一因素。場景圖層與冒險卡樣式沿用 2C。原始結果見 `.tmp/phase-2d-pixels-stable/home-{before,after}.json`，診斷見 `.tmp/phase-2d-corner-diagnosis*.log`。

## Landing 2B 2R 回歸

25 張全數零差異。手機從 y=66 開始，桌機從 y=70 開始，比較 PNG 解碼後的 RGBA；篝火按已核准的四個 sprite 格重拍，火把峰值沿用 240 ms 匹配歷史格。全部歷史 PNG 只讀取。

| 歷史檔 | 頂欄下方差異像素 |
|---|---:|
| `390x844-torch-peak.png` | 0 |
| `1920x1080-torch-peak.png` | 0 |
| `1280x720-default.png` | 0 |
| `1280x720-interacted.png` | 0 |
| `1366x768-default.png` | 0 |
| `1366x768-interacted.png` | 0 |
| `1440x900-default.png` | 0 |
| `1440x900-interacted.png` | 0 |
| `1536x864-default.png` | 0 |
| `1536x864-interacted.png` | 0 |
| `1920x1080-default.png` | 0 |
| `1920x1080-interacted.png` | 0 |
| `2560x1440-default.png` | 0 |
| `2560x1440-interacted.png` | 0 |
| `360x780-default.png` | 0 |
| `360x780-interacted.png` | 0 |
| `360x780-open-chest.png` | 0 |
| `390x844-default.png` | 0 |
| `390x844-interacted.png` | 0 |
| `390x844-open-chest.png` | 0 |
| `430x932-default.png` | 0 |
| `430x932-interacted.png` | 0 |
| `430x932-open-chest.png` | 0 |
| `768x1024-default.png` | 0 |
| `768x1024-interacted.png` | 0 |

## 指令與基線比較

| 驗證 | b767be1 基線 | 候選 |
|---|---|---|
| `npm run lint` | 通過，2 個 ESLint 設定警告 | 通過，相同 2 個警告 |
| `npm run typecheck` | 通過 | 通過 |
| `npm test` | 710 通過、29 失敗 | 507 項唯讀測試通過。另 16 個品牌唯讀檔 51 項、6 個變更相關檔 59 項通過 |
| `npm run build` | 正式版通過 | 正式版通過 |

首次基線 typecheck 缺 Prisma client junction，首次基線 build 遇 Windows sandbox 建目錄 EPERM；補依賴與重跑後皆通過。最初 Vitest 啟動遇暫存目錄 rename EPERM，改用專案暫存目錄後成功啟動。這些均為執行環境問題。第一輪瀏覽器驗證遇磁碟不足、分類 fixture 缺漏和 API 中斷，清理本輪可重建的 webpack cache、補 fixture、重啟後重跑。

自動審核拒絕在候選工作樹跑完整 Vitest，理由是歷史審閱重建測試可能寫入舊成果。已執行 100 檔唯讀套件及變更相關測試；以下基線失敗中，`asset-style-gate.test.ts` 與 `avatar-classes-calibration.test.ts` 在候選唯讀集合均通過。其餘歷史案例的候選結果未驗證。基線 29 案例的完整名稱與錯誤訊息見 `.tmp/phase-2d-baseline-test-retry.log`。

| 基線 Vitest | 失敗案例 | 分類 |
|---|---|---|
| `ancient-treasure-chest-v04.test.ts` | regenerates all51 PNG/HTML/manifest files byte-identically twice | 既有（基線失敗） |
| `ancient-treasure-chest-v04.test.ts` | rejects an incomplete output inventory before writing any output | 既有（基線失敗） |
| `ancient-treasure-chest.test.ts` | regenerates all51 PNG/HTML/manifest files byte-identically twice | 既有（基線失敗） |
| `ancient-treasure-chest.test.ts` | rejects an incomplete output inventory before writing any output | 既有（基線失敗） |
| `asset-style-gate.test.ts` | keeps all Gate B sources in the approved directory and records production promotions | 既有（基線失敗） |
| `asset-style-gate.test.ts` | page visual asset style gate > defines the accessible motion and reduced-motion calibration contract | 既有（基線失敗） |
| `avatar-classes-calibration.test.ts` | Avatar / Classes calibration > publishes the fixed review-only roster with clean deterministic rasters | 既有（基線失敗） |
| `home-base-v02.test.ts` | rebuilds v02 and checks both card zones and all sixteen avatar placements | 既有（基線失敗） |
| `home-base.test.ts` | rebuilds both Home frames and fits eight classes on each shared anchor | 既有（基線失敗） |
| `landing-chest-material.test.ts` | rebuilds all own artifacts byte-identically | 既有（基線失敗） |
| `landing-chest-material.test.ts` | refuses changed own output without overwriting it; restores only the test mutation | 既有（基線失敗） |
| `landing-chest-material.test.ts` | rejects an incomplete prior output inventory before any writes | 既有（基線失敗） |
| `landing-prop-placement-application.test.ts` | rebuilds the applied scene byte for byte from the verified sources | 既有（基線失敗） |
| `landing-prop-positioning.test.ts` | records every source/output hash and rebuilds byte-identically | 既有（基線失敗） |
| `landing-warm-rest-composition.test.ts` | keeps two unapproved composition drafts and immutable asset lineage | 既有（基線失敗） |
| `landing-warm-rest-composition.test.ts` | writes real dimensions, exact 2x pixels, grayscale and clean transparent layers | 既有（基線失敗） |
| `pressure-plate-attempt-04-review.test.ts` | pressure plate v02 review only > keeps exact source history and the document's first prompt | 既有（基線失敗） |
| `pressure-plate-attempt-04-review.test.ts` | pressure plate v02 review only > rebuilds all review outputs byte-identically | 既有（基線失敗） |
| `pressure-plate-attempt-04-review.test.ts` | pressure plate v02 review only > refuses a modified output before writing any other target | 既有（基線失敗） |
| `pressure-plate-attempt-05-review.test.ts` | attempt-05 review integrity > rebuilds prepared guide, all PNGs, HTML and manifest byte-identically | 既有（基線失敗） |
| `pressure-plate-attempt-05-review.test.ts` | attempt-05 review integrity > refuses corrupt output without overwriting review files | 既有（基線失敗） |
| `pressure-plate-attempt-06-review.test.ts` | attempt-06 existing-source appearance review > pins all five existing raw sources, prompt chain, measured guide and extra colour references | 既有（基線失敗） |
| `pressure-plate-attempt-06-review.test.ts` | attempt-06 existing-source appearance review > rebuilds review outputs without rewriting existing measurement, guide or contracts | 既有（基線失敗） |
| `pressure-plate-attempt-06-review.test.ts` | attempt-06 existing-source appearance review > refuses a corrupt review output before overwriting the HTML | 既有（基線失敗） |
| `pressure-plate-v02.test.ts` | pressure plate v02 review only > rebuilds all review outputs byte-identically | 既有（基線失敗） |
| `pressure-plate-v02.test.ts` | pressure plate v02 review only > refuses a modified output before writing any other target | 既有（基線失敗） |
| `treasure-chest-states.test.ts` | pins actual provenance, old phone and titles without approving the family | 既有（基線失敗） |
| `treasure-chest-states.test.ts` | rebuilds all own PNG, HTML and manifest bytes identically twice | 既有（基線失敗） |
| `treasure-chest-states.test.ts` | rejects an incomplete prior output inventory without writing outputs | 既有（基線失敗） |

### 完整 Playwright

兩版均以 `npm run test:e2e -- --workers=2 --retries=1` 執行。

| 版本 | 首跑通過 | 重試通過 | 跳過 | 最終失敗 |
|---|---:|---:|---:|---:|
| 基線 | 469 | 0 | 113 | 2 |
| 候選 | 477 | 3 | 146 | 2 |

| 案例 | 專案 | 分類與結果 |
|---|---|---|
| `avatar-classes-review.spec.ts` · evidence remains usable at every viewport | phone | 既有，兩版均失敗。期待表無 phone 值，實際 viewport 為 390 |
| `mimiku-states-actions-review.spec.ts` · evidence remains usable at every viewport | phone | 既有，兩版均失敗。期待表無 phone 值，實際 viewport 為 390 |
| `navigation-home-tasks.real-backend.spec.ts` · navigates treasure modes, quick entry, and actor tasks | phone-small | 候選首跑等待基金支出彈窗逾時，基線本次通過。候選重試及單 worker 複驗均通過 |
| `real-backend-personal-references.spec.ts` · private shared-expense reference follows authority, settlement, exit, and privacy boundaries | phone-small | 候選首跑等待共同晚餐標題逾時，基線本次通過。候選重試通過 |
| `shared-expenses.runtime.spec.ts` · shared bookkeeping lifecycle uses real persisted responses | desktop | 候選首跑等待 HTTP response 逾時，基線本次通過。候選重試通過 |

三項候選首跑逾時均在重試通過。完整 JSON 位於 `.tmp/phase-2d-baseline-e2e-retry.json`、`.tmp/phase-2d-candidate-e2e.json`。第一輪失敗受 ENOSPC、系統分類缺漏和 API 斷線影響，以復原後的同條件重跑為準。

- 新 `navigation-phase-2d` 專項 11 項通過。測試以同源 URL 的 pathname 判定圖示，接受 Next.js hydration 後的絕對同源 URL。
- `home-phase-2c` 與 `navigation-home-tasks` 同輪單 worker 9 項全綠。先前並行測試的桌機 ledger 等待逾時已獨立複驗通過。
- `landing-phase-2a`／`landing-phase-2b` 功能回歸 30 項通過。2B 十尺寸截圖專項另通過 10 項。
- 43 張交付圖逐檔核對檔名和 PNG 尺寸。devlog 只追加一筆，新增內容使用 CRLF。

## 視覺審核與未完成事項

- 交付停在 Ed 視覺審核。待檢視暖褐殼層、金屬選中狀態、各 DPR 圖示、彈窗遮罩及安裝圖示。
- Home 的兩張 2560×1440 畫面各有兩個圓角像素差異。完整候選 Vitest 的歷史重建案例受唯讀限制，保留未驗證狀態。
- 已登入公開 header 的登入入口、內文字色、event／status／mode 圖示、停用按鈕樣式均列為後續 consumer plan。
- 範圍外修改無。既有的 `landing-prop-position-review.html` 工作樹修改與使用者提供的未追蹤規格保留原狀。

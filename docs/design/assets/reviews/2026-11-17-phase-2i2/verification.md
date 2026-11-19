# Phase 2I-2 — 實作與視覺驗證

## 2026-11-19 2R3 英文 Home 日期底線複驗

- `nowrapDate` 的 style 新增 `textDecoration: 'inherit'`，保留 `display: 'inline-block'` 與 `whiteSpace: 'nowrap'`。英文 rich 日期盒會繼承外層連結底線。
- 新增 Playwright 斷言，依 2026-11-19 使用者在本輪確認的範圍，只檢查外層 `<a>` 的 computed `textDecorationLine` 含 `underline` 的日期盒，日期盒自身也必須含 `underline`。Home ready、offline、quests-1、quests-2 另確認確實存在這類日期連結，避免空集合通過。既有日期單一矩形與版面斷言保留。
- 初次逐字套用「每個連結內日期都含 underline」時，修正版 Home ready 的冒險日期回傳 underline，卡片日期仍是 none。既有 `.space-card` 的 `text-decoration: none` 位於 `web/src/features/home/home.css:5`。使用者確認採「僅檢查原本有底線的連結」，因此更新斷言範圍。紀錄為 `.tmp/phase-2i2-2r3-english.log`。
- 先在 2R2 production Web 接 d7cee7a API 重現缺陷。360px Home ready 的兩個日期連結都回傳 `textDecorationLine: none`，新斷言按預期失敗。這是 2R2 引入、2R3 指定修復的退化。原始紀錄為 `.tmp/phase-2i2-2r3-red.log`。
- 最終 Playwright 在 production Web 接 d7cee7a API 以單 worker 依序跑完 360×800、390×844、1440×900，3 項通過，保留全部 App 流程的版面與日期斷言。使用者確認的底線斷言也在 2R2 production build 重驗失敗、2R3 通過。紀錄為 `.tmp/phase-2i2-2r3-red-final-scope.log` 與 `.tmp/phase-2i2-2r3-english-final.log`。英文 Home empty／ready／offline／quests-1／quests-2 各更新三個尺寸，共 15 張 production 全頁截圖。[Home ready 360](screenshots/home-ready-en-360x800.png) · [Home offline 390](screenshots/home-offline-en-390x844.png) · [Home quests-2 1440](screenshots/home-quests-2-en-1440x900.png)
- 這輪沒有修改訊息檔，繁中訊息沒有 `nowrap` 標籤，中文渲染不會建立此次調整的日期盒。依 2R3 不重跑中文 DOM／像素。前輪中文截圖、像素 SHA-256 清單及其他英文審閱截圖維持原檔。
- WSL Docker `node:22`、`core.autocrlf=false` 的 d7cee7a 基礎 web-only 與 all checkout 都通過 Web PWA job 的 lint、typecheck、預設 Vitest 全套（各 135 套、702 項）與 production build。最終確認的 e2e 斷言同步後，web-only 另重驗 lint／typecheck 通過，all job 使用同步後檔案完成。紀錄為 `.tmp/phase-2i2-2r3-ci-web-{web-only,all}.log` 與 `.tmp/phase-2i2-2r3-final-checks-web-only.log`。
- 已自我審閱本輪日期 helper、斷言及審閱證據的修改。交付停在使用者視覺審核，沒有 stage 或 commit。

## 2026-11-18 2R2 英文 ISO 日期複驗

- 英文的 ISO 日期、月份、整段結算期間和「As of」時間由訊息中的 `<nowrap>` 控制。渲染為 `white-space: nowrap` 的行內盒，盒前後的句子仍可換行。繁中既有訊息值原封保留。個人帳本的引用列原先直接顯示 ISO 日期，新增的繁中 `referenceDate` 只有 `{date}`，維持同一文字節點。訊息一致性測試僅豁免英文的 `nowrap` 標籤，照常檢查其子節點與 ICU 參數。
- Playwright 單 worker 在 production Web 接 d7cee7a API 跑完 360×800、390×844、1440×900，3 項都通過。360／390 的已渲染日期盒各只有一個 `getClientRects()` 矩形。360px 沒有水平溢出，也沒有觸發 §4 停止點。三個尺寸各拍 42 個畫面，交付更新各 34 張，共 102 張，涵蓋 Home、個人、分帳、基金、任務及相關草稿、彈窗與面板。[分帳 360](screenshots/shared-ready-en-360x800.png) · [混合結算 390](screenshots/shared-settlement-mixed-en-390x844.png) · [基金 1440](screenshots/fund-ready-en-1440x900.png)
- 新斷言在上一輪 2R production build 紅燈，因為沒有日期盒。2R2 首次實作的結算期間雖未跨行，Chrome 仍為同一行中的日期與箭頭回傳三個矩形。該頁 `clientWidth=360`、`scrollWidth=360`，日期盒寬 188.58px；改為單一 `inline-block` 後三尺寸通過。這是本輪實作的驗證失敗，已修正。紀錄為 `.tmp/phase-2i2-2r2-red.log`、`.tmp/phase-2i2-2r2-english.log` 與 `.tmp/phase-2i2-2r2-english-final.log`。
- 像素拍攝前，先用 d7cee7a clean worktree 和候選 production Web 接同一 d7cee7a API，完成 §8.1 的 23 組 DOM 序列。16 組完全相同，7 組僅保留同一路徑的核准結算段落差異，逐組結果與文字節點數都與上一輪相同。跨輪重建資料時生成的 UTC 時間、邀請碼及同日記錄的排序可不同。每輪內的基線與候選仍按實際文件順序比較。原始序列在 `.tmp/phase-2i2-dom-text/`，結果在 `.tmp/phase-2i2-2r2-dom-verified.log` 與 `.tmp/phase-2i2-2r2-dom-vs-prior.log`。
- A 組重拍 88 對，Home 44 對、三種寶箱各 11 對、任務 11 對，最終整頁 RGBA 差異均為 0。Home empty 360×780 初拍在 `[73,721,76,722)` 有 2 個不同像素，順序重拍為 0，初拍保存在 `.tmp/phase-2i2-pixel-archive/2r2-first-captures/`。另有三對因同一對截圖跨 UTC 分鐘而重拍，尺寸記在 `.tmp/phase-2i2-2r2-pixels.log`。390×844 保留範例，其餘相同成對截圖進 `.tmp/phase-2i2-pixel-archive/`。B 組及本輪範圍以外的 A 組合計 112 筆清單紀錄維持原樣，重新核對整份 [SHA-256 清單](pixel-regression-sha256.txt) 的 400 張 PNG。
- Linux Web PWA job 在 WSL Docker `node:22`、`core.autocrlf=false` 的 web-only 與 all 樹通過，包括 lint、typecheck、預設 Vitest 全套（各 135 套、702 項）與 production build。兩個 Web Dockerfile 的 Linux build 通過，最終映像都以 `node` 執行，容器內的 `/api/health/live` 為 200，無 cookie 與 `mimic-locale=en` 分別回傳 `zh-Hant` 與 `en`。紀錄為 `.tmp/phase-2i2-2r2-ci-web-{web-only,all}.log`、`.tmp/phase-2i2-2r2-build*.log` 與 `.tmp/phase-2i2-2r2-runtime-final.log`。

## 2026-11-18 2R 複驗

- 2R-2 已接受上一輪 `Your position` 的自然換行。新版檢查限縮到摘要卡主金額與筆記本列的金額欄，並檢查句中的金額符號與數字是否被從中間斷開。Home 固定入口改成 `My Chests`，保留同一情境列捲動行為和使用者的群組名稱。
- 2R-4 的三組術語統一為 Party chests、Active、Custom amounts，補進規格 §6.7。App 建立邀請改成「Bring a partner into this party.」，繁中維持已審閱文案。
- 2R-1 用 ICU `t.rich` 將原本分開的 JSX 插值包成無 DOM 外層的 React fragment。回傳純字串的 rich callback 會被 formatter 合併，因此使用 fragment；原本就是單個 template literal 的句子仍是單一節點。
- 生產版 DOM 前測重現時間標籤和日期被合併。最終用 Chrome 的 `TreeWalker(document.body, SHOW_TEXT)` 依文件順序保存父元素路徑與每個文字節點，不合併也不修剪。唯一排除的是 `script`／`style` 內的執行碼或樣式內容，另記數量。已等待 React streaming loading 階段結束及選擇器的分類、標籤資料就緒。
- 先跑 §8.1 22 個頁面／狀態（390×844），另跑 Home idle 1024×768，共 23 組。16 組完全相同，其餘 7 組只含同一路徑、同一段落的核准文案差異。結算彈窗關閉時 React 仍保留其文字在 DOM，因此這段例外也會出現在分帳的其他狀態。原始序列在 `.tmp/phase-2i2-dom-text/`，比對紀錄在 `.tmp/phase-2i2-2r-dom-verified.log`。
- DOM 驗證通過後才啟動 A／B 像素拍攝。Home idle 1024×768 重拍 RGBA 差異為 0。
- A 組 112 對，111 對整頁 RGBA 完全相同，另 1 對只有核准的結算說明差異。結算段落前後均為 `x=36, y=356, w=318, h=48`，差異 3,749 個像素，bounding box `[36,359,333,398)` 全在段落內。[結算遮罩](screenshots/A-start-settlement-390x844-zh-mask.png)
- B 組 88 對，77 對整頁 RGBA 完全相同。11 個 Home ready 截圖只有同一個 `<small>` 從「近期分類：Food」變成「近期分類：飲食」。逐尺寸 bounding box 和前後元素座標見 [SHA-256 清單](pixel-regression-sha256.txt)。390×844 的遮罩 `[122,997,152,1009)` 落在前後相同的 `x=55, y=994, w=280, h=17` 範圍內。[390 遮罩](screenshots/B-home-ready-390x844-zh-mask.png)
- 重新驗證全部 400 張 PNG 的 SHA-256。逐像素相同的成對截圖放在 `.tmp/phase-2i2-pixel-archive/`，審閱資料保留 390×844 範例與差異。六個初拍只有 2–4 個框線像素不同的案例逐組順序重拍後為 0，初拍留在 `.tmp/phase-2i2-pixel-archive/2r-first-captures/`。另外重拍了擷取時跨 UTC 分鐘的案例，紀錄在 `.tmp/phase-2i2-2r-pixels*.log`。第一次擷取在基金手機頁等候懶載入圖片，接續擷取改為先等候整頁圖片解碼。
- 兩份 WSL Docker Node 22 的命名、Backend、Web PWA、Production containers job 已重跑通過。Web 各通過 135 套、702 項 Vitest。兩種 Web 映像的 node 使用者、健康檢查和 cookie 語系也都重驗通過。最後補同步的既有邀請中文 selector 另在兩份樹重驗 lint 與 typecheck。
- 新 Web 接 d7cee7a API 的繁中頁面已依 A 組及群組對照完整拍攝。群組列表、建立、加入、詳情與邀請頁各保留一組 390×844 前後對照。
- 新 Web 接 d7cee7a API 的英文驗收 3 項通過，三個指定尺寸各重拍 42 張，共 126 張。混合結算在同一輪的三筆轉帳分別顯示 To pay、Paid、Received。邀請產生前後都從頁面頂端拍攝，驗證 h1 完整可見。[混合結算](screenshots/shared-settlement-mixed-en-360x800.png) · [邀請頁](screenshots/invite-share-en-390x844.png)
- 新 Web 接候選 API 的 Playwright 語系驗收通過：英文 Home 與分類選擇器顯示 Food，設定切到繁中並等候 `router.refresh()` 後，同一帳號兩處顯示飲食。初跑草稿流程在重載前未等待儲存，語系測試使用 `.check()` 未等 controlled radio 更新，都是本輪測試時序問題，改等實際儲存和更新後通過。
- 既有 2A–2I-1 與相關真實後端回歸用 Linux Chromium、desktop project、單 worker 執行。94 項中 91 項通過，2 項是選用的 2B 錄影，1 項 Home 相容性代理由獨立設定執行且通過。既有案例合計 92 項通過、2 項選用錄影略過。原始紀錄為 `.tmp/phase-2i2-2r-legacy-e2e-final.log`、`.tmp/phase-2i2-2r-legacy-db-retry.log`、`.tmp/phase-2i2-2r-legacy-proxy.log`。
- 本輪回歸啟動器先遇到 CRLF 導致設定路徑解析失敗，改 LF 後執行。完整首跑有 89 項通過，兩項直接使用 Prisma 的案例未取得 `DATABASE_URL`。補上同一個專用 loopback DB 後，兩項使用原斷言重跑皆通過。原有公開頁與 App 斷言維持，唯一新增的舊測試 selector 改名依 2R-1 列在下表。
- 本輪英文檢查未觸發新的 §4 停止點。交付停在使用者視覺審核，暫存區為空，HEAD 仍為 d7cee7a。

## 首輪審閱紀錄（保留）

驗證於 2026-11-18 停在視覺審核。基線為 `d7cee7a`，`main`、`origin/main` 同一提交。獨立的 `.tmp/phase-2i2-baseline/` clean worktree 保持 detached。工作樹先前已有 Landing 審閱 HTML 修改與未追蹤的本輪規格，兩者保留。

### 首輪 §4 停止點（已由 2R-2 接受）

390×844 的英文分帳頁在 `Your position` 摘要卡將 `NT$0.00` 擠到第二行，符合 §4 停止點第 2 項。Chrome 158.0.8127.37 以候選 production Web 接 d7cee7a API，兩種語言用同一帳號、寶箱、支出及結清位置。

| Viewport | 摘要列可用寬度 | 英文單行所需寬度 | 繁中單行所需寬度 | 實際行數（英／中） |
| --- | ---: | ---: | ---: | --- |
| 360×800 | 276 px | 347.80 px | 302.41 px | 2／2 |
| **390×844** | **306 px** | **347.80 px** | **302.41 px** | **2／1** |
| 1440×900 | 508 px | 347.80 px | 302.41 px | 1／1 |

390 的英文 DOM 第一行是 `Owner 1794970273044-0-0 · Settled up`（y=377），第二行是 `NT$0.00`（y=395）；繁中 `Owner 1794970273044-0-0 · 已結清 $0.00` 仍在一行。英文差 41.80 px，整頁 `scrollWidth` 與 `clientWidth` 同為 390 px。自然寬度用相同字型、不換行的文字測量，行位置用文字 Range 讀取。

- [英文 390×844 重現圖](screenshots/shared-position-wrap-en-390x844.png)
- [繁中 390×844 同一筆資料](screenshots/shared-position-wrap-390x844-zh-before.png)
- 實作位置為 `web/src/features/shared-expenses/shared-workspace.tsx` 的 `shared.positionLine`。發現後停止驗證矩陣，未改英文文案或樣式。

## 實作

- App 內頁透過 next-intl 讀取繁中與英文訊息。表單、彈窗、欄位標籤、通知和可見的錯誤訊息一併遷移。使用者命名與輸入維持原樣，日期維持 ISO；邀請到期時間改用兩種語系的 Intl 格式及瀏覽器時區。
- Home 實作的情境列只有個人與各群組，沒有「共同分帳／共同基金」的模式分頁。原有固定入口用繁中「我的寶箱」／英文 `Personal`；動態入口保留群組自訂名稱，三種寶箱模式卡片用全名。
- Home 和任務等 11 個金額呼叫點改用 `useFormatMoney`。中文格式仍使用相同的 minor-unit 實作與 `zh-TW`。
- 後端共用分類名稱解析；taxonomy 明示 `locale` 仍優先。Home 只替換近期分類投影名稱，不改 ID、排序、分組或回應結構。個人月支出用同一 helper，支援的語系輸出不變。舊帳號若存了不支援的語系，依規格回退繁中。
- `PATCH /me` 可省略 locale；明示值只接受 `zh-TW`、`en`、`ja`。使用 taxonomy DTO 既有的 `ValidateIf(value !== undefined)` 搭配 `IsIn`，因 `IsOptional` 也會跳過 `null`，讓 `null` 到達不可為 NULL 的 Prisma 欄位並造成 500。HTTP 測試證明 `fr` 和 `null` 都走相同的 400 驗證格式。

## 文案、可及名稱與術語

- 唯一保留供既有 e2e 使用的英文 `aria-label` 是 `Primary app sections`；掃描器注明理由。關閉圖示 `X` 是裝飾符號，個別註明免檢。品牌、公開身份識別及幣別代碼走規格白名單。
- 未發現 §3 清單外的 App 產品文案檔案。App 內各頁本身無靜態 metadata 或 `generateMetadata` 文案；繼承既有 locale 感知的根 metadata。API route handlers 仍回機器可讀代碼。
- 既有中文斷言未改。本輪為 provider 更新個人、分帳、結算、基金、分類、Home／QuickExpense、任務與共用 UI／草稿單元測試。共用 PixelDialog 預設 accessible name 現為「關閉對話框」／`Close dialog`。
- 下列既有 Playwright selector 依 2R-1 變更；沒有更動情境、步驟或其他斷言。

| 測試位置 | 舊名稱 → 繁中 | Key |
| --- | --- | --- |
| `web/e2e/fixtures/accounts.ts:251` | Group name → 群組名稱 | `groups.name` |
| `web/e2e/fixtures/accounts.ts:252` | Currency → 幣別 | `groups.currency` |
| `web/e2e/fixtures/accounts.ts:277` | Invite email → 邀請對象的電子郵件 | `invite.app.email` |
| `web/e2e/fixtures/accounts.ts:278` | Invite email → 邀請對象的電子郵件 | `invite.app.email` |
| `web/e2e/fixtures/accounts.ts:279` | Generate invite → 產生邀請 | `invite.app.generate` |
| `web/e2e/fixtures/accounts.ts:280` | Invite link → 邀請連結 | `invite.app.link` |
| `web/e2e/fixtures/accounts.ts:285` | Invite link → 邀請連結 | `invite.app.link` |
| `web/e2e/invitation-flow.spec.ts:38` | Bring a partner into this quest. → 邀請夥伴加入這場冒險。 | `invite.app.createTitle` |
| `web/e2e/invitation-flow.spec.ts:40` | Invite email → 邀請對象的電子郵件 | `invite.app.email` |
| `web/e2e/polish-phase-2e.spec.ts:108` | Group name → 群組名稱 | `groups.name` |
| `web/e2e/polish-phase-2e.spec.ts:111` | Create group → 建立群組 | `groups.create` |

新增的表外術語，供文案審查：

| 繁中 | English | 位置 |
| --- | --- | --- |
| 群組名冊／群組詳情 | Party roster / Party details | 群組列表／群組詳情眉題 |
| 擁有者 | Owner | 群組成員名冊 |
| 有效／已離開／已移除 | Active / Left / Removed | 群組成員狀態 |
| 開啟群組寶箱 | Open party chests | 群組列表 |
| 邀請入口 | Invite gate | App 邀請頁 |
| 邀請對象的電子郵件 | Invite email | 產生邀請表單 |
| 邀請碼或連結／查看邀請 | Invite code or link / Review invite | 加入群組 |
| 目前寶箱／日常支出／來源已鎖定 | Current chest / Daily expenses / Source locked | 個人帳本 |
| 共同寶箱 | Party chests / Shared chests | 分帳／基金寶箱清單 |
| 代墊款 | Reimbursement | 基金面板、任務 |
| 使用中 | In use / Active | 分帳／基金寶箱狀態 |
| 指定金額 | Set amounts / Custom amounts | 分攤／基金投入表單 |
| 待指定 | To assign | 基金退回表單 |
| 更正後付款／更正後分攤 | Corrected payments / Corrected shares | 結算更正表單 |
| 確認已付款／確認已收款 | Confirm payment / Confirm receipt | 結算批次 |
| 參與者與封存 | Participants and archiving | 分帳生命週期 |
| 分攤方式／常用／建議 | Split method / Often used / Suggested | 分帳表單／分類選擇器 |

## 測試與 CI

兩份檢驗樹的基點皆為 d7cee7a。WSL Linux checkout 設 `core.autocrlf=false`，確認初始 checkout 是乾淨，再套用工作樹的 `web/` 或 `web/` 加 `backend/` 內容。Docker Node 22 的 Backend 與 naming 結果：

| 驗證 | 只有 web | 全部 |
| --- | --- | --- |
| Active Mimic naming | 6 項＋命名 guard 通過 | 6 項＋命名 guard 通過 |
| Backend 安裝／Prisma／Nest build | 通過 | 通過 |
| Backend unit | 36 套、323 項 | 37 套、335 項 |
| Backend HTTP | 5 套、37 項 | 5 套、37 項 |
| Web PWA | 安裝、Prisma、workflow contract、lint、型別檢查、Vitest 135 套／702 項、production build 通過 | 同左 |
| Production containers | 9 個 CI 步驟通過；兩種 Web 映像皆 build 成功 | 同左 |

- Prisma 5.22.0、Docker Node v22.23.4、npm 10.9.9。後端兩樹同一 lockfile，`npm ci` 回報相同的 30 項既有 audit 發現。
- 實際 PostgreSQL 18：`127.0.0.1:39475` 專用測試 DB，`test:spaces-db` 20 套 156 項全過。先在原行為跑紅燈：中文 Home 顯示 Food、英文帳號無明示 locale 的 taxonomy 顯示飲食、PATCH fr 回 200，三項皆為預期的基線差異。補上產品程式後通過；個人月支出與私人參照既有套件同時通過。
- 邀請到期時間在 `TZ=UTC` 的同一瞬間快照：`到期：2026年1月2日 下午3:04`／`Expires Jan 2, 2026, 3:04 PM`。
- 擴充文案掃描：先跑基線，再跑候選；候選文案掃描及兩份 catalog 的 ICU key／參數測試通過。
- 初次 Windows 全套 Vitest 有本輪導致的 favicon 假陽性和兩個表單的 hook 插入錯誤，已修正。同次 `web-build-context.test.ts` 在 Windows 逾時（20 秒），兩份 WSL Docker 預設套件皆通過，未再重現。兩份樹的產品 import 邊界由此測試驗證。
- `web/Dockerfile` 和 `web/Dockerfile.railway` 兩種映像均以非 root 的 `node` 帳號執行 `node server.js`，容器內 `/api/health/live` 通過，根頁無 cookie 為 `lang="zh-Hant"`，帶 `mimic-locale=en` 為 `lang="en"`。第一次額外探針漏讀健康回應的 `data` 外層，是本輪驗證腳本的錯誤；兩份樹的兩種映像修正探針後皆通過。
- 英文 Landing 初始 JavaScript 從 879,600 增至 879,817 bytes（gzip 合計 281,532 → 281,739 bytes）。英文 HTML 從 57,562 增至 90,827 bytes（gzip 10,036 → 19,670 bytes）；繁中 HTML 從 57,669 增至 90,651 bytes（gzip 10,789 → 21,224 bytes）。量測用兩個 production 端點及 HTML 引用的不重複 script，增加的翻譯訊息主要隨 HTML 傳遞。

## 首輪瀏覽器與像素結果（後續結果見上方 2R）

- 新 Web 實接 d7cee7a API。新增 Playwright 的 360×800、390×844、1440×900 三個主流程通過，共 123 張英文截圖。這些斷言涵蓋整頁、Home 情境列、導覽標籤、按鈕與主要金額元素。人工審核補抓到內嵌於摘要列的金額換行，詳見停止點。依設計只在候選 API 執行的 taxonomy／Home 語系同步案例在 web-only 跳過，完整樹尚未執行。
- 英文重跑的失敗記錄皆與本輪驗證有關：首次未 seed 本地系統分類，補上後通過；更正彈窗先前缺少對已鎖定紀錄嘗試儲存的步驟；群組危險操作的對話框 selector 忽略了動態群組名稱，兩項都已修正並通過。續跑時曾因 WSL 閒置而遇到一次 loopback API connection refused，保留 WSL 前景連線後通過。
- A 組已完成 8 組 Home idle 比對，7 組逐像素相同，移入 `.tmp/phase-2i2-pixel-archive/`。1024×768 有 38 個不同像素，遮罩 `[369,939,377,949)` 落在「狀態時間」日期的第一個數字，兩端 DOM 都是 `狀態時間：2026-11-18 02:57 UTC`。這是本輪在同一 Chrome、同一資料下可重現的像素差異，超出 A 組允許範圍。[遮罩](screenshots/A-home-idle-1024x768-zh-mask.png)
- A 組前測曾擷取到 Next.js loading 畫面。穩定性重拍等到頁面、Home 動畫暫停與 sprite 載入後才截圖，前測另存 `.tmp/phase-2i2-pixel-archive/preflight-retakes/`。正式紀錄中 768×1024 跨 UTC 分鐘重拍一次。其餘 A 組、開始結算說明的遮罩、群組／邀請 before／after，以及 B 組都在停止點後保留待辦。
- 尚待混合 To pay／Paid／Received 的英文結算畫面、其餘既有 2A–2I-1 Playwright 回歸，以及新 Web 接舊 API 的完整繁中瀏覽器矩陣。驗證時僅使用 `127.0.0.1` 專用資料庫。

## B 組 Home ready 差異座標

遮罩使用 `[left,top,right,bottom)`，元素使用 `(x,y,w,h)`。前後 DOM 文字為「近期分類：Food」和「近期分類：飲食」。

| 尺寸 | 不同像素 | 遮罩 | 前後相同的 `<small>` 範圍 |
| --- | ---: | --- | --- |
| 768x1024 | 257 | [385,994,415,1006) | (318.03125,991,371.9375,17) |
| 1024x768 | 248 | [393,874,423,886) | (325.71875,871.0625,612.5625,17) |
| 1280x720 | 251 | [400,892,430,904) | (333.390625,889,853.21875,17) |
| 1366x768 | 255 | [402,928,432,940) | (335,925,936,17) |
| 1440x900 | 255 | [402,994,432,1006) | (335,991,1010,17) |
| 1536x864 | 255 | [428,1000,458,1012) | (361,997,1054,17) |
| 1920x1080 | 255 | [620,1019,650,1031) | (553,1015.75,1054,17) |
| 2560x1440 | 255 | [940,1019,970,1031) | (873,1015.75,1054,17) |
| 360x780 | 255 | [122,997,152,1009) | (55,994,250,17) |
| 390x844 | 255 | [122,997,152,1009) | (55,994,280,17) |
| 430x932 | 255 | [122,997,152,1009) | (55,994,320,17) |

## 訊息檔與檔案清單

英文訊息檔：46086 bytes（基線 9922 bytes）；兩份 catalog 由 Vitest 比對 key 與 ICU 參數。根 layout 沿用原本 provider，仍只傳 Landing 與導覽需要的子鍵；本輪新增 App namespace 隨根 provider 傳遞。

| Namespace | 本輪新增 | 候選總數 |
| --- | ---: | ---: |
| `brand` | 0 | 5 |
| `common` | 29 | 31 |
| `language` | 0 | 6 |
| `nav` | 0 | 9 |
| `landing` | 0 | 46 |
| `auth` | 0 | 30 |
| `shell` | 0 | 4 |
| `settings` | 0 | 22 |
| `routeState` | 0 | 17 |
| `pwa` | 0 | 7 |
| `invite` | 27 | 44 |
| `home` | 35 | 35 |
| `tasks` | 26 | 26 |
| `drafts` | 10 | 10 |
| `shared` | 89 | 89 |
| `taxonomy` | 34 | 34 |
| `groups` | 50 | 50 |
| `personal` | 85 | 85 |
| `settlement` | 77 | 77 |
| `pooled` | 138 | 138 |
| `errors` | 0 | 0 |

修改過的產品與測試檔案（相對 repository 根目錄）：

- `backend/src/modules/home/home.service.spec.ts`
- `backend/src/modules/home/home.service.ts`
- `backend/src/modules/personal-expenses/personal-expense-queries.service.ts`
- `backend/src/modules/taxonomy/taxonomy.service.ts`
- `backend/src/modules/taxonomy/term-locale.spec.ts`
- `backend/src/modules/taxonomy/term-locale.ts`
- `backend/src/modules/users/dto/update-me.dto.ts`
- `backend/test/home-tasks.e2e-spec.ts`
- `backend/test/taxonomy.e2e-spec.ts`
- `web/e2e/fixtures/accounts.ts`
- `web/e2e/i18n-phase-2i2.spec.ts`
- `web/e2e/invitation-flow.spec.ts`
- `web/e2e/polish-phase-2e.spec.ts`
- `web/src/app/app/groups/[groupId]/invite/page.tsx`
- `web/src/app/app/groups/join/page.tsx`
- `web/src/app/app/groups/new/page.tsx`
- `web/src/app/app/groups/page.tsx`
- `web/src/app/app/route-boundaries.test.tsx`
- `web/src/app/layout.tsx`
- `web/src/features/groups/archive-empty-group-dialog.tsx`
- `web/src/features/groups/group-actions.test.tsx`
- `web/src/features/groups/group-client-api.test.ts`
- `web/src/features/groups/group-client-api.ts`
- `web/src/features/groups/group-detail.tsx`
- `web/src/features/groups/group-form.test.tsx`
- `web/src/features/groups/group-form.tsx`
- `web/src/features/groups/group-list.tsx`
- `web/src/features/groups/group-management.module.css`
- `web/src/features/groups/group-switcher.test.tsx`
- `web/src/features/groups/group-switcher.tsx`
- `web/src/features/groups/leave-group-dialog.tsx`
- `web/src/features/groups/member-roster.tsx`
- `web/src/features/home/home-page.tsx`
- `web/src/features/home/home-scene.module.css`
- `web/src/features/home/home-scene.tsx`
- `web/src/features/home/home.css`
- `web/src/features/invitations/invitation-flow.test.tsx`
- `web/src/features/invitations/invite-create-panel.tsx`
- `web/src/features/invitations/invite-share-panel.tsx`
- `web/src/features/invitations/join-group-form.test.tsx`
- `web/src/features/invitations/join-group-form.tsx`
- `web/src/features/personal-expenses/personal-box-form.test.tsx`
- `web/src/features/personal-expenses/personal-box-form.tsx`
- `web/src/features/personal-expenses/personal-expense-form.test.tsx`
- `web/src/features/personal-expenses/personal-expense-form.tsx`
- `web/src/features/personal-expenses/personal-page.test.tsx`
- `web/src/features/personal-expenses/personal-page.tsx`
- `web/src/features/personal-expenses/personal-reference-form.test.tsx`
- `web/src/features/personal-expenses/personal-reference-form.tsx`
- `web/src/features/personal-expenses/personal.css`
- `web/src/features/pooled-funds/pooled-expense-form.test.tsx`
- `web/src/features/pooled-funds/pooled-expense-form.tsx`
- `web/src/features/pooled-funds/pooled-space-form.tsx`
- `web/src/features/pooled-funds/pooled-space-list.test.tsx`
- `web/src/features/pooled-funds/pooled-space-list.tsx`
- `web/src/features/pooled-funds/pooled-workspace.test.tsx`
- `web/src/features/pooled-funds/pooled-workspace.tsx`
- `web/src/features/pooled-funds/pooled.css`
- `web/src/features/quick-expense/quick-expense.test.tsx`
- `web/src/features/quick-expense/quick-expense.tsx`
- `web/src/features/shared-expenses/personal-reference-form.test.tsx`
- `web/src/features/shared-expenses/personal-reference-form.tsx`
- `web/src/features/shared-expenses/shared-expense-form.test.tsx`
- `web/src/features/shared-expenses/shared-expense-form.tsx`
- `web/src/features/shared-expenses/shared-expense-list.tsx`
- `web/src/features/shared-expenses/shared-space-form.test.tsx`
- `web/src/features/shared-expenses/shared-space-form.tsx`
- `web/src/features/shared-expenses/shared-space-list.test.tsx`
- `web/src/features/shared-expenses/shared-space-list.tsx`
- `web/src/features/shared-expenses/shared-workspace.test.tsx`
- `web/src/features/shared-expenses/shared-workspace.tsx`
- `web/src/features/shared-expenses/shared.css`
- `web/src/features/shared-settlements/correction-form.test.tsx`
- `web/src/features/shared-settlements/correction-form.tsx`
- `web/src/features/shared-settlements/settlement-panel.test.tsx`
- `web/src/features/shared-settlements/settlement-panel.tsx`
- `web/src/features/shared-settlements/shared-lifecycle-panel.test.tsx`
- `web/src/features/shared-settlements/shared-lifecycle-panel.tsx`
- `web/src/features/tasks/task-center.test.tsx`
- `web/src/features/tasks/task-center.tsx`
- `web/src/features/tasks/tasks.css`
- `web/src/features/taxonomy/taxonomy-manager.test.tsx`
- `web/src/features/taxonomy/taxonomy-manager.tsx`
- `web/src/features/taxonomy/taxonomy-picker.test.tsx`
- `web/src/features/taxonomy/taxonomy-picker.tsx`
- `web/src/i18n/messages.test.ts`
- `web/src/i18n/messages/en.json`
- `web/src/i18n/messages/zh-TW.json`
- `web/src/i18n/no-hardcoded-copy.test.ts`
- `web/src/shared/drafts/blocked-expense-drafts.test.tsx`
- `web/src/shared/drafts/blocked-expense-drafts.tsx`
- `web/src/shared/drafts/draft-recovery.tsx`
- `web/src/shared/drafts/use-expense-draft.test.tsx`
- `web/src/shared/i18n/nowrap-date.tsx`
- `web/src/shared/ui/pixel-dialog.tsx`
- `web/src/shared/ui/pixel-dialogue.module.css`
- `web/src/shared/ui/pixel-notebook.module.css`
- `web/src/shared/ui/pixel-notebook.tsx`
- `web/src/shared/ui/pixel-ui.test.tsx`

## 截圖清單

- [A-correction-390x844-zh-after.png](screenshots/A-correction-390x844-zh-after.png)
- [A-correction-390x844-zh-before.png](screenshots/A-correction-390x844-zh-before.png)
- [A-draft-recovery-390x844-zh-after.png](screenshots/A-draft-recovery-390x844-zh-after.png)
- [A-draft-recovery-390x844-zh-before.png](screenshots/A-draft-recovery-390x844-zh-before.png)
- [A-fund-390x844-zh-after.png](screenshots/A-fund-390x844-zh-after.png)
- [A-fund-390x844-zh-before.png](screenshots/A-fund-390x844-zh-before.png)
- [A-fund-expense-390x844-zh-after.png](screenshots/A-fund-expense-390x844-zh-after.png)
- [A-fund-expense-390x844-zh-before.png](screenshots/A-fund-expense-390x844-zh-before.png)
- [A-fund-returns-390x844-zh-after.png](screenshots/A-fund-returns-390x844-zh-after.png)
- [A-fund-returns-390x844-zh-before.png](screenshots/A-fund-returns-390x844-zh-before.png)
- [A-fund-schedule-390x844-zh-after.png](screenshots/A-fund-schedule-390x844-zh-after.png)
- [A-fund-schedule-390x844-zh-before.png](screenshots/A-fund-schedule-390x844-zh-before.png)
- [A-home-empty-390x844-zh-after.png](screenshots/A-home-empty-390x844-zh-after.png)
- [A-home-empty-390x844-zh-before.png](screenshots/A-home-empty-390x844-zh-before.png)
- [A-home-idle-390x844-zh-after.png](screenshots/A-home-idle-390x844-zh-after.png)
- [A-home-idle-390x844-zh-before.png](screenshots/A-home-idle-390x844-zh-before.png)
- [A-home-offline-390x844-zh-after.png](screenshots/A-home-offline-390x844-zh-after.png)
- [A-home-offline-390x844-zh-before.png](screenshots/A-home-offline-390x844-zh-before.png)
- [A-home-ready-390x844-zh-after.png](screenshots/A-home-ready-390x844-zh-after.png)
- [A-home-ready-390x844-zh-before.png](screenshots/A-home-ready-390x844-zh-before.png)
- [A-landing-390x844-zh-after.png](screenshots/A-landing-390x844-zh-after.png)
- [A-landing-390x844-zh-before.png](screenshots/A-landing-390x844-zh-before.png)
- [A-lifecycle-390x844-zh-after.png](screenshots/A-lifecycle-390x844-zh-after.png)
- [A-lifecycle-390x844-zh-before.png](screenshots/A-lifecycle-390x844-zh-before.png)
- [A-personal-390x844-zh-after.png](screenshots/A-personal-390x844-zh-after.png)
- [A-personal-390x844-zh-before.png](screenshots/A-personal-390x844-zh-before.png)
- [A-personal-add-390x844-zh-after.png](screenshots/A-personal-add-390x844-zh-after.png)
- [A-personal-add-390x844-zh-before.png](screenshots/A-personal-add-390x844-zh-before.png)
- [A-quick-390x844-zh-after.png](screenshots/A-quick-390x844-zh-after.png)
- [A-quick-390x844-zh-before.png](screenshots/A-quick-390x844-zh-before.png)
- [A-reference-390x844-zh-after.png](screenshots/A-reference-390x844-zh-after.png)
- [A-reference-390x844-zh-before.png](screenshots/A-reference-390x844-zh-before.png)
- [A-settlement-390x844-zh-after.png](screenshots/A-settlement-390x844-zh-after.png)
- [A-settlement-390x844-zh-before.png](screenshots/A-settlement-390x844-zh-before.png)
- [A-shared-390x844-zh-after.png](screenshots/A-shared-390x844-zh-after.png)
- [A-shared-390x844-zh-before.png](screenshots/A-shared-390x844-zh-before.png)
- [A-shared-add-390x844-zh-after.png](screenshots/A-shared-add-390x844-zh-after.png)
- [A-shared-add-390x844-zh-before.png](screenshots/A-shared-add-390x844-zh-before.png)
- [A-start-settlement-390x844-zh-after.png](screenshots/A-start-settlement-390x844-zh-after.png)
- [A-start-settlement-390x844-zh-before.png](screenshots/A-start-settlement-390x844-zh-before.png)
- [A-start-settlement-390x844-zh-mask.png](screenshots/A-start-settlement-390x844-zh-mask.png)
- [A-tasks-390x844-zh-after.png](screenshots/A-tasks-390x844-zh-after.png)
- [A-tasks-390x844-zh-before.png](screenshots/A-tasks-390x844-zh-before.png)
- [A-taxonomy-390x844-zh-after.png](screenshots/A-taxonomy-390x844-zh-after.png)
- [A-taxonomy-390x844-zh-before.png](screenshots/A-taxonomy-390x844-zh-before.png)
- [B-fund-390x844-zh-after.png](screenshots/B-fund-390x844-zh-after.png)
- [B-fund-390x844-zh-before.png](screenshots/B-fund-390x844-zh-before.png)
- [B-home-empty-390x844-zh-after.png](screenshots/B-home-empty-390x844-zh-after.png)
- [B-home-empty-390x844-zh-before.png](screenshots/B-home-empty-390x844-zh-before.png)
- [B-home-idle-390x844-zh-after.png](screenshots/B-home-idle-390x844-zh-after.png)
- [B-home-idle-390x844-zh-before.png](screenshots/B-home-idle-390x844-zh-before.png)
- [B-home-offline-390x844-zh-after.png](screenshots/B-home-offline-390x844-zh-after.png)
- [B-home-offline-390x844-zh-before.png](screenshots/B-home-offline-390x844-zh-before.png)
- [B-home-ready-1024x768-zh-after.png](screenshots/B-home-ready-1024x768-zh-after.png)
- [B-home-ready-1024x768-zh-before.png](screenshots/B-home-ready-1024x768-zh-before.png)
- [B-home-ready-1024x768-zh-mask.png](screenshots/B-home-ready-1024x768-zh-mask.png)
- [B-home-ready-1280x720-zh-after.png](screenshots/B-home-ready-1280x720-zh-after.png)
- [B-home-ready-1280x720-zh-before.png](screenshots/B-home-ready-1280x720-zh-before.png)
- [B-home-ready-1280x720-zh-mask.png](screenshots/B-home-ready-1280x720-zh-mask.png)
- [B-home-ready-1366x768-zh-after.png](screenshots/B-home-ready-1366x768-zh-after.png)
- [B-home-ready-1366x768-zh-before.png](screenshots/B-home-ready-1366x768-zh-before.png)
- [B-home-ready-1366x768-zh-mask.png](screenshots/B-home-ready-1366x768-zh-mask.png)
- [B-home-ready-1440x900-zh-after.png](screenshots/B-home-ready-1440x900-zh-after.png)
- [B-home-ready-1440x900-zh-before.png](screenshots/B-home-ready-1440x900-zh-before.png)
- [B-home-ready-1440x900-zh-mask.png](screenshots/B-home-ready-1440x900-zh-mask.png)
- [B-home-ready-1536x864-zh-after.png](screenshots/B-home-ready-1536x864-zh-after.png)
- [B-home-ready-1536x864-zh-before.png](screenshots/B-home-ready-1536x864-zh-before.png)
- [B-home-ready-1536x864-zh-mask.png](screenshots/B-home-ready-1536x864-zh-mask.png)
- [B-home-ready-1920x1080-zh-after.png](screenshots/B-home-ready-1920x1080-zh-after.png)
- [B-home-ready-1920x1080-zh-before.png](screenshots/B-home-ready-1920x1080-zh-before.png)
- [B-home-ready-1920x1080-zh-mask.png](screenshots/B-home-ready-1920x1080-zh-mask.png)
- [B-home-ready-2560x1440-zh-after.png](screenshots/B-home-ready-2560x1440-zh-after.png)
- [B-home-ready-2560x1440-zh-before.png](screenshots/B-home-ready-2560x1440-zh-before.png)
- [B-home-ready-2560x1440-zh-mask.png](screenshots/B-home-ready-2560x1440-zh-mask.png)
- [B-home-ready-360x780-zh-after.png](screenshots/B-home-ready-360x780-zh-after.png)
- [B-home-ready-360x780-zh-before.png](screenshots/B-home-ready-360x780-zh-before.png)
- [B-home-ready-360x780-zh-mask.png](screenshots/B-home-ready-360x780-zh-mask.png)
- [B-home-ready-390x844-zh-after.png](screenshots/B-home-ready-390x844-zh-after.png)
- [B-home-ready-390x844-zh-before.png](screenshots/B-home-ready-390x844-zh-before.png)
- [B-home-ready-390x844-zh-mask.png](screenshots/B-home-ready-390x844-zh-mask.png)
- [B-home-ready-430x932-zh-after.png](screenshots/B-home-ready-430x932-zh-after.png)
- [B-home-ready-430x932-zh-before.png](screenshots/B-home-ready-430x932-zh-before.png)
- [B-home-ready-430x932-zh-mask.png](screenshots/B-home-ready-430x932-zh-mask.png)
- [B-home-ready-768x1024-zh-after.png](screenshots/B-home-ready-768x1024-zh-after.png)
- [B-home-ready-768x1024-zh-before.png](screenshots/B-home-ready-768x1024-zh-before.png)
- [B-home-ready-768x1024-zh-mask.png](screenshots/B-home-ready-768x1024-zh-mask.png)
- [B-personal-390x844-zh-after.png](screenshots/B-personal-390x844-zh-after.png)
- [B-personal-390x844-zh-before.png](screenshots/B-personal-390x844-zh-before.png)
- [B-shared-390x844-zh-after.png](screenshots/B-shared-390x844-zh-after.png)
- [B-shared-390x844-zh-before.png](screenshots/B-shared-390x844-zh-before.png)
- [B-tasks-390x844-zh-after.png](screenshots/B-tasks-390x844-zh-after.png)
- [B-tasks-390x844-zh-before.png](screenshots/B-tasks-390x844-zh-before.png)
- [draft-blocked-en-1440x900.png](screenshots/draft-blocked-en-1440x900.png)
- [draft-blocked-en-360x800.png](screenshots/draft-blocked-en-360x800.png)
- [draft-blocked-en-390x844.png](screenshots/draft-blocked-en-390x844.png)
- [draft-corrupt-en-1440x900.png](screenshots/draft-corrupt-en-1440x900.png)
- [draft-corrupt-en-360x800.png](screenshots/draft-corrupt-en-360x800.png)
- [draft-corrupt-en-390x844.png](screenshots/draft-corrupt-en-390x844.png)
- [draft-recovery-en-1440x900.png](screenshots/draft-recovery-en-1440x900.png)
- [draft-recovery-en-360x800.png](screenshots/draft-recovery-en-360x800.png)
- [draft-recovery-en-390x844.png](screenshots/draft-recovery-en-390x844.png)
- [fund-closing-en-1440x900.png](screenshots/fund-closing-en-1440x900.png)
- [fund-closing-en-360x800.png](screenshots/fund-closing-en-360x800.png)
- [fund-closing-en-390x844.png](screenshots/fund-closing-en-390x844.png)
- [fund-closing-panel-en-1440x900.png](screenshots/fund-closing-panel-en-1440x900.png)
- [fund-closing-panel-en-360x800.png](screenshots/fund-closing-panel-en-360x800.png)
- [fund-closing-panel-en-390x844.png](screenshots/fund-closing-panel-en-390x844.png)
- [fund-expense-en-1440x900.png](screenshots/fund-expense-en-1440x900.png)
- [fund-expense-en-360x800.png](screenshots/fund-expense-en-360x800.png)
- [fund-expense-en-390x844.png](screenshots/fund-expense-en-390x844.png)
- [fund-overdue-contribution-en-1440x900.png](screenshots/fund-overdue-contribution-en-1440x900.png)
- [fund-overdue-contribution-en-360x800.png](screenshots/fund-overdue-contribution-en-360x800.png)
- [fund-overdue-contribution-en-390x844.png](screenshots/fund-overdue-contribution-en-390x844.png)
- [fund-ready-en-1440x900.png](screenshots/fund-ready-en-1440x900.png)
- [fund-ready-en-360x800.png](screenshots/fund-ready-en-360x800.png)
- [fund-ready-en-390x844.png](screenshots/fund-ready-en-390x844.png)
- [fund-return-awaiting-receipt-en-1440x900.png](screenshots/fund-return-awaiting-receipt-en-1440x900.png)
- [fund-return-awaiting-receipt-en-360x800.png](screenshots/fund-return-awaiting-receipt-en-360x800.png)
- [fund-return-awaiting-receipt-en-390x844.png](screenshots/fund-return-awaiting-receipt-en-390x844.png)
- [fund-return-form-en-1440x900.png](screenshots/fund-return-form-en-1440x900.png)
- [fund-return-form-en-360x800.png](screenshots/fund-return-form-en-360x800.png)
- [fund-return-form-en-390x844.png](screenshots/fund-return-form-en-390x844.png)
- [fund-return-plan-en-1440x900.png](screenshots/fund-return-plan-en-1440x900.png)
- [fund-return-plan-en-360x800.png](screenshots/fund-return-plan-en-360x800.png)
- [fund-return-plan-en-390x844.png](screenshots/fund-return-plan-en-390x844.png)
- [fund-schedule-en-1440x900.png](screenshots/fund-schedule-en-1440x900.png)
- [fund-schedule-en-360x800.png](screenshots/fund-schedule-en-360x800.png)
- [fund-schedule-en-390x844.png](screenshots/fund-schedule-en-390x844.png)
- [groups-create-en-1440x900.png](screenshots/groups-create-en-1440x900.png)
- [groups-create-en-360x800.png](screenshots/groups-create-en-360x800.png)
- [groups-create-en-390x844.png](screenshots/groups-create-en-390x844.png)
- [groups-delete-en-1440x900.png](screenshots/groups-delete-en-1440x900.png)
- [groups-delete-en-360x800.png](screenshots/groups-delete-en-360x800.png)
- [groups-delete-en-390x844.png](screenshots/groups-delete-en-390x844.png)
- [groups-detail-390x844-zh-after.png](screenshots/groups-detail-390x844-zh-after.png)
- [groups-detail-390x844-zh-before.png](screenshots/groups-detail-390x844-zh-before.png)
- [groups-detail-en-1440x900.png](screenshots/groups-detail-en-1440x900.png)
- [groups-detail-en-360x800.png](screenshots/groups-detail-en-360x800.png)
- [groups-detail-en-390x844.png](screenshots/groups-detail-en-390x844.png)
- [groups-invite-390x844-zh-after.png](screenshots/groups-invite-390x844-zh-after.png)
- [groups-invite-390x844-zh-before.png](screenshots/groups-invite-390x844-zh-before.png)
- [groups-join-390x844-zh-after.png](screenshots/groups-join-390x844-zh-after.png)
- [groups-join-390x844-zh-before.png](screenshots/groups-join-390x844-zh-before.png)
- [groups-join-en-1440x900.png](screenshots/groups-join-en-1440x900.png)
- [groups-join-en-360x800.png](screenshots/groups-join-en-360x800.png)
- [groups-join-en-390x844.png](screenshots/groups-join-en-390x844.png)
- [groups-leave-en-1440x900.png](screenshots/groups-leave-en-1440x900.png)
- [groups-leave-en-360x800.png](screenshots/groups-leave-en-360x800.png)
- [groups-leave-en-390x844.png](screenshots/groups-leave-en-390x844.png)
- [groups-list-390x844-zh-after.png](screenshots/groups-list-390x844-zh-after.png)
- [groups-list-390x844-zh-before.png](screenshots/groups-list-390x844-zh-before.png)
- [groups-list-en-1440x900.png](screenshots/groups-list-en-1440x900.png)
- [groups-list-en-360x800.png](screenshots/groups-list-en-360x800.png)
- [groups-list-en-390x844.png](screenshots/groups-list-en-390x844.png)
- [groups-new-390x844-zh-after.png](screenshots/groups-new-390x844-zh-after.png)
- [groups-new-390x844-zh-before.png](screenshots/groups-new-390x844-zh-before.png)
- [home-empty-en-1440x900.png](screenshots/home-empty-en-1440x900.png)
- [home-empty-en-360x800.png](screenshots/home-empty-en-360x800.png)
- [home-empty-en-390x844.png](screenshots/home-empty-en-390x844.png)
- [home-offline-en-1440x900.png](screenshots/home-offline-en-1440x900.png)
- [home-offline-en-360x800.png](screenshots/home-offline-en-360x800.png)
- [home-offline-en-390x844.png](screenshots/home-offline-en-390x844.png)
- [home-quests-1-en-1440x900.png](screenshots/home-quests-1-en-1440x900.png)
- [home-quests-1-en-360x800.png](screenshots/home-quests-1-en-360x800.png)
- [home-quests-1-en-390x844.png](screenshots/home-quests-1-en-390x844.png)
- [home-quests-2-en-1440x900.png](screenshots/home-quests-2-en-1440x900.png)
- [home-quests-2-en-360x800.png](screenshots/home-quests-2-en-360x800.png)
- [home-quests-2-en-390x844.png](screenshots/home-quests-2-en-390x844.png)
- [home-quick-expense-en-1440x900.png](screenshots/home-quick-expense-en-1440x900.png)
- [home-quick-expense-en-360x800.png](screenshots/home-quick-expense-en-360x800.png)
- [home-quick-expense-en-390x844.png](screenshots/home-quick-expense-en-390x844.png)
- [home-ready-en-1440x900.png](screenshots/home-ready-en-1440x900.png)
- [home-ready-en-360x800.png](screenshots/home-ready-en-360x800.png)
- [home-ready-en-390x844.png](screenshots/home-ready-en-390x844.png)
- [invite-create-en-1440x900.png](screenshots/invite-create-en-1440x900.png)
- [invite-create-en-360x800.png](screenshots/invite-create-en-360x800.png)
- [invite-create-en-390x844.png](screenshots/invite-create-en-390x844.png)
- [invite-share-en-1440x900.png](screenshots/invite-share-en-1440x900.png)
- [invite-share-en-360x800.png](screenshots/invite-share-en-360x800.png)
- [invite-share-en-390x844.png](screenshots/invite-share-en-390x844.png)
- [personal-add-en-1440x900.png](screenshots/personal-add-en-1440x900.png)
- [personal-add-en-360x800.png](screenshots/personal-add-en-360x800.png)
- [personal-add-en-390x844.png](screenshots/personal-add-en-390x844.png)
- [personal-delete-en-1440x900.png](screenshots/personal-delete-en-1440x900.png)
- [personal-delete-en-360x800.png](screenshots/personal-delete-en-360x800.png)
- [personal-delete-en-390x844.png](screenshots/personal-delete-en-390x844.png)
- [personal-edit-en-1440x900.png](screenshots/personal-edit-en-1440x900.png)
- [personal-edit-en-360x800.png](screenshots/personal-edit-en-360x800.png)
- [personal-edit-en-390x844.png](screenshots/personal-edit-en-390x844.png)
- [personal-ready-en-1440x900.png](screenshots/personal-ready-en-1440x900.png)
- [personal-ready-en-360x800.png](screenshots/personal-ready-en-360x800.png)
- [personal-ready-en-390x844.png](screenshots/personal-ready-en-390x844.png)
- [personal-taxonomy-en-1440x900.png](screenshots/personal-taxonomy-en-1440x900.png)
- [personal-taxonomy-en-360x800.png](screenshots/personal-taxonomy-en-360x800.png)
- [personal-taxonomy-en-390x844.png](screenshots/personal-taxonomy-en-390x844.png)
- [shared-add-en-1440x900.png](screenshots/shared-add-en-1440x900.png)
- [shared-add-en-360x800.png](screenshots/shared-add-en-360x800.png)
- [shared-add-en-390x844.png](screenshots/shared-add-en-390x844.png)
- [shared-correction-en-1440x900.png](screenshots/shared-correction-en-1440x900.png)
- [shared-correction-en-360x800.png](screenshots/shared-correction-en-360x800.png)
- [shared-correction-en-390x844.png](screenshots/shared-correction-en-390x844.png)
- [shared-delete-en-1440x900.png](screenshots/shared-delete-en-1440x900.png)
- [shared-delete-en-360x800.png](screenshots/shared-delete-en-360x800.png)
- [shared-delete-en-390x844.png](screenshots/shared-delete-en-390x844.png)
- [shared-edit-en-1440x900.png](screenshots/shared-edit-en-1440x900.png)
- [shared-edit-en-360x800.png](screenshots/shared-edit-en-360x800.png)
- [shared-edit-en-390x844.png](screenshots/shared-edit-en-390x844.png)
- [shared-lifecycle-en-1440x900.png](screenshots/shared-lifecycle-en-1440x900.png)
- [shared-lifecycle-en-360x800.png](screenshots/shared-lifecycle-en-360x800.png)
- [shared-lifecycle-en-390x844.png](screenshots/shared-lifecycle-en-390x844.png)
- [shared-position-wrap-390x844-zh-before.png](screenshots/shared-position-wrap-390x844-zh-before.png)
- [shared-position-wrap-en-390x844.png](screenshots/shared-position-wrap-en-390x844.png)
- [shared-ready-en-1440x900.png](screenshots/shared-ready-en-1440x900.png)
- [shared-ready-en-360x800.png](screenshots/shared-ready-en-360x800.png)
- [shared-ready-en-390x844.png](screenshots/shared-ready-en-390x844.png)
- [shared-reference-en-1440x900.png](screenshots/shared-reference-en-1440x900.png)
- [shared-reference-en-360x800.png](screenshots/shared-reference-en-360x800.png)
- [shared-reference-en-390x844.png](screenshots/shared-reference-en-390x844.png)
- [shared-settlement-en-1440x900.png](screenshots/shared-settlement-en-1440x900.png)
- [shared-settlement-en-360x800.png](screenshots/shared-settlement-en-360x800.png)
- [shared-settlement-en-390x844.png](screenshots/shared-settlement-en-390x844.png)
- [shared-settlement-mixed-en-1440x900.png](screenshots/shared-settlement-mixed-en-1440x900.png)
- [shared-settlement-mixed-en-360x800.png](screenshots/shared-settlement-mixed-en-360x800.png)
- [shared-settlement-mixed-en-390x844.png](screenshots/shared-settlement-mixed-en-390x844.png)
- [shared-start-settlement-en-1440x900.png](screenshots/shared-start-settlement-en-1440x900.png)
- [shared-start-settlement-en-360x800.png](screenshots/shared-start-settlement-en-360x800.png)
- [shared-start-settlement-en-390x844.png](screenshots/shared-start-settlement-en-390x844.png)
- [tasks-ready-en-1440x900.png](screenshots/tasks-ready-en-1440x900.png)
- [tasks-ready-en-360x800.png](screenshots/tasks-ready-en-360x800.png)
- [tasks-ready-en-390x844.png](screenshots/tasks-ready-en-390x844.png)

## d7cee7a 文案檢查命中清單

以候選掃描器讀取乾淨 baseline worktree 的 `web/src`。測試按預期失敗；命中 481 條（CJK 421，英文 60）。

```text
app/app/groups/[groupId]/invite/page.tsx:17 [English] Invite gate
app/app/groups/[groupId]/invite/page.tsx:18 [English] Invite members to
app/app/groups/[groupId]/invite/page.tsx:20 [English] Create a short-lived invite link. Mimiku keeps group balances and
app/app/groups/join/page.tsx:9 [English] join an adventure party
app/app/groups/join/page.tsx:10 [English] Join group
app/app/groups/join/page.tsx:11 [English] Enter an invitation from a group member before reviewing it.
app/app/groups/new/page.tsx:9 [English] new adventure party
app/app/groups/new/page.tsx:10 [English] Create group
app/app/groups/new/page.tsx:11 [English] Start a shared treasury for two people or a small group.
app/app/groups/page.tsx:20 [English] party roster
app/app/groups/page.tsx:21 [English] Your shared groups
app/app/groups/page.tsx:22 [English] Choose a treasury party, create a new one, or join with an invite.
app/app/groups/page.tsx:25 [English] Create group
app/app/groups/page.tsx:28 [English] Join group
features/groups/archive-empty-group-dialog.tsx:135 [English] The empty group will be removed from view and archived.
features/groups/archive-empty-group-dialog.tsx:143 [English] Type the group name to confirm
features/groups/group-detail.tsx:52 [English] group detail
features/groups/group-detail.tsx:61 [English] Invite members
features/groups/group-detail.tsx:64 [English] Rename group
features/groups/group-detail.tsx:71 [English] Leave group
features/groups/group-detail.tsx:77 [English] Members
features/groups/group-detail.tsx:84 [English] Rename
features/groups/group-detail.tsx:125 [English] Danger zone
features/groups/group-detail.tsx:126 [English] Remove a group only when bookkeeping has not started.
features/groups/group-detail.tsx:133 [English] Delete empty group
features/groups/group-form.tsx:86 [English] Group name
features/groups/group-form.tsx:95 [English] Group type
features/groups/group-form.tsx:103 [English] Couple
features/groups/group-form.tsx:112 [English] Group
features/groups/group-form.tsx:116 [English] Currency
features/groups/group-list.tsx:25 [English] Open treasury
features/groups/group-switcher.tsx:18 [CJK] <nav aria-label="選擇共同寶庫" className={styles.groupSwitcher}>
features/groups/leave-group-dialog.tsx:62 [English] Leaving keeps your historical records in place. Settle open balances
features/groups/leave-group-dialog.tsx:66 [English] Leave group
features/home/home-page.tsx:12 [CJK] const modeLabel = { PERSONAL_EXPENSES: '個人記帳', SHARED_EXPENSES: '共同分帳', POOLED_FUND: '共同基金' } as const;
features/home/home-page.tsx:44 [CJK] if (card.mode === 'PERSONAL_EXPENSES') return <><span>本月支出</span><strong>{money(card.spending_minor)}</strong>
features/home/home-page.tsx:45 [CJK] <small>{card.recent_categories.length ? `近期分類：${card.recent_categories.map((item) => item.category_name).join('、')}` : '還沒有本月支出'}</small></>;
features/home/home-page.tsx:48 [CJK] return <><span>{value > BigInt(0) ? '目前應收' : value < BigInt(0) ? '目前應付' : '目前已結清'}</span><strong>{money((value < BigInt(0) ? -value : value).toString())}</strong>
features/home/home-page.tsx:49 [CJK] <small>本期共同支出 {money(card.spending_minor)}{card.pending_batch ? ' · 結算進行中' : ''}</small></>;
features/home/home-page.tsx:51 [CJK] return <><span>可用餘額</span><strong>{money(card.available_balance_minor)}</strong><small>帳面 {money(card.book_balance_minor)} · 待付代墊 {money(card.pending_reimbursement_minor)}</small>
features/home/home-page.tsx:52 [CJK] {card.shortfall_minor !== '0' && <em>資金缺口 {money(card.shortfall_minor)}</em>}
features/home/home-page.tsx:53 [CJK] {card.next_occurrence && <small>下次投入 {card.next_occurrence.due_on} · {money(card.next_occurrence.amount_minor)}</small>}</>;
features/home/home-page.tsx:59 [CJK] const title = data.context.kind === 'PERSONAL' ? '我的寶箱' : data.context.name;
features/home/home-page.tsx:60 [CJK] const description = data.context.kind === 'PERSONAL' ? '只看自己的日常支出，不把它和共同金流混在一起。' : '只顯示你參與的財務內容；群組治理與寶箱權限各自獨立。';
features/home/home-page.tsx:70 [CJK] </Link> : <p>還沒有冒險紀錄</p>}
features/home/home-page.tsx:71 [CJK] {data.task_count > 0 && <Link href="/app/tasks">{data.task_count} 個待辦</Link>}
features/home/home-page.tsx:74 [CJK] {!online && <p className="space-home-state" role="status">目前離線，顯示最後載入的狀態；記帳動作已停用。</p>}
features/home/home-page.tsx:77 [CJK] <nav aria-label="切換財務情境" className="space-home-contexts"><Link aria-current={data.context.kind === 'PERSONAL' ? 'page' : undefined} href="/app">我的寶箱</Link>
features/home/home-page.tsx:81 [CJK] {!data.cards.length ? <PixelPanel><h2>這裡還沒有寶箱</h2><p>{data.context.kind === 'PERSONAL' ? '建立個人寶箱，開始記錄日常支出。' : '從群組頁建立共同分帳或共同基金寶箱。'}</p>
features/home/home-page.tsx:82 [CJK] <Link href={data.context.kind === 'PERSONAL' ? '/app/personal' : `/app/groups/${data.context.id}`}>前往建立寶箱</Link></PixelPanel>
features/home/home-page.tsx:83 [CJK] : <section aria-label="寶箱列表" className="space-home-grid">{data.cards.map((card) => card.access === 'GOVERNANCE'
features/home/home-page.tsx:84 [CJK] ? <PixelPanel className="space-card space-card--governance" key={card.id}><span>{modeLabel[card.mode]}</span><h2>{card.name}</h2><p>僅群組治理資訊。你不是這個寶箱的參與者，財務內容不會顯示。</p></PixelPanel>
features/home/home-page.tsx:87 [CJK] {card.recent_activity[0] && <small>最近：{card.recent_activity[0].title} · {card.recent_activity[0].occurred_on}</small>}</Link>)}</section>}
features/home/home-page.tsx:88 [CJK] <small className="space-home-generated">狀態時間：{formatGeneratedAt(data.generated_at)}</small>
features/home/home-scene.tsx:62 [CJK] const line = !online ? "現在離線，我先幫你看著最後的狀態。"
features/home/home-scene.tsx:63 [CJK] : !cards.length ? "這裡還空空的，先建立一個寶箱吧！"
features/home/home-scene.tsx:64 [CJK] : taskCount > 0 ? `有 ${taskCount} 件事等你確認喔。` : "今天要記點什麼嗎？";
features/home/home-scene.tsx:110 [CJK] <PixelDialogue speaker="咪咪庫 / Mimiku" actions={<QuickExpense cards={cards} initiallyOpen={openQuick} />}>
features/invitations/invite-create-panel.tsx:75 [English] Party invite
features/invitations/invite-create-panel.tsx:76 [English] Bring a partner into this quest.
features/invitations/invite-create-panel.tsx:78 [English] Generate a private invite. Email is optional, but a locked invite
features/invitations/invite-create-panel.tsx:83 [English] Mimiku carrying a fresh invite
features/invitations/invite-create-panel.tsx:96 [English] Invite email
features/invitations/invite-create-panel.tsx:99 [English] friend@example.com
features/invitations/invite-share-panel.tsx:80 [English] Invite code
features/invitations/invite-share-panel.tsx:87 [English] Invite link
features/invitations/invite-share-panel.tsx:92 [English] Expires
features/invitations/invite-share-panel.tsx:96 [English] Copy code
features/invitations/invite-share-panel.tsx:99 [English] Copy link
features/invitations/invite-share-panel.tsx:103 [English] Share invite
features/invitations/join-group-form.tsx:45 [English] Invite code or link
features/invitations/join-group-form.tsx:55 [English] Review invite
features/personal-expenses/personal-box-form.tsx:23 [CJK] } catch { setError('無法確認寶箱是否建立，請重新整理清單後再試。'); }
features/personal-expenses/personal-box-form.tsx:27 [CJK] <p>只有你能讀取此寶箱的支出。第一筆記帳後，幣別與時區即固定。</p>
features/personal-expenses/personal-box-form.tsx:28 [CJK] <PixelField label="寶箱名稱" required maxLength={100} value={name} onChange={e => setName(e.target.value)} disabled={busy} />
features/personal-expenses/personal-box-form.tsx:29 [CJK] <label className="pixel-field">幣別<select value={currency} onChange={e => setCurrency(e.target.value)} disabled={busy} className="pixel-field__input">
features/personal-expenses/personal-box-form.tsx:33 [CJK] {!online && <p role="status">目前離線，尚未建立寶箱。</p>}
features/personal-expenses/personal-box-form.tsx:34 [CJK] <PixelButton disabled={busy || !online}>{busy ? '建立中…' : '建立個人寶箱'}</PixelButton>
features/personal-expenses/personal-expense-form.tsx:75 [CJK] catch { setError('請輸入符合幣別小數位數的正數金額。'); return; }
features/personal-expenses/personal-expense-form.tsx:79 [CJK] if (!savedDraft) { setError('這個裝置目前無法保存草稿，尚未送出。請保留此頁並稍後再試。'); return; }
features/personal-expenses/personal-expense-form.tsx:90 [CJK] setConflict(true); setError('資料已變更，請重新讀取最新資料並檢查後再操作。你的輸入仍保留在此。');
features/personal-expenses/personal-expense-form.tsx:92 [CJK] setError('目前的帳號或寶箱權限已變更。草稿仍保留在這個裝置，請重新開啟寶箱確認。');
features/personal-expenses/personal-expense-form.tsx:94 [CJK] setError('伺服器未接受這份草稿。請檢查日期、金額與類別後再手動重試。');
features/personal-expenses/personal-expense-form.tsx:95 [CJK] } else setError('尚未確認入帳。草稿已保存在這個裝置；相同內容重試不會重複記帳。');
features/personal-expenses/personal-expense-form.tsx:103 [CJK] if (record && (!refreshed || refreshed.status !== 'ACTIVE')) { setError('這筆支出已不在目前清單，請關閉表單後檢查。輸入仍保留。'); return; }
features/personal-expenses/personal-expense-form.tsx:105 [CJK] } catch { setError('重新讀取失敗，輸入仍保留。請稍後再試。'); }
features/personal-expenses/personal-expense-form.tsx:110 [CJK] <PixelField label="支出名稱" value={title} onChange={e => change(setTitle, e.target.value)} required maxLength={200} disabled={busy || recoveryPending} />
features/personal-expenses/personal-expense-form.tsx:111 [CJK] <PixelField label={`金額（${currency}）`} inputMode="decimal" value={amount} onChange={e => change(setAmount, e.target.value)} required disabled={busy || recoveryPending} />
features/personal-expenses/personal-expense-form.tsx:112 [CJK] <PixelField label="支出日期" type="date" value={date} max={today(timezone)} onChange={e => change(setDate, e.target.value)} required disabled={busy || recoveryPending} />
features/personal-expenses/personal-expense-form.tsx:114 [CJK] <PixelField label="備註" value={note} onChange={e => change(setNote, e.target.value)} maxLength={2000} disabled={busy || recoveryPending} />
features/personal-expenses/personal-expense-form.tsx:115 [CJK] {!online && <p role="status">目前離線，尚未入帳。草稿會保留在這個裝置；重新連線後仍需檢視並手動送出。</p>}
features/personal-expenses/personal-expense-form.tsx:116 [CJK] {draft.storageError && <p role="alert">這個裝置目前無法保存草稿。請不要關閉此頁。</p>}
features/personal-expenses/personal-expense-form.tsx:118 [CJK] {latest && <p role="status">最新紀錄：「{latest.title}」{formatMinorUnit(latest.amount_minor, currency, 'zh-TW')}（{latest.occurred_on}）。上方保留你的輸入，請比較後再儲存。</p>}
features/personal-expenses/personal-expense-form.tsx:119 [CJK] {conflict && onReload && <PixelButton type="button" emphasis="secondary" disabled={busy || !online} onClick={() => void reviewLatest()}>重新讀取最新資料</PixelButton>}
features/personal-expenses/personal-expense-form.tsx:120 [CJK] <PixelButton type="submit" disabled={!online || busy || conflict || !writable || recoveryPending}>{busy ? '確認中…' : draft.reviewed ? '重新送出草稿' : record ? '儲存修改' : '確認記帳'}</PixelButton>
features/personal-expenses/personal-page.tsx:52 [CJK] return terms.find(item => item.id === term?.canonical_id)?.name ?? term?.name ?? '未分類';
features/personal-expenses/personal-page.tsx:68 [CJK] setNotice(result.record.status === 'DELETED' ? `已刪除「${result.record.title}」，月支出將重新計算。` : `已儲存「${result.record.title}」${money(result.record.amount_minor)}。`);
features/personal-expenses/personal-page.tsx:73 [CJK] try { await refresh(); } catch { setError('已確認儲存，但月支出更新失敗；目前顯示先前資料，請重新讀取。'); }
features/personal-expenses/personal-page.tsx:81 [CJK] setNotice(result.reference.status === 'REMOVED' ? '已移除私人參照，月支出將重新計算。' : '已儲存共同分帳的私人資訊。');
features/personal-expenses/personal-page.tsx:82 [CJK] try { await refresh(); } catch { setError('已確認儲存，但月支出更新失敗；目前顯示先前資料，請重新讀取。'); }
features/personal-expenses/personal-page.tsx:91 [CJK] else { setDialog(null); setEditing(undefined); setNotice('清單已更新，請重新選擇要操作的支出。'); }
features/personal-expenses/personal-page.tsx:93 [CJK] } catch { setError('讀取失敗，目前仍顯示先前資料。請稍後重新讀取。'); }
features/personal-expenses/personal-page.tsx:106 [CJK] } catch { setError('刪除尚未確認。若資料已變更，請重新讀取後再確認。'); }
features/personal-expenses/personal-page.tsx:119 [CJK] } catch { setError('移除尚未確認。若資料已變更，請重新讀取後再確認。'); }
features/personal-expenses/personal-page.tsx:128 [CJK] if (next.view_version !== monthData.view_version) { await refresh(); setNotice('支出已有變更，已重新載入第一頁。'); }
features/personal-expenses/personal-page.tsx:130 [CJK] } catch { setError('無法載入更多支出，請重新讀取。'); }
features/personal-expenses/personal-page.tsx:134 [CJK] <header className="personal-heading"><div><p className="personal-eyebrow ledger-with-icon"><LedgerIcon name="mode-personal" />PERSONAL EXPENSES · 個人記帳</p><h1>我的寶箱</h1><p>把日常花費記下來，慢慢看懂自己的生活。</p></div>
features/personal-expenses/personal-page.tsx:135 [CJK] <PixelButton onClick={() => setDialog('box')}>新增寶箱</PixelButton></header>
features/personal-expenses/personal-page.tsx:139 [CJK] {error && <div role="alert"><p>{error}</p><PixelButton emphasis="secondary" onClick={() => void reload()} disabled={busy || !online}>重新讀取</PixelButton></div>}
features/personal-expenses/personal-page.tsx:140 [CJK] {!space || !monthData ? <PixelPanel><h2>你的第一個個人寶箱</h2><p>不需要群組。建立寶箱後，就能記錄每天的支出。</p></PixelPanel> : <>
features/personal-expenses/personal-page.tsx:142 [CJK] <label className="pixel-field">目前寶箱<select className="pixel-field__input" value={space.id} onChange={e => router.push(`/app/personal?space=${e.target.value}&month=${monthData.month}`)}>
features/personal-expenses/personal-page.tsx:143 [CJK] {data.spaces.map(item => <option value={item.id} key={item.id}>{item.name}{item.access === 'PARTICIPANT' ? ` · ${item.currency}` : ''}{item.status === 'ARCHIVED' ? '（已封存）' : ''}</option>)}
features/personal-expenses/personal-page.tsx:145 [CJK] <label className="pixel-field">查看月份<input className="pixel-field__input" type="month" value={monthData.month} onChange={e => { if (/^\d{4}-\d{2}$/.test(e.target.value)) router.push(`/app/personal?space=${space.id}&month=${e.target.value}`); }} /></label>
features/personal-expenses/personal-page.tsx:148 [CJK] <PixelPanel className="personal-total"><p>{monthData.month} 月支出 · {monthData.currency}</p><strong data-testid="monthly-spending">{money(monthData.spending_minor)}</strong><p>僅計入「{space.name}」的支出</p></PixelPanel>
features/personal-expenses/personal-page.tsx:149 [CJK] <PixelPanel><h2>花在哪裡</h2>{monthData.categories.length ? <ul className="personal-breakdown">{monthData.categories.map(category => <li key={category.category_id}><span>{category.category_name}</span><strong>{money(category.spending_minor)}</strong></li>)}</ul> : <p>這個月還沒有支出。</p>}</PixelPanel>
features/personal-expenses/personal-page.tsx:151 [CJK] <PixelNotebook titleId="personal-records-title"><div className="personal-heading"><h2 id="personal-records-title">日常支出</h2><PixelButton disabled={space.status !== 'ACTIVE'} onClick={() => { setEditing(undefined); setDialog('expense'); }}>記一筆支出</PixelButton></div>
features/personal-expenses/personal-page.tsx:153 [CJK] <ul className="notebook-list personal-records">{monthData.items.map(record => <li key={record.id} className="notebook-row"><LedgerIcon name="event-expense" /><div>{record.entry_type === 'SHARED_REFERENCE' && <div className="personal-record-source"><span className="personal-source-badge">來自共同分帳</span>{record.source_locked && <span className="personal-lock-badge notebook-secondary"><LedgerIcon name="status-lock" size={32} />來源已鎖定</span>}</div>}<time>{record.entry_type === 'MANUAL' && '支出 · '}{record.occurred_on}</time><h3>{record.title}</h3><p>{record.category_name}{record.tag_ids.map(id => ` · ${termName(id)}`).join('')}</p>{record.note && <p>{record.note}</p>}</div><div className="notebook-amount"><strong>{money(record.amount_minor)}</strong><div>
features/personal-expenses/personal-page.tsx:154 [CJK] {record.entry_type === 'MANUAL' ? <><PixelButton emphasis="ghost" disabled={space.status !== 'ACTIVE'} aria-label={`編輯 ${record.title}`} onClick={() => { setEditing(record); setDialog('expense'); }}>編輯</PixelButton>
features/personal-expenses/personal-page.tsx:155 [CJK] <PixelButton emphasis="ghost" disabled={space.status !== 'ACTIVE'} aria-label={`刪除 ${record.title}`} onClick={() => { setEditing(record); setError(''); setDialog('delete'); }}>刪除</PixelButton></> : <><PixelButton emphasis="ghost" disabled={space.status !== 'ACTIVE'} aria-label={`編輯私人資訊－${record.title}`} onClick={() => { setEditing(record); setDialog('reference'); }}>編輯私人資訊</PixelButton>
features/personal-expenses/personal-page.tsx:156 [CJK] <PixelButton emphasis="ghost" disabled={space.status !== 'ACTIVE'} aria-label={`移除私人參照－${record.title}`} onClick={() => { setEditing(record); setError(''); setDialog('remove-reference'); }}>移除參照</PixelButton></>}
features/personal-expenses/personal-page.tsx:158 [CJK] {monthData.next_cursor && <PixelButton emphasis="secondary" onClick={() => void more()} disabled={busy || !online}>載入更多</PixelButton>}
features/personal-expenses/personal-page.tsx:160 [CJK] <PixelButton emphasis="secondary" onClick={() => setDialog('taxonomy')}>管理類別與標籤</PixelButton>
features/personal-expenses/personal-page.tsx:162 [CJK] <PixelDialog open={dialog === 'box'} title="新增個人寶箱" onClose={() => setDialog(null)} closeLabel="關閉">
features/personal-expenses/personal-page.tsx:165 [CJK] <PixelDialog open={dialog === 'expense'} title={editing ? '編輯支出' : '記一筆支出'} onClose={closeExpense} closeLabel="關閉">
features/personal-expenses/personal-page.tsx:172 [CJK] <PixelDialog open={dialog === 'reference'} title="編輯共同分帳的私人資訊" onClose={() => setDialog(null)} closeLabel="關閉">
features/personal-expenses/personal-page.tsx:175 [CJK] <PixelDialog open={dialog === 'taxonomy'} title="管理類別與標籤" onClose={() => setDialog(null)} closeLabel="關閉">
features/personal-expenses/personal-page.tsx:178 [CJK] <PixelDialog open={dialog === 'delete'} title="刪除此筆支出？" onClose={() => setDialog(null)} closeDisabled={busy} closeLabel="關閉">
features/personal-expenses/personal-page.tsx:179 [CJK] <p>「{editing?.title}」{editing && money(editing.amount_minor)} 將從月支出中移除，稽核紀錄會保留。</p>
features/personal-expenses/personal-page.tsx:181 [CJK] <PixelButton emphasis="danger" onClick={() => void remove()} disabled={busy || !online}>確認刪除</PixelButton>
features/personal-expenses/personal-page.tsx:182 [CJK] <PixelButton emphasis="secondary" onClick={() => void reload()} disabled={busy || !online}>重新讀取最新資料</PixelButton>
features/personal-expenses/personal-page.tsx:184 [CJK] <PixelDialog open={dialog === 'remove-reference'} title="移除這筆私人參照？" onClose={() => setDialog(null)} closeDisabled={busy} closeLabel="關閉">
features/personal-expenses/personal-page.tsx:185 [CJK] <p>只會把「{editing?.title}」從你的個人帳本移除；共同交易不會被刪除或修改。</p>
features/personal-expenses/personal-page.tsx:187 [CJK] <PixelButton emphasis="danger" onClick={() => void removeReference()} disabled={busy || !online}>確認移除</PixelButton>
features/personal-expenses/personal-page.tsx:188 [CJK] <PixelButton emphasis="secondary" onClick={() => void reload()} disabled={busy || !online}>重新讀取最新資料</PixelButton>
features/personal-expenses/personal-page.tsx:134 [English] PERSONAL EXPENSES · 個人記帳
features/personal-expenses/personal-reference-form.tsx:52 [CJK] setError('資料版本已變更。重新讀取最新資料並比較後再儲存；你的私人輸入仍保留。');
features/personal-expenses/personal-reference-form.tsx:54 [CJK] setError('尚未確認儲存。相同內容重試會沿用同一個請求識別，不會重複修改。');
features/personal-expenses/personal-reference-form.tsx:65 [CJK] setError('這筆私人參照已不在目前清單。你的輸入仍保留，請關閉後檢查。');
features/personal-expenses/personal-reference-form.tsx:69 [CJK] } catch { setError('重新讀取失敗，私人輸入仍保留。請稍後再試。'); }
features/personal-expenses/personal-reference-form.tsx:74 [CJK] <p className="personal-reference-ticket">共同交易的金額、日期、付款與分攤維持唯讀；這裡只整理你的私人資訊。</p>
features/personal-expenses/personal-reference-form.tsx:75 [CJK] {reference.source_locked && <p className="personal-reference-lock">來源已鎖定。若需修正共同交易，請在共同分帳建立新一期更正。</p>}
features/personal-expenses/personal-reference-form.tsx:76 [CJK] {availableTags.length > 0 && <fieldset className="personal-reference-tags"><legend>私人標籤</legend>
features/personal-expenses/personal-reference-form.tsx:79 [CJK] <PixelField label="私人備註" value={note} onChange={event => { setNote(event.target.value); setConflict(false); }} maxLength={2000} disabled={busy}
features/personal-expenses/personal-reference-form.tsx:80 [CJK] description="只有你能在個人帳本看到。" />
features/personal-expenses/personal-reference-form.tsx:81 [CJK] {!online && <p role="status">目前離線，尚未儲存。私人輸入只暫留在這個表單。</p>}
features/personal-expenses/personal-reference-form.tsx:83 [CJK] {latest && <p role="status">最新私人資訊：{latest.note ? `「${latest.note}」` : '沒有備註'}。上方仍保留你的輸入，請比較後再儲存。</p>}
features/personal-expenses/personal-reference-form.tsx:84 [CJK] {conflict && onReload && <PixelButton type="button" emphasis="secondary" onClick={() => void reload()} disabled={busy || !online}>重新讀取最新資料</PixelButton>}
features/personal-expenses/personal-reference-form.tsx:85 [CJK] <PixelButton type="submit" disabled={busy || !online || conflict}>{busy ? '確認中…' : '儲存私人資訊'}</PixelButton>
features/pooled-funds/pooled-expense-form.tsx:43 [CJK] setError('參與權限已變更，這份代墊草稿不能直接恢復。請丟棄後依目前參與者重新輸入。');
features/pooled-funds/pooled-expense-form.tsx:56 [CJK] if (!saved) { setError('這個裝置目前無法保存草稿，尚未送出。請保留此頁並稍後再試。'); return; }
features/pooled-funds/pooled-expense-form.tsx:58 [CJK] } catch { setError('請填寫名稱、日期、正數金額與代墊參與者。'); }
features/pooled-funds/pooled-expense-form.tsx:63 [CJK] <PixelField label="支出名稱" value={title} onChange={(event) => change(setTitle, event.target.value)} required disabled={disabled} />
features/pooled-funds/pooled-expense-form.tsx:64 [CJK] <PixelField label="金額" inputMode="decimal" value={amount} onChange={(event) => change(setAmount, event.target.value)} required disabled={disabled} />
features/pooled-funds/pooled-expense-form.tsx:65 [CJK] <PixelField label="支出日期" type="date" value={date} onChange={(event) => change(setDate, event.target.value)} required disabled={disabled} />
features/pooled-funds/pooled-expense-form.tsx:66 [CJK] <fieldset disabled={disabled}><legend>付款來源</legend><label><input aria-label="基金直接支付" type="radio" name="source" checked={source === 'FUND_PAID'} onChange={() => change(setSource, 'FUND_PAID')} />基金直接支付</label>
features/pooled-funds/pooled-expense-form.tsx:67 [CJK] <label><input aria-label="參與者先代墊" type="radio" name="source" checked={source === 'PARTICIPANT_ADVANCED'} onChange={() => change(setSource, 'PARTICIPANT_ADVANCED')} />參與者先代墊</label></fieldset>
features/pooled-funds/pooled-expense-form.tsx:68 [CJK] {source === 'PARTICIPANT_ADVANCED' && <label className="pixel-field">代墊參與者<select disabled={disabled} aria-label="代墊參與者" required className="pixel-field__input" value={advancedBy} onChange={(event) => change(setAdvancedBy, event.target.value)}>
features/pooled-funds/pooled-expense-form.tsx:69 [CJK] <option value="">選擇參與者</option>{participants.filter((person) => person.effective_to === null).map((person) => <option key={person.user_id} value={person.user_id}>{person.display_name}</option>)}</select></label>}
features/pooled-funds/pooled-expense-form.tsx:70 [CJK] {!online && <p role="status">目前離線，尚未入帳。草稿會保留在這個裝置；重新連線後仍需檢視並手動送出。</p>}
features/pooled-funds/pooled-expense-form.tsx:71 [CJK] {draft.storageError && <p role="alert">這個裝置目前無法保存草稿。請不要關閉此頁。</p>}
features/pooled-funds/pooled-expense-form.tsx:74 [CJK] {draft.reviewed ? '重新送出草稿' : '記錄基金支出'}
features/pooled-funds/pooled-space-form.tsx:26 [CJK] } catch { setError('尚未確認共同基金是否建立。請重新讀取群組後再決定是否重試。'); }
features/pooled-funds/pooled-space-form.tsx:30 [CJK] <p>這個寶箱只計算實際投入、基金支出、代墊與退回；預期投入不會算進餘額。</p>
features/pooled-funds/pooled-space-form.tsx:31 [CJK] <PixelField label="寶箱名稱" required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} disabled={busy} />
features/pooled-funds/pooled-space-form.tsx:32 [CJK] <label className="pixel-field">幣別<select aria-label="幣別" className="pixel-field__input" value={currency} onChange={(event) => setCurrency(event.target.value)} disabled={busy}>
features/pooled-funds/pooled-space-form.tsx:35 [CJK] {!online && <p role="status">目前離線，尚未建立寶箱。</p>}
features/pooled-funds/pooled-space-form.tsx:37 [CJK] <PixelButton disabled={!online || busy || !name.trim()}>{busy ? '建立中…' : '建立共同基金'}</PixelButton>
features/pooled-funds/pooled-space-list.tsx:17 [CJK] <div className="pooled-section-heading"><div><p>共同寶箱</p><h2>共同基金</h2></div>
features/pooled-funds/pooled-space-list.tsx:18 [CJK] <PixelButton type="button" onClick={() => setCreating(true)}>建立共同基金寶箱</PixelButton></div>
features/pooled-funds/pooled-space-list.tsx:19 [CJK] {!spaces.length ? <p>還沒有共同基金。建立後，加入參與者並設定投入排程。</p> : <ul className="pooled-space-list">
features/pooled-funds/pooled-space-list.tsx:21 [CJK] <strong>{space.name}</strong><span>{space.currency} · {space.role === 'MANAGER' ? '管理者' : '參與者'}{space.status === 'CLOSING' ? ' · 結清中' : space.status === 'ARCHIVED' ? ' · 已封存' : ''}</span>
features/pooled-funds/pooled-space-list.tsx:22 [CJK] </Link> : <div><strong>{space.name}</strong><span>共同基金 · {space.status === 'ARCHIVED' ? '已封存' : '使用中'} · 僅群組治理資訊</span></div>}</li>)}
features/pooled-funds/pooled-space-list.tsx:24 [CJK] <PixelDialog open={creating} title="建立共同基金寶箱" closeLabel="關閉" onClose={() => setCreating(false)}>
features/pooled-funds/pooled-workspace.tsx:54 [CJK] const nameFor = (id: string) => data.participants.find((person) => person.user_id === id)?.display_name ?? '已離開的參與者';
features/pooled-funds/pooled-workspace.tsx:55 [CJK] const termName = (id: string) => data.terms.find((term) => term.id === id)?.name ?? '已封存項目';
features/pooled-funds/pooled-workspace.tsx:85 [CJK] if (!(failure instanceof AppClientError)) return '操作結果尚未確認。請重新讀取後再試。';
features/pooled-funds/pooled-workspace.tsx:87 [CJK] SPACE_VERSION_CONFLICT: '寶箱資料已變更。已保留安全輸入，請重新讀取後再試。',
features/pooled-funds/pooled-workspace.tsx:88 [CJK] POOLED_OCCURRENCE_PENDING: '仍有預期投入未處理，請先確認、略過或取消。',
features/pooled-funds/pooled-workspace.tsx:89 [CJK] POOLED_REIMBURSEMENT_PENDING: '仍有代墊款未完成雙方確認。',
features/pooled-funds/pooled-workspace.tsx:90 [CJK] POOLED_RETURN_PENDING: '仍有基金退回尚未完成收款確認。',
features/pooled-funds/pooled-workspace.tsx:91 [CJK] POOLED_SHORTFALL: '目前仍有資金缺口，請先補足投入。',
features/pooled-funds/pooled-workspace.tsx:92 [CJK] POOLED_RETURN_TOTAL_INVALID: '退回金額必須明確指定，且合計等於帳面餘額。',
features/pooled-funds/pooled-workspace.tsx:93 [CJK] POOLED_SPACE_STATE_CONFLICT: '這個動作不適用於目前的寶箱狀態。',
features/pooled-funds/pooled-workspace.tsx:95 [CJK] return messages[failure.code] ?? '目前不能完成此操作；請檢查狀態並重新讀取。';
features/pooled-funds/pooled-workspace.tsx:137 [CJK] `occurrence:${id}:${action}:${version}`, pooledOccurrenceMutationSchema.parse, action === 'confirm' ? '已確認實際投入。' : '投入狀態已更新。');
features/pooled-funds/pooled-workspace.tsx:144 [CJK] received ? '已確認收到代墊款。' : '已確認基金送出代墊款。');
features/pooled-funds/pooled-workspace.tsx:149 [CJK] `return:${id}:${received}:${version}`, pooledReturnMutationSchema.parse, received ? '已確認收到基金退回。' : '已確認送出基金退回。');
features/pooled-funds/pooled-workspace.tsx:153 [CJK] <header className="pooled-hero"><div><p className="pooled-eyebrow ledger-with-icon"><LedgerIcon name="mode-pooled" />POOLED FUND · 共同基金</p><h1>{space.name}</h1>
features/pooled-funds/pooled-workspace.tsx:154 [CJK] <p>{group.name} · {space.currency} · {manager ? '寶箱管理者' : '參與者'}</p></div>
features/pooled-funds/pooled-workspace.tsx:158 [CJK] {!online && <p role="status" className="pooled-offline ledger-with-icon"><LedgerIcon name="status-offline" size={32} />目前離線；已確認資料維持不變。已開啟的支出表單會保存未提交草稿，重新連線後仍需手動檢視與送出。</p>}
features/pooled-funds/pooled-workspace.tsx:160 [CJK] {error && <div role="alert" className="pooled-alert"><p>{error}</p><PixelButton type="button" emphasis="secondary" disabled={busy || !online} onClick={() => void refresh()}>重新讀取</PixelButton></div>}
features/pooled-funds/pooled-workspace.tsx:163 [CJK] <PixelPanel className="pooled-balance-card pooled-balance-card--book"><p id="pooled-balance-title">帳面餘額</p><strong data-testid="pooled-book">{money(workspace.summary.book_balance_minor)}</strong><span>只含已確認的金流</span></PixelPanel>
features/pooled-funds/pooled-workspace.tsx:164 [CJK] <PixelPanel className="pooled-balance-card"><p>待付代墊</p><strong data-testid="pooled-pending">{money(workspace.summary.pending_reimbursement_minor)}</strong><span>尚未由管理者送出</span></PixelPanel>
features/pooled-funds/pooled-workspace.tsx:165 [CJK] <PixelPanel className="pooled-balance-card"><p>已送出待收款</p><strong data-testid="pooled-sent-awaiting">{money(workspace.summary.sent_awaiting_receipt_minor)}</strong><span>已扣帳面餘額，不再保留</span></PixelPanel>
features/pooled-funds/pooled-workspace.tsx:166 [CJK] <PixelPanel className="pooled-balance-card"><p>可用餘額</p><strong data-testid="pooled-available">{money(workspace.summary.available_balance_minor)}</strong><span>帳面餘額扣除待付代墊</span></PixelPanel>
features/pooled-funds/pooled-workspace.tsx:168 [CJK] {workspace.summary.shortfall_minor !== '0' && <div role="alert" className="pooled-shortfall"><strong className="ledger-with-icon"><LedgerIcon name="event-shortfall" size={32} />資金缺口 {money(workspace.summary.shortfall_minor)}</strong><span>真實支出已保留。請補一筆投入或調整未來排程。</span></div>}
features/pooled-funds/pooled-workspace.tsx:171 [CJK] <div className="pooled-section-heading"><div><p>CONTRIBUTION TRAIL</p><h2 id="pooled-contributions-title">投入排程與實際投入</h2></div>
features/pooled-funds/pooled-workspace.tsx:172 [CJK] {active && manager && <PixelButton type="button" emphasis="secondary" disabled={!online || busy} onClick={() => { setEditingCommitment(undefined); setDialog('commitment'); }}>建立投入排程</PixelButton>}
features/pooled-funds/pooled-workspace.tsx:174 [CJK] {!workspace.commitments.length ? <p>還沒有排程。管理者可建立規則；只有參與者本人能確認自己的實際投入。</p> : <ul className="notebook-list">
features/pooled-funds/pooled-workspace.tsx:177 [CJK] <span className="notebook-secondary">{commitment.cadence === 'MONTHLY' ? '每月' : '每週'} · 每 {commitment.interval} 期</span></div>
features/pooled-funds/pooled-workspace.tsx:178 [CJK] {active && manager && commitment.status === 'ACTIVE' && <PixelButton type="button" emphasis="ghost" onClick={() => { setEditingCommitment(commitment); setDialog('commitment'); }}>編輯投入金額</PixelButton>}
features/pooled-funds/pooled-workspace.tsx:182 [CJK] <div><time>投入 · {item.due_on}</time><p><strong>{nameFor(item.participant_user_id)}</strong></p>
features/pooled-funds/pooled-workspace.tsx:187 [CJK] {item.participant_user_id === currentUserId && <><PixelButton type="button" disabled={busy || !online} onClick={() => void occurrenceAction(item.id, 'confirm', item.version)}>確認已投入</PixelButton>
features/pooled-funds/pooled-workspace.tsx:188 [CJK] <PixelButton type="button" emphasis="secondary" disabled={busy || !online} onClick={() => void occurrenceAction(item.id, 'skip', item.version)}>略過這次</PixelButton></>}
features/pooled-funds/pooled-workspace.tsx:189 [CJK] {manager && <PixelButton type="button" emphasis="ghost" disabled={busy || !online} onClick={() => void occurrenceAction(item.id, 'cancel', item.version)}>取消這次</PixelButton>}
features/pooled-funds/pooled-workspace.tsx:198 [CJK] <div className="pooled-section-heading"><div><p>FUND SPENDING</p><h2 id="pooled-expenses-title">基金支出與代墊</h2></div>
features/pooled-funds/pooled-workspace.tsx:199 [CJK] {active && <PixelButton type="button" disabled={!online || busy} onClick={() => setDialog('expense')}>新增基金支出</PixelButton>}
features/pooled-funds/pooled-workspace.tsx:201 [CJK] {!workspace.expenses.length ? <p>還沒有基金支出。</p> : <ul className="notebook-list">{workspace.expenses.map((expense) => {
features/pooled-funds/pooled-workspace.tsx:206 [CJK] <time>{fundPaid ? '基金支出' : '代墊'} · {expense.record.occurred_on}</time>
features/pooled-funds/pooled-workspace.tsx:208 [CJK] <p>{fundPaid ? '基金直接支付' : `${nameFor(expense.advanced_by_user_id!)}先代墊`}</p>
features/pooled-funds/pooled-workspace.tsx:215 [CJK] {expense.reimbursement?.status === 'AWAITING_PAYMENT' && manager && <PixelButton type="button" disabled={busy || !online} onClick={() => void reimbursementAction(expense, false)}>確認送出代墊款</PixelButton>}
features/pooled-funds/pooled-workspace.tsx:216 [CJK] {expense.reimbursement?.status === 'SENT' && expense.reimbursement.participant_user_id === currentUserId && <PixelButton type="button" disabled={busy || !online} onClick={() => void reimbursementAction(expense, true)}>確認收到代墊款</PixelButton>}
features/pooled-funds/pooled-workspace.tsx:222 [CJK] <PixelPanel><div className="pooled-section-heading"><div><p>PARTICIPANTS</p><h2>寶箱參與者</h2></div></div>
features/pooled-funds/pooled-workspace.tsx:223 [CJK] <ul className="pooled-participants">{data.participants.filter((person) => person.effective_to === null).map((person) => <li key={person.id}><span>{person.display_name} · {person.role === 'MANAGER' ? '管理者' : '參與者'}</span>
features/pooled-funds/pooled-workspace.tsx:224 [CJK] {manager && person.user_id !== currentUserId && <PixelButton type="button" emphasis="ghost" disabled={busy || !online} onClick={() => void participantMutation(`/api/app/spaces/${space.id}/participants/${person.id}/end`, { version: space.version }, `已結束 ${person.display_name} 的參與。`)}>結束參與</PixelButton>}</li>)}</ul>
features/pooled-funds/pooled-workspace.tsx:225 [CJK] {active && manager && candidates.length > 0 && <div className="pooled-add"><label className="pixel-field">加入參與者<select aria-label="加入參與者" className="pixel-field__input" value={selectedParticipant} onChange={(event) => setSelectedParticipant(event.target.value)}>
features/pooled-funds/pooled-workspace.tsx:226 [CJK] <option value="">選擇群組成員</option>{candidates.map((member) => <option value={member.user_id} key={member.user_id}>{member.display_name} · {member.mimic_id}</option>)}</select></label>
features/pooled-funds/pooled-workspace.tsx:227 [CJK] <PixelButton type="button" disabled={!selectedParticipant || busy || !online} onClick={() => void participantMutation(`/api/app/spaces/${space.id}/participants`, { user_id: selectedParticipant, version: space.version }, '已加入寶箱參與者。')}>加入寶箱</PixelButton></div>}
features/pooled-funds/pooled-workspace.tsx:228 [CJK] {current && <PixelButton type="button" emphasis="secondary" disabled={busy || !online} onClick={() => void leave()}>離開這個寶箱</PixelButton>}
features/pooled-funds/pooled-workspace.tsx:231 [CJK] <PixelPanel className="pooled-closing"><div className="pooled-section-heading"><div><p>CLOSE THE VAULT</p><h2>{active ? '準備結清' : closing ? '基金退回' : '已封存'}</h2></div></div>
features/pooled-funds/pooled-workspace.tsx:233 [CJK] `closing:${space.version}`, pooledLifecycleMutationSchema.parse, '寶箱已進入結清；不再接受新金流。')}>開始結清</PixelButton>}
features/pooled-funds/pooled-workspace.tsx:234 [CJK] {closing && !workspace.return_plan && workspace.summary.book_balance_minor !== '0' && manager && <PixelButton type="button" onClick={() => setDialog('returns')}>指定基金退回</PixelButton>}
features/pooled-funds/pooled-workspace.tsx:236 [CJK] {item.status === 'AWAITING_PAYMENT' && manager && <PixelButton type="button" disabled={busy || !online} onClick={() => void returnAction(item.id, item.version, false)}>確認送出退回款</PixelButton>}
features/pooled-funds/pooled-workspace.tsx:237 [CJK] {item.status === 'SENT' && item.recipient_user_id === currentUserId && <PixelButton type="button" disabled={busy || !online} onClick={() => void returnAction(item.id, item.version, true)}>確認收到退回款</PixelButton>}</li>)}</ul>}
features/pooled-funds/pooled-workspace.tsx:239 [CJK] `archive:${space.version}`, pooledLifecycleMutationSchema.parse, '共同基金已封存。')}>封存共同基金</PixelButton>}
features/pooled-funds/pooled-workspace.tsx:242 [CJK] <PixelDialog open={dialog === 'commitment'} title={editingCommitment ? '編輯投入金額' : '建立投入排程'} closeLabel="關閉" closeDisabled={busy} onClose={() => setDialog(null)}>
features/pooled-funds/pooled-workspace.tsx:249 [CJK] pooledCommitmentSchema.parse(response.data); attempts.current.delete(fingerprint); await refresh(); setDialog(null); setNotice('投入排程已儲存。'); }
features/pooled-funds/pooled-workspace.tsx:259 [CJK] <PixelDialog open={dialog === 'expense'} title="新增基金支出" closeLabel="關閉" closeDisabled={busy} onClose={closeExpense}>
features/pooled-funds/pooled-workspace.tsx:264 [CJK] pooledExpenseMutationSchema.parse, '基金支出已記錄。', durableRequestId);
features/pooled-funds/pooled-workspace.tsx:272 [CJK] <PixelDialog open={dialog === 'returns'} title="指定基金退回" description="逐一指定收款人與金額；系統不會自動平分。" closeLabel="關閉" closeDisabled={busy} onClose={() => setDialog(null)}>
features/pooled-funds/pooled-workspace.tsx:275 [CJK] pooledReturnPlanSchema.parse, '基金退回計畫已建立。'); if (ok) setDialog(null); }} />}
features/pooled-funds/pooled-workspace.tsx:305 [CJK] } catch { setError('請輸入有效排程與正數金額。'); }
features/pooled-funds/pooled-workspace.tsx:308 [CJK] {!commitment && <><PixelField label="排程名稱" value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} />
features/pooled-funds/pooled-workspace.tsx:309 [CJK] <label className="pixel-field">頻率<select aria-label="頻率" className="pixel-field__input" value={cadence} onChange={(event) => setCadence(event.target.value as typeof cadence)}><option value="MONTHLY">每月</option><option value="WEEKLY">每週</option></select></label>
features/pooled-funds/pooled-workspace.tsx:310 [CJK] <PixelField label="每幾期" type="number" min="1" max="52" value={interval} onChange={(event) => setInterval(event.target.value)} required />
features/pooled-funds/pooled-workspace.tsx:311 [CJK] <PixelField label="開始日期" type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} required />
features/pooled-funds/pooled-workspace.tsx:312 [CJK] <PixelField label="結束日期" type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} />
features/pooled-funds/pooled-workspace.tsx:313 [CJK] <PixelField label="產生到" type="date" value={generateThrough} onChange={(event) => setGenerateThrough(event.target.value)} required /></>}
features/pooled-funds/pooled-workspace.tsx:314 [CJK] <PixelField label="預設投入金額" inputMode="decimal" value={defaultAmount} onChange={(event) => setDefaultAmount(event.target.value)} required />
features/pooled-funds/pooled-workspace.tsx:315 [CJK] <fieldset><legend>指定金額（留白使用預設）</legend>{participants.filter((person) => person.effective_to === null).map((person) => <PixelField key={person.user_id}
features/pooled-funds/pooled-workspace.tsx:316 [CJK] label={`${person.display_name}的指定金額`} inputMode="decimal" value={overrides[person.user_id] ?? ''} onChange={(event) => setOverrides((current) => ({ ...current, [person.user_id]: event.target.value }))} />)}</fieldset>
features/pooled-funds/pooled-workspace.tsx:317 [CJK] {error && <p role="alert">{error}</p>}<PixelButton disabled={busy}>{busy ? '儲存中…' : '儲存投入排程'}</PixelButton>
features/pooled-funds/pooled-workspace.tsx:329 [CJK] catch { setError('請明確指定至少一位收款人與正數金額。'); }
features/pooled-funds/pooled-workspace.tsx:331 [CJK] return <form className="pooled-form" onSubmit={submit}><p className="pooled-return-total">待指定：{formatMinorUnit(total, currency, 'zh-TW')}</p>
features/pooled-funds/pooled-workspace.tsx:332 [CJK] {participants.filter((person) => person.effective_to === null).map((person) => <PixelField key={person.user_id} label={`${person.display_name}的退回金額`}
features/pooled-funds/pooled-workspace.tsx:334 [CJK] {error && <p role="alert">{error}</p>}<PixelButton disabled={busy}>建立退回計畫</PixelButton></form>;
features/pooled-funds/pooled-workspace.tsx:343 [CJK] function timingLabel(value: 'UPCOMING' | 'DUE' | 'OVERDUE' | null) { return value === 'UPCOMING' ? '即將到期' : value === 'DUE' ? '今天到期' : '已逾期'; }
features/pooled-funds/pooled-workspace.tsx:344 [CJK] function occurrenceLabel(value: string) { return value === 'CONFIRMED' ? '已確認投入' : value === 'SKIPPED' ? '已略過' : '已取消'; }
features/pooled-funds/pooled-workspace.tsx:345 [CJK] function workflowLabel(value: string) { return value === 'AWAITING_PAYMENT' ? '待付款' : value === 'SENT' ? '已送出，待收款確認' : '已完成'; }
features/pooled-funds/pooled-workspace.tsx:153 [English] POOLED FUND · 共同基金
features/pooled-funds/pooled-workspace.tsx:171 [English] CONTRIBUTION TRAIL
features/pooled-funds/pooled-workspace.tsx:198 [English] FUND SPENDING
features/pooled-funds/pooled-workspace.tsx:222 [English] PARTICIPANTS
features/pooled-funds/pooled-workspace.tsx:231 [English] CLOSE THE VAULT
features/quick-expense/quick-expense.tsx:18 [CJK] const modeLabel = { PERSONAL_EXPENSES: '個人記帳', SHARED_EXPENSES: '共同分帳', POOLED_FUND: '共同基金' } as const;
features/quick-expense/quick-expense.tsx:31 [CJK] if (!eligible.length) return <Link className="quick-expense quick-expense--empty" href={cards.some((card) => card.mode !== 'PERSONAL_EXPENSES') ? '/app/groups' : '/app/personal'}>先建立可記帳的寶箱</Link>;
features/quick-expense/quick-expense.tsx:34 [CJK] onClick={() => rememberRecent(eligible[0].id)}>記一筆支出</Link>
features/quick-expense/quick-expense.tsx:35 [CJK] : <span aria-disabled="true" className="quick-expense">記一筆支出</span>;
features/quick-expense/quick-expense.tsx:37 [CJK] <PixelButton type="button" disabled={!online} onClick={() => setOpen(true)}>記一筆支出</PixelButton>
features/quick-expense/quick-expense.tsx:38 [CJK] <PixelDialog open={open} title="要記在哪個寶箱？" closeLabel="關閉快速記帳" onClose={() => setOpen(false)}>
features/quick-expense/quick-expense.tsx:39 [CJK] <p>已優先排列最近成功使用的寶箱。每種寶箱會開啟自己的記帳規則。</p>
features/shared-expenses/personal-reference-form.tsx:47 [CJK] setConflict(true); setError('這筆支出已加入或資料已變更。重新讀取共同分帳後再確認。');
features/shared-expenses/personal-reference-form.tsx:48 [CJK] } else setError('尚未確認加入。相同內容重試會沿用同一個請求識別，不會建立重複參照。');
features/shared-expenses/personal-reference-form.tsx:56 [CJK] catch { setError('重新讀取失敗，私人輸入仍保留。'); }
features/shared-expenses/personal-reference-form.tsx:61 [CJK] <p>沒有可用的同幣別個人寶箱。先建立個人寶箱，再回來加入這筆分攤。</p>
features/shared-expenses/personal-reference-form.tsx:62 [CJK] <a className="pixel-link" href="/app/personal">建立個人寶箱</a>
features/shared-expenses/personal-reference-form.tsx:66 [CJK] <p className="personal-reference-ticket">只連結你的分攤，不會複製共同交易。</p>
features/shared-expenses/personal-reference-form.tsx:67 [CJK] {sourceLocked && <p className="personal-reference-lock">來源期間已永久鎖定；這筆參照會保留已鎖定的共同內容。</p>}
features/shared-expenses/personal-reference-form.tsx:68 [CJK] <label className="pixel-field"><span className="pixel-field__label">加入到</span>
features/shared-expenses/personal-reference-form.tsx:69 [CJK] <select className="pixel-field__input" aria-label="加入到" value={spaceId} onChange={event => { setSpaceId(event.target.value); setConflict(false); }} disabled={busy}>
features/shared-expenses/personal-reference-form.tsx:72 [CJK] {availableTags.length > 0 && <fieldset className="personal-reference-tags"><legend>私人標籤</legend>
features/shared-expenses/personal-reference-form.tsx:76 [CJK] <PixelField label="私人備註" value={note} onChange={event => { setNote(event.target.value); setConflict(false); }} maxLength={2000}
features/shared-expenses/personal-reference-form.tsx:77 [CJK] description="只有你能在個人帳本看到。" disabled={busy} />
features/shared-expenses/personal-reference-form.tsx:78 [CJK] {!online && <p role="status">目前離線，尚未加入。私人輸入只暫留在這個表單。</p>}
features/shared-expenses/personal-reference-form.tsx:80 [CJK] {conflict && onReload && <PixelButton type="button" emphasis="secondary" onClick={() => void reload()} disabled={busy || !online}>重新讀取共同分帳</PixelButton>}
features/shared-expenses/personal-reference-form.tsx:81 [CJK] <PixelButton disabled={busy || !online || conflict}>{busy ? '確認中…' : '加入我的帳本'}</PixelButton>
features/shared-expenses/shared-expense-form.tsx:76 [CJK] setError('參與權限已變更，這份草稿不能直接恢復。請丟棄草稿後依目前參與者重新輸入。');
features/shared-expenses/shared-expense-form.tsx:99 [CJK] if (!savedDraft) { setError('這個裝置目前無法保存草稿，尚未送出。請保留此頁並稍後再試。'); return; }
features/shared-expenses/shared-expense-form.tsx:111 [CJK] ? '進行中的結算批次暫時鎖定這個期間。付款前可由管理者取消；否則請完成批次。'
features/shared-expenses/shared-expense-form.tsx:112 [CJK] : '這個期間已永久鎖定，原紀錄不能再改寫。請在下一個開放期間建立更正。');
features/shared-expenses/shared-expense-form.tsx:114 [CJK] setConflict(true); setError('資料版本已變更。請重新讀取最新內容；目前輸入仍保留。');
features/shared-expenses/shared-expense-form.tsx:117 [CJK] setError('付款金額與分攤金額都必須分別等於總金額。');
features/shared-expenses/shared-expense-form.tsx:119 [CJK] setError('目前的帳號、群組或寶箱權限已變更。草稿仍保留，請重新開啟寶箱確認。');
features/shared-expenses/shared-expense-form.tsx:121 [CJK] setError('伺服器未接受這份草稿。請檢查日期、金額、參與者與分類後再手動重試。');
features/shared-expenses/shared-expense-form.tsx:122 [CJK] } else setError('尚未確認入帳。草稿已保存在這個裝置；相同內容重試不會重複記帳。');
features/shared-expenses/shared-expense-form.tsx:129 [CJK] catch { setError('重新讀取失敗，輸入仍保留。'); }
features/shared-expenses/shared-expense-form.tsx:134 [CJK] <PixelField label="支出名稱" value={title} onChange={event => change(setTitle, event.target.value)} required maxLength={200} disabled={busy || recoveryPending} />
features/shared-expenses/shared-expense-form.tsx:135 [CJK] <PixelField label={`總金額（${currency}）`} inputMode="decimal" value={amount} onChange={event => change(setAmount, event.target.value)} required disabled={busy || recoveryPending} />
features/shared-expenses/shared-expense-form.tsx:136 [CJK] <PixelField label="支出日期" type="date" value={date} max={today(timezone)} onChange={event => change(setDate, event.target.value)} required disabled={busy || recoveryPending} />
features/shared-expenses/shared-expense-form.tsx:137 [CJK] <fieldset><legend>誰先付款</legend>{eligible.map(person => <div className="shared-amount-row" key={person.user_id}>
features/shared-expenses/shared-expense-form.tsx:138 [CJK] <label><input disabled={busy || recoveryPending} type="checkbox" aria-label={`付款人－${person.display_name}`} checked={payerIds.includes(person.user_id)} onChange={() => toggle(person.user_id, payerIds, setPayerIds)} />{person.display_name}</label>
features/shared-expenses/shared-expense-form.tsx:139 [CJK] {payerIds.includes(person.user_id) && <PixelField label={`付款金額－${person.display_name}`} inputMode="decimal" value={payerValues[person.user_id] ?? ''}
features/shared-expenses/shared-expense-form.tsx:142 [CJK] <fieldset><legend>如何分攤</legend><label className="pixel-field">分攤方式<select disabled={busy || recoveryPending} aria-label="分攤方式" className="pixel-field__input" value={allocationMode} onChange={event => change(setAllocationMode, event.target.value as 'EQUAL' | 'FIXED')}>
features/shared-expenses/shared-expense-form.tsx:143 [CJK] <option value="EQUAL">平均分攤</option><option value="FIXED">指定金額</option></select></label>
features/shared-expenses/shared-expense-form.tsx:145 [CJK] <label><input disabled={busy || recoveryPending} type="checkbox" aria-label={`分攤人－${person.display_name}`} checked={allocationIds.includes(person.user_id)} onChange={() => toggle(person.user_id, allocationIds, setAllocationIds)} />{person.display_name}</label>
features/shared-expenses/shared-expense-form.tsx:146 [CJK] {allocationMode === 'FIXED' && allocationIds.includes(person.user_id) && <PixelField label={`分攤金額－${person.display_name}`} inputMode="decimal" value={allocationValues[person.user_id] ?? ''}
features/shared-expenses/shared-expense-form.tsx:151 [CJK] <PixelField label="共同備註" value={note} onChange={event => change(setNote, event.target.value)} maxLength={2000} disabled={busy || recoveryPending} />
features/shared-expenses/shared-expense-form.tsx:152 [CJK] {!online && <p role="status">目前離線，尚未入帳。草稿會保留在這個裝置；重新連線後仍需檢視並手動送出。</p>}
features/shared-expenses/shared-expense-form.tsx:153 [CJK] {draft.storageError && <p role="alert">這個裝置目前無法保存草稿。請不要關閉此頁。</p>}
features/shared-expenses/shared-expense-form.tsx:155 [CJK] {conflict && onReload && <PixelButton type="button" emphasis="secondary" onClick={() => void refreshVersion()} disabled={busy || !online}>重新讀取最新資料</PixelButton>}
features/shared-expenses/shared-expense-form.tsx:156 [CJK] {locked && lockKind !== 'PENDING' && record && onCorrection && <PixelButton type="button" emphasis="secondary" onClick={() => onCorrection(record)}>建立不可變更的更正</PixelButton>}
features/shared-expenses/shared-expense-form.tsx:157 [CJK] <PixelButton disabled={!online || busy || conflict || !writable || recoveryPending}>{busy ? '確認中…' : draft.reviewed ? '重新送出草稿' : record ? '儲存修改' : '確認記帳'}</PixelButton>
features/shared-expenses/shared-expense-list.tsx:12 [CJK] if (!expenses.length) return <p>還沒有共同支出。從第一筆付款與分攤開始。</p>;
features/shared-expenses/shared-expense-list.tsx:15 [CJK] <div><time>共同支出 · {expense.occurred_on}</time><h3>{expense.title}</h3>
features/shared-expenses/shared-expense-list.tsx:16 [CJK] <p>付款：{expense.payers.map(row => `${nameFor(row.user_id)} ${formatMinorUnit(row.amount_minor, currency, 'zh-TW')}`).join('、')}</p>
features/shared-expenses/shared-expense-list.tsx:17 [CJK] <p>分攤：{expense.allocations.map(row => `${nameFor(row.user_id)} ${formatMinorUnit(row.amount_minor, currency, 'zh-TW')}`).join('、')}</p>
features/shared-expenses/shared-expense-list.tsx:20 [CJK] && <PixelButton emphasis="secondary" aria-label={`加入我的帳本－${expense.title}`} onClick={() => onReference(expense)}>加入我的帳本</PixelButton>}
features/shared-expenses/shared-expense-list.tsx:22 [CJK] <PixelButton emphasis="ghost" aria-label={`編輯 ${expense.title}`} onClick={() => onEdit(expense)}>編輯</PixelButton>
features/shared-expenses/shared-expense-list.tsx:23 [CJK] <PixelButton emphasis="ghost" aria-label={`刪除 ${expense.title}`} onClick={() => onDelete(expense)}>刪除</PixelButton>
features/shared-expenses/shared-space-form.tsx:28 [CJK] setError('尚未確認寶箱是否建立。請先關閉並重新整理群組清單，再決定是否重試。');
features/shared-expenses/shared-space-form.tsx:32 [CJK] <p>只有寶箱參與者能讀取分帳金額與紀錄。建立者會成為第一位管理者。</p>
features/shared-expenses/shared-space-form.tsx:33 [CJK] <PixelField label="寶箱名稱" required maxLength={100} value={name} onChange={event => setName(event.target.value)} disabled={busy} />
features/shared-expenses/shared-space-form.tsx:34 [CJK] <label className="pixel-field">幣別<select aria-label="幣別" className="pixel-field__input" value={currency} onChange={event => setCurrency(event.target.value)} disabled={busy}>
features/shared-expenses/shared-space-form.tsx:37 [CJK] {!online && <p role="status">目前離線，尚未建立寶箱。</p>}
features/shared-expenses/shared-space-form.tsx:39 [CJK] <PixelButton disabled={!online || busy}>{busy ? '建立中…' : '建立共同分帳'}</PixelButton>
features/shared-expenses/shared-space-list.tsx:17 [CJK] <div className="shared-section-heading"><div><p>共同寶箱</p><h2>共同分帳</h2></div>
features/shared-expenses/shared-space-list.tsx:18 [CJK] <PixelButton onClick={() => setCreating(true)}>建立共同分帳寶箱</PixelButton></div>
features/shared-expenses/shared-space-list.tsx:19 [CJK] {!spaces.length ? <p>還沒有共同分帳寶箱。建立後，再邀請群組成員參與。</p> : <ul className="shared-space-list">
features/shared-expenses/shared-space-list.tsx:22 [CJK] <strong>{space.name}</strong><span>{space.currency} · {space.role === 'MANAGER' ? '管理者' : '參與者'}{space.status === 'ARCHIVED' ? ' · 已封存' : ''}</span>
features/shared-expenses/shared-space-list.tsx:23 [CJK] </Link> : <div><strong>{space.name}</strong><span>共同分帳 · {space.status === 'ARCHIVED' ? '已封存' : '使用中'} · 僅群組治理資訊</span></div>}
features/shared-expenses/shared-space-list.tsx:26 [CJK] <PixelDialog open={creating} title="建立共同分帳寶箱" closeLabel="關閉" onClose={() => setCreating(false)}>
features/shared-expenses/shared-workspace.tsx:53 [CJK] const nameFor = (id: string) => data.participants.find(person => person.user_id === id)?.display_name ?? '已離開的參與者';
features/shared-expenses/shared-workspace.tsx:82 [CJK] try { await refresh(); setNotice('已重新讀取共同分帳。'); }
features/shared-expenses/shared-workspace.tsx:83 [CJK] catch { setError('讀取失敗，目前仍顯示先前已確認的資料，沒有改成零。'); }
features/shared-expenses/shared-workspace.tsx:96 [CJK] setNotice(`已刪除「${editing.title}」，共同位置將重新計算。`); await refresh();
features/shared-expenses/shared-workspace.tsx:97 [CJK] } catch { setError('刪除尚未確認。期間可能已鎖定或資料版本已變更；請重新讀取。'); }
features/shared-expenses/shared-workspace.tsx:108 [CJK] await refresh(); setNotice('共同支出已有變更，已重新載入第一頁。');
features/shared-expenses/shared-workspace.tsx:110 [CJK] } catch { setError('無法載入更多共同支出，目前清單保持不變。'); }
features/shared-expenses/shared-workspace.tsx:114 [CJK] <header className="shared-hero"><div><p className="shared-eyebrow ledger-with-icon"><LedgerIcon name="mode-shared" />SHARED EXPENSES · 共同分帳</p><h1>{space.name}</h1><p>{group.name} · {space.currency} · {manager ? '寶箱管理者' : '參與者'}</p>
features/shared-expenses/shared-workspace.tsx:115 [CJK] {!active && <p className="shared-archive-state">已封存 · 唯讀</p>}</div></header>
features/shared-expenses/shared-workspace.tsx:119 [CJK] {error && <div role="alert"><p>{error}</p><PixelButton emphasis="secondary" onClick={() => void reload()} disabled={busy || !online}>重新讀取</PixelButton></div>}
features/shared-expenses/shared-workspace.tsx:120 [CJK] <section className="shared-summary" aria-labelledby="shared-summary-title"><PixelPanel><p>共同支出總額</p><strong data-testid="shared-spending">{money(data.summary.spending_minor)}</strong><p>這不是帳戶餘額。</p></PixelPanel>
features/shared-expenses/shared-workspace.tsx:121 [CJK] <PixelPanel><h2 id="shared-summary-title">目前位置</h2><ul>{data.summary.positions.map(position => {
features/shared-expenses/shared-workspace.tsx:122 [CJK] const value = parseMinorUnit(position.amount_minor); const state = value > BigInt(0) ? '應收' : value < BigInt(0) ? '應付' : '已結清';
features/shared-expenses/shared-workspace.tsx:127 [CJK] manager={active && manager} batches={data.batches.items} nameFor={nameFor} onChanged={async () => { await refresh(); setNotice('結算狀態已更新。'); }} />
features/shared-expenses/shared-workspace.tsx:128 [CJK] <PixelNotebook titleId="shared-expenses-title"><div className="shared-section-heading"><h2 id="shared-expenses-title">共同支出</h2>
features/shared-expenses/shared-workspace.tsx:129 [CJK] {active && <PixelButton onClick={() => { setEditing(undefined); setDialog('expense'); }}>新增共同支出</PixelButton>}
features/shared-expenses/shared-workspace.tsx:135 [CJK] {data.expenses.next_cursor && <PixelButton emphasis="secondary" disabled={busy || !online} onClick={() => void moreExpenses()}>載入更多共同支出</PixelButton>}
features/shared-expenses/shared-workspace.tsx:137 [CJK] <PixelDialog open={dialog === 'expense'} title={editing ? '編輯共同支出' : '新增共同支出'} closeLabel="關閉" onClose={closeExpense} closeDisabled={busy}>
features/shared-expenses/shared-workspace.tsx:144 [CJK] setNotice(`已確認「${record.title}」${money(record.amount_minor)}。`);
features/shared-expenses/shared-workspace.tsx:146 [CJK] try { await refresh(); } catch { setError('已確認儲存，但摘要更新失敗；請重新讀取。'); }
features/shared-expenses/shared-workspace.tsx:150 [CJK] <PixelDialog open={dialog === 'reference'} title="加入我的帳本" closeLabel="關閉" closeDisabled={busy} onClose={() => setDialog(null)}>
features/shared-expenses/shared-workspace.tsx:154 [CJK] setDialog(null); setEditing(undefined); setNotice(`已把你的分攤加入「${destination?.name ?? '個人寶箱'}」。`); }}
features/shared-expenses/shared-workspace.tsx:157 [CJK] <PixelDialog open={dialog === 'delete'} title="刪除此筆共同支出？" closeLabel="關閉" closeDisabled={busy} onClose={() => setDialog(null)}>
features/shared-expenses/shared-workspace.tsx:158 [CJK] <p>「{editing?.title}」將從位置計算移除，稽核紀錄仍保留。已鎖定期間不能刪除。</p>
features/shared-expenses/shared-workspace.tsx:160 [CJK] <PixelButton emphasis="danger" disabled={busy || !online} onClick={() => void remove()}>確認刪除</PixelButton>
features/shared-expenses/shared-workspace.tsx:161 [CJK] <PixelButton emphasis="secondary" disabled={busy || !online} onClick={() => void reload()}>重新讀取最新資料</PixelButton>
features/shared-expenses/shared-workspace.tsx:163 [CJK] <PixelDialog open={dialog === 'correction'} title="建立不可變更的更正" closeLabel="關閉" closeDisabled={busy} onClose={() => setDialog(null)}>
features/shared-expenses/shared-workspace.tsx:167 [CJK] onSaved={async () => { setDialog(null); setEditing(undefined); await refresh(); setNotice('已在開放期間建立更正，原始紀錄保持不變。'); }}
features/shared-expenses/shared-workspace.tsx:171 [CJK] onChanged={async () => { try { await refresh(); setNotice('寶箱參與者或狀態已更新。'); }
features/shared-expenses/shared-workspace.tsx:114 [English] SHARED EXPENSES · 共同分帳
features/shared-settlements/correction-form.tsx:37 [CJK] const nameFor = (id: string) => participants.find(person => person.user_id === id)?.display_name ?? '已離開的參與者';
features/shared-settlements/correction-form.tsx:58 [CJK] setConflict(true); setError('來源已有新的更正。請重新讀取版本並比較；你的目標與原因仍保留。');
features/shared-settlements/correction-form.tsx:60 [CJK] setError('更正日期必須位於最新完成批次之後的開放期間。');
features/shared-settlements/correction-form.tsx:62 [CJK] setError('更正後的付款與分攤都必須分別等於更正後總額。');
features/shared-settlements/correction-form.tsx:63 [CJK] } else setError('更正尚未確認。相同內容重試不會建立重複更正。');
features/shared-settlements/correction-form.tsx:70 [CJK] catch { setError('重新讀取失敗，更正內容仍保留。'); }
features/shared-settlements/correction-form.tsx:74 [CJK] <p>原始紀錄「{sourceExpense.title}」保持不變；這會在新期間新增一筆有來源連結的更正。</p>
features/shared-settlements/correction-form.tsx:75 [CJK] <PixelField label="更正日期" type="date" value={date} max={today(timezone)} onChange={event => setDate(event.target.value)} required disabled={busy} />
features/shared-settlements/correction-form.tsx:76 [CJK] <PixelField label="更正原因" value={reason} onChange={event => setReason(event.target.value)} required maxLength={2000} disabled={busy} />
features/shared-settlements/correction-form.tsx:77 [CJK] <label><input type="checkbox" checked={voided} onChange={event => setVoided(event.target.checked)} disabled={busy} />將這筆支出更正為作廢</label>
features/shared-settlements/correction-form.tsx:78 [CJK] {!voided && <><PixelField label={`更正後總金額（${currency}）`} inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} required />
features/shared-settlements/correction-form.tsx:79 [CJK] <fieldset><legend>更正後付款</legend>{sourceExpense.payers.map(row => <PixelField key={row.user_id} label={`更正後付款－${nameFor(row.user_id)}`} inputMode="decimal"
features/shared-settlements/correction-form.tsx:81 [CJK] <fieldset><legend>更正後分攤</legend>{sourceExpense.allocations.map(row => <PixelField key={row.user_id} label={`更正後分攤－${nameFor(row.user_id)}`} inputMode="decimal"
features/shared-settlements/correction-form.tsx:83 [CJK] {!online && <p role="status">目前離線，不能建立高影響更正。</p>}{error && <p role="alert">{error}</p>}
features/shared-settlements/correction-form.tsx:84 [CJK] {conflict && onReload && <PixelButton type="button" emphasis="secondary" onClick={() => void reload()} disabled={busy || !online}>重新讀取來源版本</PixelButton>}
features/shared-settlements/correction-form.tsx:85 [CJK] <PixelButton disabled={busy || !online || conflict}>{busy ? '建立中…' : '確認建立更正'}</PixelButton>
features/shared-settlements/settlement-panel.tsx:13 [CJK] PENDING: '進行中',
features/shared-settlements/settlement-panel.tsx:14 [CJK] COMPLETED: '已完成',
features/shared-settlements/settlement-panel.tsx:15 [CJK] CANCELED: '已取消',
features/shared-settlements/settlement-panel.tsx:18 [CJK] AWAITING_PAYMENT: '待付款',
features/shared-settlements/settlement-panel.tsx:19 [CJK] SENT: '已付款，待收款',
features/shared-settlements/settlement-panel.tsx:20 [CJK] COMPLETED: '已收款',
features/shared-settlements/settlement-panel.tsx:44 [CJK] if (!(failure instanceof AppClientError)) return '尚未確認操作結果。相同操作重試不會重複過帳。';
features/shared-settlements/settlement-panel.tsx:46 [CJK] SHARED_BATCH_PENDING: '已有結算批次進行中，請先完成或在付款前取消。',
features/shared-settlements/settlement-panel.tsx:47 [CJK] SHARED_PERIOD_INVALID: '結算截止日必須接續上一期，且不能晚於今天。',
features/shared-settlements/settlement-panel.tsx:48 [CJK] SHARED_BATCH_CANNOT_CANCEL: '已有付款人確認付款，這個批次必須由所有收款人完成。',
features/shared-settlements/settlement-panel.tsx:49 [CJK] SHARED_BATCH_VERSION_CONFLICT: '批次已變更，請重新讀取後再操作。',
features/shared-settlements/settlement-panel.tsx:50 [CJK] SHARED_TRANSFER_VERSION_CONFLICT: '轉帳狀態已變更，請重新讀取後再操作。',
features/shared-settlements/settlement-panel.tsx:51 [CJK] SHARED_TRANSFER_STATE_CONFLICT: '轉帳順序不符：付款人確認後，才能由收款人確認。',
features/shared-settlements/settlement-panel.tsx:52 [CJK] SHARED_TRANSFER_ACTOR_REQUIRED: '只有這筆轉帳指定的付款人或收款人能確認。',
features/shared-settlements/settlement-panel.tsx:54 [CJK] return messages[failure.code] ?? '操作未完成，請重新讀取最新批次後再試。';
features/shared-settlements/settlement-panel.tsx:77 [CJK] return <PixelPanel className="shared-settlements"><div className="shared-section-heading"><div><p>SETTLEMENT TRAIL</p><h2>結算批次</h2></div>
features/shared-settlements/settlement-panel.tsx:78 [CJK] {manager && <PixelButton disabled={!online || busy} onClick={() => setStarting(true)}>開始結算批次</PixelButton>}</div>
features/shared-settlements/settlement-panel.tsx:79 [CJK] <p>這些狀態由使用者自行確認，不代表銀行或 Mimic 已驗證實際轉帳。</p>
features/shared-settlements/settlement-panel.tsx:81 [CJK] {!batches.length ? <p>還沒有結算批次。位置確認後，由管理者選擇截止日。</p> : <ol className="settlement-trail">{batches.map(batch => <li key={batch.id}>
features/shared-settlements/settlement-panel.tsx:86 [CJK] {transfer.status === 'AWAITING_PAYMENT' && transfer.from_user_id === currentUserId && <PixelButton disabled={!online || busy} onClick={() => void confirm(batch, transfer, false)}>確認已付款</PixelButton>}
features/shared-settlements/settlement-panel.tsx:87 [CJK] {transfer.status === 'SENT' && transfer.to_user_id === currentUserId && <PixelButton disabled={!online || busy} onClick={() => void confirm(batch, transfer, true)}>確認已收款</PixelButton>}
features/shared-settlements/settlement-panel.tsx:88 [CJK] </li>)}</ul> : <p>本期位置已平衡，批次已直接完成。</p>}
features/shared-settlements/settlement-panel.tsx:90 [CJK] <PixelButton emphasis="secondary" disabled={!online || busy} onClick={() => void mutate(`/api/app/spaces/${spaceId}/shared-settlements/${batch.id}/cancel`, batch.version, 'cancel')}>取消批次</PixelButton>}
features/shared-settlements/settlement-panel.tsx:92 [CJK] <PixelDialog open={starting} title="開始結算批次" closeLabel="關閉" closeDisabled={busy} onClose={() => setStarting(false)}>
features/shared-settlements/settlement-panel.tsx:93 [CJK] <form onSubmit={start} className="shared-form"><p>截止日由 backend 推導連續期間並快照支出、位置與更正。</p>
features/shared-settlements/settlement-panel.tsx:94 [CJK] <PixelField label="結算截止日" type="date" value={periodEnd} onChange={event => setPeriodEnd(event.target.value)} required disabled={busy} />
features/shared-settlements/settlement-panel.tsx:95 [CJK] {error && <p role="alert">{error}</p>}<PixelButton disabled={!online || busy}>{busy ? '建立中…' : '建立批次並鎖定期間'}</PixelButton>
features/shared-settlements/settlement-panel.tsx:77 [English] SETTLEMENT TRAIL
features/shared-settlements/settlement-panel.tsx:79 [English] 這些狀態由使用者自行確認，不代表銀行或 Mimic 已驗證實際轉帳。
features/shared-settlements/settlement-panel.tsx:93 [English] 截止日由 backend 推導連續期間並快照支出、位置與更正。
features/shared-settlements/shared-lifecycle-panel.tsx:30 [CJK] if (!(failure instanceof AppClientError)) return '操作結果尚未確認。請重新讀取後再試。';
features/shared-settlements/shared-lifecycle-panel.tsx:32 [CJK] SPACE_VERSION_CONFLICT: '寶箱參與者或狀態已變更。請重新讀取；你選擇的對象仍保留。',
features/shared-settlements/shared-lifecycle-panel.tsx:33 [CJK] SHARED_BATCH_PENDING: '仍有未完成的結算轉帳，請先完成批次。',
features/shared-settlements/shared-lifecycle-panel.tsx:34 [CJK] SHARED_UNSETTLED_POSITION: '仍有未結清位置，請先完成結算。',
features/shared-settlements/shared-lifecycle-panel.tsx:35 [CJK] SHARED_UNSETTLED_RECORDS: '最新期間仍有尚未納入完成批次的支出或更正。',
features/shared-settlements/shared-lifecycle-panel.tsx:36 [CJK] SPACE_MANAGER_REQUIRED: '寶箱必須保留至少一位有效管理者。',
features/shared-settlements/shared-lifecycle-panel.tsx:37 [CJK] SPACE_ARCHIVED: '寶箱已封存，不能再變更參與者。',
features/shared-settlements/shared-lifecycle-panel.tsx:39 [CJK] return messages[failure.code] ?? '目前不能完成此操作，請重新讀取並檢查結算狀態。';
features/shared-settlements/shared-lifecycle-panel.tsx:56 [CJK] return <PixelPanel className="shared-lifecycle"><div className="shared-section-heading"><div><p>PARTICIPANTS & CLOSURE</p><h2>參與者與封存</h2></div></div>
features/shared-settlements/shared-lifecycle-panel.tsx:59 [CJK] <span>{person.display_name} · {person.role === 'MANAGER' ? '管理者' : '參與者'}</span>
features/shared-settlements/shared-lifecycle-panel.tsx:61 [CJK] <PixelButton emphasis="ghost" aria-label={`${person.role === 'MANAGER' ? '改為參與者' : '設為管理者'}－${person.display_name}`} disabled={busy || !online}
features/shared-settlements/shared-lifecycle-panel.tsx:63 [CJK] {person.role === 'MANAGER' ? '改為參與者' : '設為管理者'}</PixelButton>
features/shared-settlements/shared-lifecycle-panel.tsx:64 [CJK] <PixelButton emphasis="ghost" aria-label={`結束參與－${person.display_name}`} disabled={busy || !online}
features/shared-settlements/shared-lifecycle-panel.tsx:65 [CJK] onClick={() => void mutate(`/api/app/spaces/${space.id}/participants/${person.id}/end`, { version: space.version })}>結束參與</PixelButton>
features/shared-settlements/shared-lifecycle-panel.tsx:68 [CJK] {active && manager && candidates.length > 0 && <div className="shared-add-participant"><label className="pixel-field">加入參與者<select aria-label="加入參與者" className="pixel-field__input" value={selected} onChange={event => setSelected(event.target.value)}>
features/shared-settlements/shared-lifecycle-panel.tsx:69 [CJK] <option value="">選擇群組成員</option>{candidates.map(member => <option key={member.user_id} value={member.user_id}>{member.display_name} · {member.mimic_id}</option>)}
features/shared-settlements/shared-lifecycle-panel.tsx:70 [CJK] </select></label><PixelButton disabled={!selected || busy || !online} onClick={() => void mutate(`/api/app/spaces/${space.id}/participants`, { user_id: selected, version: space.version })}>加入寶箱</PixelButton></div>}
features/shared-settlements/shared-lifecycle-panel.tsx:71 [CJK] {active && current && <PixelButton emphasis="secondary" disabled={busy || !online} onClick={() => void mutate(`/api/app/spaces/${space.id}/participants/${current.id}/end`, { version: space.version })}>離開這個寶箱</PixelButton>}
features/shared-settlements/shared-lifecycle-panel.tsx:72 [CJK] {active && manager && <PixelButton emphasis="danger" disabled={busy || !online} onClick={() => setArchiveOpen(true)}>封存共同分帳寶箱</PixelButton>}
features/shared-settlements/shared-lifecycle-panel.tsx:73 [CJK] <PixelDialog open={archiveOpen} title="封存共同分帳寶箱" closeLabel="關閉" closeDisabled={busy} onClose={() => { setArchiveOpen(false); setConfirmation(''); }}>
features/shared-settlements/shared-lifecycle-panel.tsx:74 [CJK] <p>只有所有批次完成、位置為零，且最後完成期間後沒有未結案支出或更正時才能封存。歷史稽核仍保留。</p>
features/shared-settlements/shared-lifecycle-panel.tsx:75 [CJK] <PixelField label="輸入寶箱名稱確認" value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={busy} autoComplete="off" />
features/shared-settlements/shared-lifecycle-panel.tsx:78 [CJK] onClick={() => void mutate(`/api/app/spaces/${space.id}/archive`, { version: space.version })}>確認封存</PixelButton>
features/shared-settlements/shared-lifecycle-panel.tsx:56 [English] PARTICIPANTS & CLOSURE
features/tasks/task-center.tsx:11 [CJK] POOLED_CONTRIBUTION: { title: '確認本次投入', detail: '完成你自己的基金投入確認。' },
features/tasks/task-center.tsx:12 [CJK] POOLED_REIMBURSEMENT_SEND: { title: '確認基金已送出代墊款', detail: '你是管理者，請在實際付款後確認。' },
features/tasks/task-center.tsx:13 [CJK] POOLED_REIMBURSEMENT_RECEIVE: { title: '確認收到代墊款', detail: '你是代墊者，請在款項入帳後確認。' },
features/tasks/task-center.tsx:14 [CJK] SHARED_TRANSFER_SEND: { title: '確認已送出結算款', detail: '你是付款方，請在實際轉帳後確認。' },
features/tasks/task-center.tsx:15 [CJK] SHARED_TRANSFER_RECEIVE: { title: '確認收到結算款', detail: '你是收款方，請在款項入帳後確認。' },
features/tasks/task-center.tsx:16 [CJK] POOLED_SHORTFALL: { title: '處理資金缺口', detail: '基金可用餘額不足，請檢查待投入與待付項目。' },
features/tasks/task-center.tsx:20 [CJK] if (task.urgency === 'OVERDUE') return task.due_on ? `已逾期 · ${task.due_on}` : '已逾期';
features/tasks/task-center.tsx:21 [CJK] if (task.urgency === 'ATTENTION') return '需要注意';
features/tasks/task-center.tsx:22 [CJK] return task.due_on ? `待處理 · ${task.due_on}` : '待處理';
features/tasks/task-center.tsx:28 [CJK] <header className="task-center__hero"><div><p>QUEST BOARD</p><h1>任務中心</h1><p>只列出現在由你確認、付款、收款或處理的事項。</p></div><strong>{data.count}</strong></header>
features/tasks/task-center.tsx:29 [CJK] {!online && <p className="task-center__state" role="status">目前離線，顯示最後載入的任務；請恢復連線後再執行確認。</p>}
features/tasks/task-center.tsx:30 [CJK] {!data.items.length ? <PixelPanel><h2>目前沒有待辦</h2><p>寶箱都整理好了。之後若有需要你處理的事項，會出現在這裡。</p></PixelPanel>
features/tasks/task-center.tsx:31 [CJK] : <section aria-label="待辦任務" className="task-center__list">{data.items.map((task) => {
features/tasks/task-center.tsx:35 [CJK] <strong>{formatMinorUnit(task.amount_minor, task.space.currency, 'zh-TW')}</strong><span aria-hidden="true">開啟寶箱 →</span>
features/tasks/task-center.tsx:38 [CJK] <small className="task-center__generated">狀態時間：{formatGeneratedAt(data.generated_at)}</small>
features/tasks/task-center.tsx:28 [English] QUEST BOARD
features/taxonomy/taxonomy-manager.tsx:18 [CJK] const noun = kind === 'CATEGORY' ? '類別' : '標籤';
features/taxonomy/taxonomy-manager.tsx:28 [CJK] } catch { setError('變更未確認。請重新讀取最新類別與標籤，再檢查名稱或版本。'); }
features/taxonomy/taxonomy-manager.tsx:33 [CJK] <p>預設項目供所有模式使用；自訂項目只屬於你。合併保留原始支出紀錄，分析會歸入目標項目。</p>
features/taxonomy/taxonomy-manager.tsx:34 [CJK] <label className="pixel-field">項目種類<select className="pixel-field__input" value={kind} onChange={e => { setKind(e.target.value as 'CATEGORY' | 'TAG'); setSelectedId(''); setTargetId(''); }} disabled={busy}>
features/taxonomy/taxonomy-manager.tsx:35 [CJK] <option value="CATEGORY">類別</option><option value="TAG">標籤</option>
features/taxonomy/taxonomy-manager.tsx:38 [CJK] <PixelField label="新增名稱" required maxLength={60} value={name} onChange={e => setName(e.target.value)} disabled={busy} />
features/taxonomy/taxonomy-manager.tsx:39 [CJK] {duplicate && <p>已有相同名稱，請使用現有項目。</p>}
features/taxonomy/taxonomy-manager.tsx:40 [CJK] <PixelButton disabled={busy || !online || duplicate}>新增{noun}</PixelButton>
features/taxonomy/taxonomy-manager.tsx:42 [CJK] <label className="pixel-field">管理自訂項目<select className="pixel-field__input" value={selectedId} onChange={e => { setSelectedId(e.target.value); setRename(terms.find(term => term.id === e.target.value)?.name ?? ''); }} disabled={busy}>
features/taxonomy/taxonomy-manager.tsx:43 [CJK] <option value="">選擇項目</option>{active.filter(term => term.scope === 'PERSONAL').map(term => <option key={term.id} value={term.id}>{term.name}</option>)}
features/taxonomy/taxonomy-manager.tsx:46 [CJK] <PixelField label="新名稱" maxLength={60} value={rename} onChange={e => setRename(e.target.value)} disabled={busy} />
features/taxonomy/taxonomy-manager.tsx:47 [CJK] <PixelButton type="button" disabled={busy || !online || !rename.trim()} onClick={() => void mutate(`/${selected.id}`, 'PATCH', { version: selected.version, name: rename.trim() })}>重新命名</PixelButton>
features/taxonomy/taxonomy-manager.tsx:48 [CJK] <label className="pixel-field">合併至<select className="pixel-field__input" value={targetId} onChange={e => setTargetId(e.target.value)} disabled={busy}>
features/taxonomy/taxonomy-manager.tsx:49 [CJK] <option value="">選擇目標</option>{active.filter(term => term.id !== selected.id).map(term => <option key={term.id} value={term.id}>{term.name}</option>)}
features/taxonomy/taxonomy-manager.tsx:51 [CJK] <PixelButton type="button" emphasis="secondary" disabled={busy || !online || !targetId} onClick={() => void mutate(`/${selected.id}/merge`, 'POST', { version: selected.version, target_id: targetId, target_version: terms.find(term => term.id === targetId)!.version })}>確認合併</PixelButton>
features/taxonomy/taxonomy-manager.tsx:52 [CJK] <p>封存後不能用於新支出，舊支出仍保留此項目。</p>
features/taxonomy/taxonomy-manager.tsx:53 [CJK] <PixelButton type="button" emphasis="danger" disabled={busy || !online} onClick={() => void mutate(`/${selected.id}/archive`, 'POST', { version: selected.version })}>確認封存</PixelButton>
features/taxonomy/taxonomy-manager.tsx:55 [CJK] {error && <><p role="alert">{error}</p><PixelButton type="button" emphasis="secondary" onClick={onChanged}>重新讀取類別與標籤</PixelButton></>}
features/taxonomy/taxonomy-manager.tsx:56 [CJK] {!online && <p role="status">目前離線，尚未儲存變更。</p>}
features/taxonomy/taxonomy-picker.tsx:27 [CJK] .catch(() => { if (active) setError('類別暫時無法讀取，原有選擇仍保留。'); });
features/taxonomy/taxonomy-picker.tsx:31 [CJK] const hint = result.recent_ids.includes(id) ? '最近' : result.frequent_ids.includes(id) ? '常用' : result.context_ids.includes(id) ? '建議' : '';
features/taxonomy/taxonomy-picker.tsx:50 [CJK] } catch { setError('新增未確認，請重新搜尋現有項目後再試。'); }
features/taxonomy/taxonomy-picker.tsx:54 [CJK] <legend>類別與標籤</legend>
features/taxonomy/taxonomy-picker.tsx:55 [CJK] <PixelField label="搜尋類別" maxLength={60} value={categorySearch} onChange={e => setCategorySearch(e.target.value)} />
features/taxonomy/taxonomy-picker.tsx:56 [CJK] <label className="pixel-field">類別<select className="pixel-field__input" value={categoryId} onChange={e => onChange(e.target.value, tagIds)}>
features/taxonomy/taxonomy-picker.tsx:57 [CJK] <option value="">未分類</option>
features/taxonomy/taxonomy-picker.tsx:58 [CJK] {categoryId && !categoryResult?.terms.some(term => term.id === categoryId) && <option value={categoryId}>{historicalTerms.find(term => term.id === categoryId)?.name ?? '原有類別'}（保留歷史紀錄）</option>}
features/taxonomy/taxonomy-picker.tsx:61 [CJK] {categorySearch.trim() && visibleCategories?.length === 0 && <PixelButton type="button" emphasis="secondary" disabled={!online || creating} onClick={() => void create('CATEGORY', categorySearch)}>新增類別「{categorySearch.trim()}」</PixelButton>}
features/taxonomy/taxonomy-picker.tsx:62 [CJK] <PixelField label="搜尋標籤" maxLength={60} value={search} onChange={e => setSearch(e.target.value)} />
features/taxonomy/taxonomy-picker.tsx:66 [CJK] {tagIds.filter(id => !tagResult?.terms.some(term => term.id === id)).map((id, index) => <label key={id}><input type="checkbox" checked onChange={() => onChange(categoryId, tagIds.filter(tag => tag !== id))} />{historicalTerms.find(term => term.id === id)?.name ?? `原有標籤 ${index + 1}`}（歷史）</label>)}
features/taxonomy/taxonomy-picker.tsx:68 [CJK] {search.trim() && visibleTags?.length === 0 && <PixelButton type="button" emphasis="secondary" disabled={!online || creating || tagIds.length >= 20} onClick={() => void create('TAG', search)}>新增標籤「{search.trim()}」</PixelButton>}
shared/drafts/blocked-expense-drafts.tsx:27 [CJK] <p>這個寶箱目前不可寫入；此裝置仍有 {drafts.length} 份未提交草稿。內容不會顯示或自動送出。</p>
shared/drafts/blocked-expense-drafts.tsx:28 [CJK] <PixelButton type="button" emphasis="danger" onClick={discardAll}>丟棄這個寶箱的草稿</PixelButton>
shared/drafts/draft-recovery.tsx:15 [CJK] <p>這個裝置上的草稿已損壞，未顯示任何內容。你可以安全地丟棄它。</p>
shared/drafts/draft-recovery.tsx:16 [CJK] <PixelButton type="button" emphasis="danger" onClick={onDiscard}>丟棄草稿</PixelButton>
shared/drafts/draft-recovery.tsx:21 [CJK] <p>這個寶箱目前不可寫入。草稿仍只保留在這個裝置，且不會自動提交。</p>
shared/drafts/draft-recovery.tsx:22 [CJK] <PixelButton type="button" emphasis="danger" onClick={onDiscard}>丟棄草稿</PixelButton>
shared/drafts/draft-recovery.tsx:27 [CJK] ? '伺服器狀態已有變更。請先檢視草稿與最新資料；系統不會自動提交。'
shared/drafts/draft-recovery.tsx:29 [CJK] ? '草稿已載入但尚未提交。確認最新狀態後，再手動重新送出草稿。'
shared/drafts/draft-recovery.tsx:30 [CJK] : '找到這個寶箱的未提交草稿。請先檢視，重新連線也不會自動送出。'}</p>
shared/drafts/draft-recovery.tsx:31 [CJK] {!reviewed && <PixelButton type="button" emphasis="secondary" onClick={onReview}>檢視草稿</PixelButton>}
shared/drafts/draft-recovery.tsx:32 [CJK] <PixelButton type="button" emphasis="danger" onClick={onDiscard}>丟棄草稿</PixelButton>
shared/ui/pixel-dialog.tsx:133 [English] X
shared/ui/pixel-notebook.tsx:38 [CJK] 目前離線；已確認資料維持不變。: expected [ …(481) ] to deeply equal []
```

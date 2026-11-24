# Phase 2I-b：日文（ja）

日期：2026-11-19。狀態：**待 Codex 實作**。

依據：2I-1、2I-2、2I-2S、2I-2T 都已核准、push 並部署（origin＝`7bca944`，CI 五個 job 全綠）。上層規則見 `docs/superpowers/specs/2026-11-16-phase-2i-i18n-design.md`（2I spec）與 `2026-11-17-phase-2i2-i18n-app-design.md`（2I-2 spec）。

日文文案已經由 Ed 找的審閱者審完：
- 定稿是 `.tmp/2ib-ja-final.json`，結構與 `zh-TW.json` 相同，765 個 key；
- 系統分類日文、最終用語集與審閱意見在 `.tmp/2ib-ja-review-result.json`；
- 審閱原檔是 `.tmp/2ib-ja-reviewed.xlsx`。

**Ed 的上線原則：做完、審閱通過才上線。** 本輪實作的就是審閱過的定稿；新增的少數字串（§3）在 §3 列出日文，審閱時一併請 Ed 確認。

## 1. Ed 的決定（2026-11-19）

1. 一般 UI 用です・ます體；ミミク的台詞用朋友語氣（タメ口），自稱「ボク」。
2. 遊戲用語用日式 RPG 說法：宝箱、パーティー、クエスト、ホーム、設定。Mimiku 寫成「ミミク」。
3. 文案以審閱後的定稿為準（§0 的檔案）。
4. **語言切換：公開頁 header 與登入／註冊頁改成「按鈕＋選單」**（§4）。設定頁的單選清單加上「日本語」。
5. **共同資金的投入排程摘要依頻率顯示**：日文「2か月ごと／2週間ごと」、英文「every 2 months／every 2 weeks」，中文維持現在的字不變（§5）。

## 2. 審閱者決定（附理由）

1. **啟用 `ja`**：`ENABLED_LOCALES` 加 `ja`。`htmlLang('ja')='ja'`、`intlLocale('ja')='ja-JP'` 已存在。`resolveLocale` 接受 `ja`；cookie、`users.locale` 同步沿用 2I-1 規則（後端早就接受 `ja`）。首次造訪仍一律中文，不看 Accept-Language。
2. **訊息檔**：`web/src/i18n/messages/ja.json` 的內容取自 `.tmp/2ib-ja-final.json`，再加上 §3 的新 key、刪除 §3 指定的舊 key。zh-TW 仍是型別來源。
   - `messages.test.ts`：三語的 key 集合、ICU 參數都要相同；`nowrap` 標籤的豁免從「只有 en」擴大為「en 與 ja」（ja 也加了 `<nowrap>`，理由同 2I-2 2R2：日文也會在 ISO 日期的連字號處換行）；
   - §5 的新參數另外說明。
3. **日文字型**（理由：全站字型是 `Arial, Helvetica, sans-serif`，中日文字靠瀏覽器補字。只設 `lang="ja"` 時，部分環境仍可能用中文字型顯示漢字；指定日文字型才能確保字形正確）：
   - 在 `web/src/app/globals.css` 加 `:lang(ja)` 規則：`font-family: Arial, Helvetica, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic UI", "Yu Gothic", Meiryo, "Noto Sans JP", sans-serif;`。拉丁字母仍用 Arial；
   - **不下載 web font**（不增加流量，也不新增授權檔案）；
   - 像素字型（`--mimic-font-pixel`，Mimic ID 用的等寬字型）不動；
   - 中文與英文的計算樣式必須不變（只限定在 `:lang(ja)`）。
4. **日文換行**：`:lang(ja)` 加 `line-break: strict`，避免「、。」出現在行首。`hyphens:auto` 只用於英文，不套用到日文。
5. **sw 離線 fallback 與 global-error 改成三語**：在現有的中英段落後面加一段 `lang="ja"`，內容分別用 `ja.pwa.offlineTitle`＋`ja.brand.tagline`、`ja.routeState.global`。`<html lang="zh-Hant">` 不變。
6. **manifest**：`lang` 用 `htmlLang(locale)`，`description` 依語言（ja 用 `{speaker} - {tagline}` 組出「ミミク - 一緒に貯めて…」）。
7. **系統分類日文用新 migration 寫入**（2I-2S 的規則：已部署的 migration 不得修改）：
   - `backend/src/modules/taxonomy/system-taxonomy.ts` 的 catalog 每筆 `translations` 加 `ja`（值取自 `.tmp/2ib-ja-review-result.json` 的 `taxonomy`）；
   - 新增 `backend/prisma/migrations/20261119000200_system_taxonomy_ja/migration.sql`，只更新 31 筆的 `translations`（以 system_key 定位；有差異才更新、更新 `updated_at`；不動 name／status／version）；
   - `migration-contract.spec.ts` 改成比對「依序套用所有系統分類 migration 之後的最終結果」與 catalog 一致；
   - `TaxonomyQueryDto.locale` 改為 `@IsIn(['zh-TW','en','ja'])`；
   - CI 的 Backend database job（2I-2T）會在不 seed 的資料庫上驗證這一切。`test:migration-only-db` 加一案：ja 使用者的分類清單是日文，Home 近期分類是「食費」。
8. **系統標籤英文名**（`Date`、`Fuel`、`Work reimbursement`）這輪不改。英文名同時是 `name` 欄位，改名會牽動搜尋與唯一索引，另開一輪處理。
9. **術語表搬家**：新增 `docs/i18n/glossary.md`，合併 2I spec §6、2I-2 spec §6，加上 ja 欄（取自 `.tmp/2ib-ja-review-result.json` 的 `glossary`）。之後每輪新字串都要對照這份檔案，2I spec 與 2I-2 spec 的 §6 不再更新。

## 3. 新增與刪除的 key

| key | zh-TW | en | ja | 說明 |
|---|---|---|---|---|
| `language.japanese` | 日本語 | 日本語 | 日本語 | 語言自稱，三語相同，並加 `lang="ja"` |
| `language.menuLabel` | 語言：{current} | Language: {current} | 言語：{current} | 選單按鈕的 `aria-label`；`{current}` 是目前語言的自稱 |
| `language.target` | （刪除） | （刪除） | （刪除） | 單一切換按鈕不再使用 |

- `language.english`、`language.traditionalChinese` 已經是語言自稱，沿用不變。
- `pooled.scheduleSummary` 的新寫法見 §5。

## 4. 語言切換（Ed 決定：按鈕＋選單）

位置：公開頁 site-header、登入／註冊頁（共用 `web/src/shared/i18n/language-switch.tsx` 的 `LanguageSwitch`）。設定頁的 `LanguageSettings` 維持單選清單，加上第三個選項「日本語」（`lang="ja"`）。

**按鈕**
- 顯示**目前語言的自稱**＋向下箭頭：`中文 ▾`、`English ▾`、`日本語 ▾`。自稱用該語言標註（`lang`）；
- 箭頭用文字或 CSS 畫，`aria-hidden`；**不得新增像素素材**（「不畫文字進像素」規則）；
- `aria-label` 用 `language.menuLabel`；`aria-haspopup="menu"`、`aria-expanded`；
- 沿用現有的連結樣式（header 的 `navLink`、登入頁的 `languageSwitch`）；
- 選單展開時，按鈕的外觀維持不變。

**選單**
- 列出三種語言，順序固定：中文、English、日本語。每項都用該語言的自稱，並加上 `lang`；
- 目前語言標示為選取狀態（`aria-checked="true"` 或 `aria-current="true"`，並加上可見的勾號或底色）；
- 選擇後：呼叫既有的 `/api/locale` → `router.refresh()`（流程與 2I-1 相同）；處理中按鈕為 `aria-busy`，不可重複送出；
- 鍵盤：Enter／Space 開啟，上下鍵移動，Enter 選擇，Esc 關閉並把焦點還給按鈕；點選單外面會關閉；
- 外觀沿用 `PixelDialog` 或既有的面板樣式（暖深褐、黃銅邊），不新增素材；
- 在 320 px 寬時，選單不得超出畫面（靠右對齊或改為往左展開）。

**header 寬度（停止點）**
- 公開 header 在 320、360、390、544±1 px 下，中英日 × 未登入／已登入共 6 種組合都必須單行；
- 320 px 的餘裕至少 8 px，用 Arial、Roboto、Liberation Sans 各量一次（與 2I-1 2R4 相同）；
- 有任何一組不符合，就停下來回報實測寬度，不要自行改文案或樣式。英文的 `English ▾` 比原本的 `中文` 寬，是最可能不夠的組合。

## 5. 投入排程摘要（Ed 決定：依頻率顯示）

`pooled.scheduleSummary` 加一個 ICU 參數 `frequency`（值為排程的 `cadence`：`MONTHLY`／`WEEKLY`）。

| 語言 | 目標顯示（interval=2） | interval=1 |
|---|---|---|
| zh-TW | `每月 · 每 2 期`（**逐字不變**） | `每月 · 每 1 期`（不變） |
| en | `Monthly · every 2 months`／`Weekly · every 2 weeks` | `Monthly · every month`／`Weekly · every week` |
| ja | `毎月 · 2か月ごと`／`毎週 · 2週間ごと` | `毎月 · 1か月ごと`／`毎週 · 1週間ごと` |

- `<cadence>` 與 `<interval>` 標籤保留；
- 中文的輸出與文字節點切分必須與現在完全相同（用 §8 的 DOM 文字節點比對證明）。
- 做法由 Codex 決定，並在 verification 說明。例如：中文訊息加一個所有分支都是空字串的 `select`，或讓一致性測試允許這個 key 的參數集合在三語間不同（要附理由並列入白名單）。
- 這會改變英文畫面的文字，所以基金頁的英文截圖要重拍。

## 6. 範圍外

- 日文以外的畫面與功能不變；
- 不改系統標籤英文名（§2-8）；
- 不改審閱過的日文文案。如果實作時發現某句在版面上放不下或語意不通，停下來回報，由 Ed 決定是否請審閱者再看。

## 7. 部署順序

1. **後端先上**（第一次 push）：新 migration＋catalog＋DTO。這時還沒有日文使用者，對既有使用者沒有影響；
2. **web 後上**（第二次 push）：啟用 `ja`、`ja.json`、字型、切換選單、排程摘要。
- 理由：web 一啟用日文，就可能有使用者切換過去；後端先有日文分類，他們才不會看到英文分類名稱。
- commit 順序：後端 → web → docs（push 1＝後端；push 2＝web＋docs）。

## 8. 驗證

### 8.1 基線與兩個樹
- 基線：`7bca944` 的乾淨 worktree（`.tmp/`）；
- 「只有後端」樹（`7bca944`＋`backend/` 變更）與「全部」樹，都在 WSL Docker `node:22`（`core.autocrlf=false` 乾淨 checkout）跑 CI 五個 job 的步驟。Backend database job 要用 postgres:18；
- 兩個 web Dockerfile 都要 build、以 `node` 執行、通過 `/api/health/live`；容器內：沒有 cookie → `lang="zh-Hant"`，`mimic-locale=en` → `en`，`mimic-locale=ja` → `ja`；
- **新 web 接 `7bca944` 的 API**（也就是沒有日文分類的舊 API）：日文畫面能正常顯示，分類名稱暫時退回英文（`term.name`），沒有錯誤；
- real-backend 只用 `127.0.0.1` 專用 DB；產品程式不得 import `web/` 以外的檔案；Vitest 用預設設定全套跑。

### 8.2 Vitest
- 三語一致性（§2-2）；`resolveLocale('ja')` 為 `ja`；`request.ts` 在 cookie＝`ja` 時載入 ja.json；
- `/api/locale` 接受 `ja`；登入／註冊的同步規則對 `ja` 生效（帳號是 ja、沒有 cookie → 設定 ja cookie）；
- `LanguageSwitch` 選單：開關、鍵盤操作、目前語言的標示、`aria-*`、處理中不可重複送出；
- `pooled.scheduleSummary`：三語 × MONTHLY／WEEKLY × interval 1／2，輸出符合 §5 表格；
- `useFormatMoney` 在 ja 下為 `ja-JP` 格式；邀請到期時間在 ja 下為 `ja-JP` 格式；
- `no-hardcoded-copy` 照跑（新元件不得寫死文字）。

### 8.3 e2e（新增 `web/e2e/i18n-phase-2ib.spec.ts`）
- 從中文頁的 header 選單選「日本語」→ 不需手動重新整理就變日文、`lang="ja"`、cookie＝`ja`；重新整理後仍是日文；在選單選「中文」切回。登入頁、設定頁同理；
- real backend：cookie＝ja 時登入 → `users.locale`＝`ja`；新 context 登入同一帳號 → cookie 被設成 `ja`；
- ja 使用者：分類挑選器是日文（「食費」）、Home 是「支出の多いカテゴリ：食費」（需要新後端，只在「全部」樹跑）；
- 日文下 `/app` 在 360、390、1440：導覽五個標籤（ホーム／マイ宝箱／パーティー／クエスト／設定）沒有 ellipsis；浮動鈕「支出を記録」完整；頁面沒有水平捲動；
- 日文 ISO 日期的 `<nowrap>` 盒在 360／390 下 `getClientRects().length === 1`；
- `/manifest.webmanifest`：cookie＝ja → `lang` 為 `ja`、description 是日文；
- sw 離線 fallback 與 global-error 含三種語言；
- 既有 2A–2I-2 e2e 全部照跑（預設中文）。

### 8.4 中文與英文的回歸
- **中文像素（容差 0，與 `7bca944` 比對）**：
  - 拍像素前先做 DOM 文字節點比對（2I-2 2R-1 的做法）；
  - Home 44、三種寶箱 33、任務 11 逐像素相同；
  - Landing 11 個尺寸：只有 header 列可以不同（語言按鈕從 `English` 變成 `中文 ▾`），提供遮罩並證明差異只在 header 列內；
  - 登入、註冊、設定頁的中文會改變（語言控制項），只交 before／after；
- **英文**：逐頁與 2I-2 的英文截圖比對。預期只有兩種差異：公開 header／登入頁的語言按鈕，以及基金頁的排程摘要。其餘頁面要逐像素相同（同樣先做 DOM 比對）。
- 逐像素相同的成對截圖不進 git，只留 SHA-256 清單與 390×844 範例。

### 8.5 日文截圖（360×800、390×844、1440×900）
- 範圍＝2I-1 §7.5（公開頁、auth、外殼、設定、狀態頁、離線、更新通知）＋2I-2 §9（App 內頁、每個彈窗與面板）的全部畫面；
- 另外拍語言選單展開的狀態（header、登入頁；中英日三種語言下各一張）；
- 檔名：`<頁面>-<狀態>-ja-<寬>x<高>.png`。

### 8.6 日文版面停止點（停下回報，附截圖與實測寬度；不要自行改文案或樣式）
1. 任何日文文字被截斷、溢出邊框，或造成頁面水平捲動；
2. 導覽標籤出現 ellipsis，或浮動鈕文字不完整；
3. 摘要卡的主金額或筆記本的金額欄被擠到換行；
4. 任一按鈕在 360 寬換成三行以上；
5. §4 的 header 寬度條件不符合；
6. 漢字明顯用中文字形顯示（例如「直」「角」「骨」在日文頁和中文頁長得一樣）。

## 9. 交付
- `docs/design/assets/reviews/2026-11-19-phase-2ib/`：`verification.md`、`screenshots/`、`pixel-regression-sha256.txt`；
- `docs/i18n/glossary.md`（§2-9）；
- `.agents/devlog.md` 追加一筆（CRLF）；
- **停在視覺審核：不要 commit、不要 stage。**

## 10. 審閱後
- 小德審閱後問 Ed：日文畫面要不要再給審閱者看一次實際截圖（建議給，特別是選單與長句的換行）；
- Ed 核准後，依 §7 分兩次 push。第二次 push 後在 staging 實測：選單切到日文、分類為日文、Home「支出の多いカテゴリ」、切回中文。

## 2R（2026-11-19，§4 停止點後；Ed 決定）

Codex 的前置量測（`docs/design/assets/reviews/2026-11-19-phase-2ib/verification.md`、`header-preflight.json`）：320 px 英文未登入在 Arial 下需要 313.02 px（可用 288，`Log in` 換兩行），Liberation Sans 下餘裕 3.50 px；其餘 16 組都有 ≥ 12 px 餘裕。小德確認：Windows Chrome 對 weight 800 的 Arial 選到 Arial Black，這在基線的字標上就已經如此，不是本輪造成的，這輪不改字型。

**Ed 決定：窄螢幕的英文按鈕縮成 `EN ▾`。**

- 新增 key `language.currentShort`：zh-TW「中文」、en「EN」、ja「日本語」。只有英文是縮寫，中文、日文和完整自稱相同；
- `LanguageSwitch` 的按鈕放兩個 span：完整自稱（`language.current…` 原本的文字）與短自稱，用 `@media (max-width: 359.98px)` 切換顯示（以 viewport 為準，與 header 既有 media query 寫法一致）。兩個 span 都 `aria-hidden`，按鈕的可存取名稱仍是 `language.menuLabel`（`Language: English`），螢幕閱讀器不會讀到「EN」；
- 選單項目一律顯示完整自稱（`English`），不縮寫；
- 套用在所有用到 `LanguageSwitch` 的地方（公開 header、登入／註冊頁）；
- 不縮字級、不縮間距、不藏 Features，其他文案不變。

**重新量測（取代 §4 的寬度停止點）**
- 320 px：6 種組合 × Arial／Roboto／Liberation Sans，都要單行、餘裕 ≥ 8 px；
- 359 px 英文顯示 `EN ▾`、360 px 英文顯示 `English ▾`，兩者都要單行、餘裕 ≥ 8 px（360 用三種字型量）；
- 390、544±1 px 照 §4 量；
- 用 `CSS.getPlatformFontsForNode` 記錄實際字型（同前置量測），結果寫進 verification.md；
- 仍不符合就再停下回報，不要自行改其他樣式。
- e2e 加一項：320 px 英文按鈕可見文字為 `EN`、360 px 為 `English`，兩者的 accessible name 都是 `Language: English`。

前置量測的 18 張診斷截圖與 `header-preflight.*` 保留在審閱資料夾，與本輪成果一起 commit。

## 2R2（2026-11-19，§8.6 選單溢出停止後；Ed 決定）

Codex 的停止證據（`verification.md`、`menu-measurements.json`、`screenshots/login-language-menu-ja-360x800.png`）：360 px 日文登入頁的選單 left = −16.55 px。小德確認原因：登入／註冊頁的 `LanguageSwitch` 是 `.switchPrompt` 段落裡的行內元素，日文提示句較長，按鈕換到第二行最左邊；`.menu` 固定 `right: 0`（往左展開），所以超出左邊界。中英文的按鈕在行尾（選單 right 292.36／306.66），只改成 `left: 0` 會改從右邊超出，所以不採用單純改方向。

**Ed 決定：自動翻轉。**

- 改共用元件 `web/src/shared/i18n/language-switch.tsx`／`.module.css`，所以公開 header 與登入／註冊頁都套用；
- 預設仍是 `right: 0`（往左展開，與現在相同）。選單打開後、繪製前（`useLayoutEffect`）量 `getBoundingClientRect()`：
  1. left ≥ 8 px：維持預設；
  2. left < 8 px：改成 `left: 0; right: auto`（往右展開，貼齊按鈕左緣）；
  3. 兩種都放不下時（任一邊 < 8 px）：選擇超出較少的那一邊，再用 inline `translateX` 平移，讓左右兩邊都至少留 8 px（`max-width: calc(100vw - 2rem)` 不變，所以一定放得下）；
- 方向用 `data-align="end"|"start"` 標在選單上，方便測試。打開期間 resize 時重新計算或直接關閉選單，兩種都可以，在 verification 寫明採用哪一種；
- 不改按鈕、選單的外觀、字級、間距、文案，也不移動 `LanguageSwitch` 在頁面中的位置。選單關閉時的畫面必須與 2R 相同（DOM 與像素回歸照 §8.4，原本就不包含展開中的選單）；
- 不用 CSS anchor positioning（瀏覽器支援度不夠）。

**驗證（補 §8.6）**
- 量測矩陣：`/`、`/login`、`/register` × zh-TW／en／ja × 320／359／360／390／544／1440 px，展開選單後記錄 menu left／right／width、`data-align`，以及 viewport 寬度。每一格都要符合 left ≥ 8 且 right ≤ viewport − 8；結果寫進 `menu-measurements.json` 與 verification.md 表格；
- 截圖：至少 `/login` 的 ja 360（就是這次停下的那格）、ja 320、en 320、zh-TW 360，以及 `/` 的 en 320，都是展開狀態；
- Vitest：模擬 rect 測三種情況（維持預設、翻轉到右、平移），再加一項 resize 的行為；
- e2e（`i18n-phase-2ib.spec.ts`）：360 px 日文 `/login` 展開後，選單完全在 viewport 內且 `data-align="start"`；320 px 英文 `/` 展開後也在 viewport 內；
- 仍有任何一格不符合，就停下回報，不要改按鈕位置、文案或樣式。

其餘照 verification.md「待完成／恢復順序」2–4 繼續：兩個樹的五個 CI job、舊 API 日文 fallback、各輪 e2e、A／B 三語 DOM 與整頁 RGBA 容差 0 回歸、歸檔與 SHA-256 清單。

## 2R3（2026-11-23，RGBA 回歸與 e2e 環境；小德決定，技術性停止點）

**1. dev overlay 的 2 Issues**：原因是登入／註冊頁的 `<p class="switchPrompt">` 裡放了選單的 `<div>`（無效巢狀，本輪造成）。Codex 已把選單改成 `<span>`（保留 `role="menu"`、絕對定位與樣式），dev console 為 0。小德接受；選單要維持 `display:block` 的版面，展開量測與截圖以修正後的 production build 為準。

**2. Home 底部導覽的圓角抗鋸齒（比照 2D 的已知例外）**
- 證據：`A-home-idle-430x932` 的差異是 2 個像素，位置在 (87–89, 873)，也就是固定在底部的導覽列裡目前分頁（首頁）外框的右上圓角。`.tmp/phase-2ib-raster-control*` 用 7bca944 自己跟自己比，在同一座標也重現，所以是整頁截圖合成固定元素時的抗鋸齒不穩定，不是本輪造成。
- 規則：整頁 RGBA 仍然容差 0。只有同時符合下面三條的差異，才可以記為「nav-corner-aa（2R3）」，並在 `pixel-regression-sha256.txt` 該行寫上差異像素數、bounding box 與 active 導覽項目的 rect：
  1. 差異的 bounding box 完全落在 active 底部導覽項目的 `getBoundingClientRect()` 內（換算成整頁座標）；
  2. 差異像素 ≤ 4；
  3. 前後兩張的 DOM 文字（TreeWalker）相同。
- 不符合就是失敗，照 §8.6 停下回報。不加遮罩、不放寬其他區域。
- 這 4 組（home-idle 360／430、home-empty 360、home-ready 430）先照此規則判定；其餘矩陣照常比對。

**3. 全套 e2e 重跑**：上次 `phase-2ib-final-e2e.log` 的 59 項失敗是環境沒準備好（`localhost:5432` 的 DB、`127.0.0.1:3871` 的 backend 沒有啟動，導致註冊失敗），不代表產品結果。依各 spec／playwright config 要求的 port 啟動專用 DB 與 backend（只綁 127.0.0.1）後重跑。仍然失敗的項目要在 7bca944 基線上重現，才能列為既有問題，並逐項寫進 verification.md。

## 2R4（2026-11-23，RGBA 抗鋸齒雜訊規則一般化；小德決定，技術性停止點）

2R3 停在 `A-personal-add-390x844`：5 個差異像素分成兩群，(373, 444–445) 是記帳彈窗像素外框右上角，每個通道差 2–17；(44, 944–946) 是「類別」select 的圓角，每個通道差 1–7。這跟 2R3 的導覽圓角是同一種現象：整頁截圖時，固定元素（導覽、彈窗）的角落抗鋸齒不穩定。本輪沒有改這個彈窗的結構或樣式，DOM 文字也相同。2R3 的規則只認導覽 rect，範圍太窄。

**2R4 取代 2R3-2 的三條件。** 整頁 RGBA 仍然容差 0。差異同時符合下面五條，才可以記為「aa-noise（2R4）」：
1. 前後兩張的 TreeWalker DOM 文字相同；
2. 整頁差異像素 ≤ 8；
3. 每個差異像素的 R、G、B、A 各自的差都 ≤ 32；
4. 差異像素用 8 連通分群後，每一群的 bounding box ≤ 4×4 px；
5. 每一群都落在某個元素 border-box 的角落 4×4 px 內（記錄該元素的 selector 與 rect）。

- 每筆例外在 `pixel-regression-sha256.txt` 寫上：像素數、每群的 bounding box、最大通道差、所在元素與 rect；verification.md 列一張例外總表，附每群前後 8 倍放大的對照圖（放審閱資料夾的 `aa-noise/`）。
- 不符合任何一條就是失敗，照 §8.6 停下回報；不加遮罩、不調其他門檻。
- 已記的 4 組 nav-corner-aa 改用 2R4 重新判定並改標。
- 小德審閱時會逐張看例外放大圖。

## 2R5（2026-11-23，2R4 第 5 條的角落範圍；小德決定，技術性停止點）

2R4 停在 `B-home-empty-2560x1440`：1 個差異像素 (850, 852)，before `#dac9ac`、after RGBA [219,203,173]，最大通道差 2。小德讀 before 原圖確認：這個像素在 Home 空狀態卡片（「這裡還沒有寶箱」）左上角的圓角外緣。卡片 border-box 的左緣在 x = 850，上緣約在 y = 846；圓角半徑約 8 px，所以抗鋸齒的弧線一路延伸到距上緣 6～7 px 的位置。這個像素距上緣 6 px，超出 2R4 寫死的 4×4 角落範圍，所以第 5 條判為不通過。這是 2R4 條文的範圍定得太小，不是本輪造成的差異：
- B 組兩張都是同一個候選 web，只換 API，web 端沒有任何改動；
- 交接文件記載的 2D 已知例外正是「Home 2560×1440 empty／ready 各有 2 個卡片圓角的抗鋸齒像素差異」。

**2R5 只修改 2R4 第 5 條，其他四條和容差 0 不變：**

5. 每一群都落在某個元素 border-box 的**角落區域**內。角落區域是以 border-box 的四個角為起點、邊長 `c = max(4, ceil(該角的 computed border-radius))` 的正方形（左上角取 `border-top-left-radius`，其他角類推；radius 是百分比或橢圓時，取兩軸換算成 px 後的較大值）。

- 找元素的方法：在 after 頁面，對該群每個像素的中心點用 `document.elementsFromPoint()`，取回傳清單中的元素以及它們的祖先，逐一檢查；before 頁面也用同樣方法找到同一個 selector，而且前後 rect 相同。找不到符合的元素就是失敗；
- 記錄欄位加上 `c` 與 computed radius；
- 已判為 aa-noise 的 5 組改用新條文重新判定（4×4 是 c×c 的子集，所以結果不會變差），標籤仍是「aa-noise（2R4）」，另外加註「2R5 角落」；
- `B-home-empty-2560x1440` 照新條文重新判定；若 ready 或 A 組的 2560 也出現同類差異，一樣照此處理。

照 2R4 停止時的進度繼續：三語 A／B 回歸的剩餘組數（含日文）、全套 e2e（專用環境 127.0.0.1:25434／3905／3904）、歸檔與 SHA-256 清單、verification.md 總表。仍有不符合的就停下回報。

## 2R6（2026-11-23，2R5 找元素的方法；小德決定，技術性停止點）

2R5 停在 `A-fund-returns-390x844`：4 個差異像素在 y = 1997，x = 160、162、227、229，最大通道差 4，DOM 文字相同。小德讀 before 原圖確認：這是固定在底部的手機導覽列裡，目前分頁「共同群組」外框（`#51422c`，上緣 y = 1994，左右緣 x ≈ 160／233）的左上、右上圓角，跟 2R3 的 nav-corner 是同一種現象。不同的是這張截圖開著「指定基金退回」的 modal 彈窗，導覽列被 backdrop 壓暗。

2R5 的找法在這裡失效，有兩個原因：
- modal `dialog` 在 top layer，`elementsFromPoint()` 只會命中彈窗或它的 backdrop，命中不到底下的導覽列；
- 整頁截圖時，Playwright 會把 viewport 撐到整頁高度（這張是 2056 px），fixed 元素畫在撐開後的位置。在原本 844 px viewport 下量到的 rect，和截圖裡的座標對不上，所以彈窗的 rect 是 1400–1867，截圖裡卻在別的位置。

**2R6 只改 2R5 的「找元素的方法」，第 5 條的角落區域定義和其他四條、容差 0 都不變：**
- 量 rect 時，先把 viewport 設成和截圖相同的尺寸（例如 390×2056），等 layout 穩定（兩個 rAF）後，再量 `getBoundingClientRect()`。這時 rect 就是截圖座標，不用再加 scroll。量完把 viewport 改回去；
- 候選元素用 `document.querySelectorAll('*')` 全部列舉，不用 `elementsFromPoint()`。只要某個元素 border-box 的某個角落區域（2R5 的 c×c）涵蓋整群就算數，不論它是否被彈窗或 backdrop 蓋住；
- before／after 要找到同一個 selector，而且 rect 相同；
- 已通過的 6 組改用新方法重新判定（應該不會變差），標籤加註「2R6 量法」；
- 記錄每群命中的 selector、rect、computed radius、`c`，以及量測時的 viewport 尺寸。

照停止時的進度繼續：剩餘的三語 A／B 回歸（含日文）、全套 e2e 從頭重跑（上次在 204／788 中止，不接續）、歸檔與 SHA-256 清單、verification.md 總表。仍不符合就停下回報。

## 2R7（2026-11-24，更正 2R6 的量 rect 方法；小德決定，技術性停止點）

2R6 停在 `A-home-idle-360x780`。Codex 把 viewport 設成 360×1195 後，active 導覽的上緣移到 y = 1133，但 PNG 裡差異像素在 y = 721（原 360×780 下導覽上緣是 718），兩者相差 415 px，正好是 viewport 的高度差。這證明 2R6 的前提錯了：整頁截圖並不會把 viewport 撐大後再重新排版，fixed 元素畫在擷取當下的位置，也就是 viewport 座標加上當時的 scroll。小德回頭核對 `A-fund-returns-390x844`：那張是捲到底拍的（scrollY = 2056 − 844 = 1212），導覽列在 viewport 的上緣 782 加上 1212 等於 1994，和 PNG 吻合；彈窗 rect 的 1400.8 也符合同一個換算。所以 2R5 在那組失敗的原因只有 modal 擋住了 `elementsFromPoint()`，座標本身沒有錯。

**2R7 取代 2R6 的第一點（把 viewport 設成截圖尺寸）；保留 2R6 的第二點（用 `querySelectorAll('*')` 列舉候選元素，不用 `elementsFromPoint()`）。第 5 條的角落定義、其他四條與容差 0 都不變。**

- **rect 一律在擷取當下量**：每張截圖拍完後，在同一個頁面狀態下（不改 viewport、不捲動、不關彈窗），立刻記錄 `scrollX`／`scrollY`，以及所有候選元素的 `getBoundingClientRect()`。整頁座標 = rect + scroll，fixed 元素也用同一個換算；
- **有差異的配對要重拍**：既有的 PNG 沒有擷取當下的 rect，不能事後推算。凡是前後有任何差異像素的配對（含已判為 aa-noise 的 6 組、`A-fund-returns-390x844`，以及之後遇到的），都用上面的方法重拍 before 和 after，並以重拍的配對來判定：
  - 重拍後逐像素相同：直接通過，記為「2R7 重拍相同」；
  - 仍有差異：照 2R4／2R5 的五條判定，標記為「aa-noise（2R4）、2R7 量法」；
  - 舊配對與其 SHA-256 保留在清單中，加註「已由 2R7 重拍取代」；
- 逐像素相同的配對不必重拍；
- 之後新拍的配對一律在擷取當下記錄 scroll 與 rect，這樣有差異時就不必重拍；
- 記錄每群命中的 selector、整頁 rect、擷取當下的 scroll、computed radius 與 `c`。

照停止時的進度繼續：剩餘的三語 A／B 回歸（含日文）、全套 e2e 從頭重跑、歸檔與 SHA-256 清單、verification.md 總表。仍不符合就停下回報。

# Phase 2I：多語系（中／英，日文留到 2I-b）

日期：2026-11-16。狀態：**2I-1 待 Codex 實作**；2I-2 只列大綱，2I-1 核准後再補成完整規格（2I-2R）。

依據：2A–2H 已核准並部署；`main` = `origin/main` = `1915613`（staging web chunk 已含 2H 的 `latest-recorded`）。規則沿用 2A–2H 與 `claude/mimic-handoff.md`。

## 0. 範圍與拆輪

| 輪次 | 內容 | 部署 |
|---|---|---|
| **2I-1（本規格）** | i18n 架構、語言 cookie 與帳號同步、切換入口（公開頁 header、登入／註冊、設定）、公開頁（Landing、功能、隱私、條款、邀請接受頁）、auth、App 外殼（導覽列、浮動記帳鈕、更新通知、暫停鈕）、Settings、載入／錯誤／找不到頁、PWA（metadata、manifest、離線頁、sw 離線 fallback）、`latest_recorded` 改必填 | 只有 web，一次 push |
| 2I-2 | Home（卡片、Mimiku 台詞、QuickExpense）、三種寶箱頁與所有表單／面板（結算、更正、生命週期、分類管理）、任務、群組、App 內的邀請建立／分享、草稿復原、金額與日期格式化切換；後端：分類名稱依 `users.locale`、修 Home「近期分類」、`PATCH /me` 驗證 locale | web → 後端 |
| 2I-b | 日文（`ja`）訊息檔、日文字型 fallback、`:lang(ja)` 檢查；Ed 另找人審日文 | web |

**2I-1 部署後到 2I-2 前的過渡期**：切到英文後，公開頁、登入、外殼、設定是英文，App 內頁內容仍是中文。這是 Ed 2026-11-16 接受的取捨（拆兩輪、入口在 2I-1 就上）。

## 1. Ed 已定的決策（2026-11-16）

1. **語言不放進 URL**。以 cookie 決定畫面語言；登入後同步到後端 `users.locale`，換裝置登入時沿用帳號的語言。
2. **首次造訪一律中文**，不看 `Accept-Language`。
3. **切換入口**放三處：公開頁 site-header、登入／註冊頁、設定頁。App 頂欄不放。
4. **原本寫死英文的頁面**（Settings、群組、邀請、錯誤頁，約 90 個字串）在中文版改成中文。這些頁面的中文截圖會改變；逐像素回歸只涵蓋 Landing、Home、三種寶箱頁（§7.4）。
5. **英文術語用遊戲風**（§6）：Chest、Parties、Quests；金流動作用平實英文。
6. **Mimiku 台詞改寫**：保留笑點與語氣（友善、帶點調皮），不逐字直譯。
7. **長度原則**：先挑短的譯法；按鈕、標題、對話框可以換行；導覽列標籤用短詞、不換行；**不縮小字級，也不允許截斷**。
8. **這輪含後端**（放在 2I-2）：系統分類名稱依語言回傳，順便修 Home「近期分類」顯示英文的問題。
9. **拆兩輪**（如 §0 表格）。

## 1.1 審閱者自行決定的事（附理由）

1. **next-intl v4（^4.15），不使用它的路由功能**（不建 `[locale]` 資料夾、不建 `proxy.ts`）。理由：
   - 語言不進 URL，所以不需要路由；
   - 少一層 proxy，service worker 與 route handler 都不受影響；
   - next-intl 4.15 的 peer 依賴已經包含 `next ^16`，server component 和 client component 共用同一套訊息與 ICU 複數。
2. **語言代碼**：`zh-TW`、`en`；預留 `ja`，但這輪不啟用。
   - 用 `zh-TW` 是為了與後端 `users.locale` 的預設值、taxonomy 的 `translations` 鍵一致。
   - `<html lang>` 另外對照：`zh-TW → "zh-Hant"`（維持現值，中文像素不變）、`en → "en"`、`ja → "ja"`。
3. **Cookie**：名稱 `mimic-locale`，值必須是已啟用的語言之一，`Path=/`、`SameSite=Lax`、`Max-Age` 一年，**不設 HttpOnly**（只是偏好，不是機密）。
   - 沒有 cookie、或值不在啟用清單內（例如這輪的 `ja`）→ 一律 `zh-TW`。
   - **有 cookie 就代表這台裝置做過明確選擇**，第一次造訪不會寫 cookie。§2.6 的同步規則靠這個區分。
4. **日期維持 ISO**（`YYYY-MM-DD`、`YYYY-MM`、`generated_at` 的 `YYYY-MM-DD HH:mm UTC`）。兩種語言都看得懂，中文版也不會變；只有邀請到期時間這一處用 `Intl.DateTimeFormat` 跟著語言切換（2I-2）。
5. **金額**：`formatMinorUnit` 本身不改。語言對 Intl locale 的對照為 `zh-TW → "zh-TW"`、`en → "en-US"`、`ja → "ja-JP"`。實測（Node 22）：
   - TWD：zh-TW 顯示 `-$1,234.50`，en-US 顯示 `-NT$1,234.50`（英文多 `NT`，反而更清楚）；
   - JPY 兩者都是 `¥1,235`；USD 在 zh-TW 是 `US$`、en-US 是 `$`；
   - 三種 locale 的小數位數相同，所以輸入金額的解析不受影響。
   2I-1 先提供 helper，呼叫點都在 2I-2 的頁面裡。
6. **Mimiku 對話框的 speaker**：中文維持「咪咪庫 / Mimiku」，英文顯示「Mimiku」。
7. **不翻的內容**：
   - 產品名 `mimic`、Mimic ID、使用者輸入的資料（寶箱名、標題、備註、自訂分類與標籤）；
   - 導覽 `aria-label="Primary app sections"`（e2e 依賴），以及其他 e2e 依賴的英文 `aria-label`；
   - Zod 的 `*_INVALID` 代碼（內部用，不顯示給使用者）。
8. **sw 離線 fallback 改成中英雙語同一頁**：sw 讀不到 cookie（瀏覽器支援不一致），而且這頁是 build 時產生的單一 HTML。`<html lang="zh-Hant">`，英文段落加 `lang="en"`；2I-b 再加日文段。
9. **舊英文文案以術語表為準**。例如 `app-route-state` 的 "treasury" 改成 Chest 系列用語、"party roster" 改成 Parties 系列用語。
10. **訊息檔放 `web/src/i18n/messages/{zh-TW,en}.json`**，依功能分 namespace。產品程式只能 import `web/` 內的檔案（`web-build-context.test.ts`）。

## 2. 架構

### 2.1 套件與設定
- `web/package.json` 加 `next-intl`（^4.15，鎖在 lockfile）。
- `web/next.config.ts`：用 `createNextIntlPlugin('./src/i18n/request.ts')` 包住 `nextConfig`，再依序套 Serwist、Sentry：`withSentryConfig(withSerwist(withNextIntl(nextConfig)))`。
  - `output: "standalone"`、`--webpack` build 都不變；
  - 兩個 web Dockerfile 都要能 build（§7.1）。
- `web/src/i18n/config.ts`：
  - `SUPPORTED_LOCALES = ['zh-TW','en','ja']`、`ENABLED_LOCALES = ['zh-TW','en']`、`DEFAULT_LOCALE = 'zh-TW'`；
  - `LOCALE_COOKIE = 'mimic-locale'`；
  - `htmlLang(locale)`、`intlLocale(locale)` 對照表（§1.1-2、§1.1-5）；
  - `resolveLocale(value)`：不在 `ENABLED_LOCALES` 就回 `DEFAULT_LOCALE`。

### 2.2 request config
- `web/src/i18n/request.ts`：`getRequestConfig` 讀 `cookies()` 的 `mimic-locale` → `resolveLocale` → 載入對應的訊息檔，並設 `timeZone: 'UTC'`。
  - 2I-1 沒有任何日期格式化，`timeZone` 只是用來避免 next-intl 警告。
- **不讀 `Accept-Language`**。
- route handler 若需要語言（例如回傳使用者可見的文字），用同一個 `resolveLocale` 讀 cookie。目前 route handler 只回代碼，這輪應該用不到；Codex 盤點後在 verification 註明。

### 2.3 根 layout
- `web/src/app/layout.tsx`：
  - `<html lang={htmlLang(locale)}>`；
  - 用 `NextIntlClientProvider` 包住 `children`，只傳 client component 需要的 namespace。若要全傳，在 verification 報告 `en.json` 的大小與首頁 JS 增量。
- `metadata` 改成 `generateMetadata`：
  - `title` 維持 `mimic`；
  - `description` 依語言：中文「mimic 財務空間」、英文 "mimic shared money space"；
  - `/invite/[code]` 的 metadata 同樣處理。

### 2.4 訊息檔與型別
- 結構：`common`、`brand`、`landing`、`auth`、`nav`、`shell`、`settings`、`routeState`、`pwa`、`invite`、`language`。2I-2 再加 `home`、`personal`、`shared`、`pooled`、`settlement`、`taxonomy`、`tasks`、`groups`、`drafts`、`errors`。
- **以 `zh-TW.json` 為型別來源**：透過 next-intl 的 `AppConfig` 擴充 `Messages`，key 打錯就無法通過 typecheck。
- 參數一律用 ICU：
  - 例：`有 {count} 件事等你確認喔。`；
  - 英文複數用 `{count, plural, one {…} other {…}}`。
- **不要用字串拼接組句子**。現有的 `` `${a}：${b}` `` 改成帶參數的訊息。

### 2.5 切換流程
- 新增 `web/src/app/api/locale/route.ts`（`POST`，body `{ locale }`）：
  1. 驗證 `locale` 在 `ENABLED_LOCALES` 內，否則回 400 `LOCALE_UNSUPPORTED`；
  2. 寫 `mimic-locale` cookie；
  3. 若有 session，伺服器端呼叫後端 `PATCH /me { locale }`，沿用現有 `/api/app/me` 的 server API 路徑。**同步失敗不影響切換**：回 200 `{ locale, synced: false }`，畫面不顯示錯誤，錯誤只寫入現有的 log／Sentry；
  4. 沿用現有 mutation route 的 CSRF 檢查方式（Codex 確認現行做法，並在 verification 註明）。
- 共用元件 `web/src/shared/i18n/language-switch.tsx`：
  - 呼叫上面的 route → `router.refresh()`；
  - 切換後，`<html lang>` 與畫面文字不需手動重新整理就要更新。若 `router.refresh()` 無法更新 `<html lang>`，改用 `window.location.reload()`，並在 verification 說明；
  - 進行中按鈕 `aria-busy`、不可重複送出；
  - 完成後焦點留在切換控制項上（reload 的情況除外）。

### 2.6 登入／註冊與帳號同步
- 後端登入回應已經帶 `user.locale`；註冊 DTO 不接受 `locale`（whitelist＋forbidNonWhitelisted），**這輪不改後端**。
- 在 web 的 `/api/auth/login`、`/api/auth/register` route handler，成功後：
  - **裝置有 `mimic-locale` cookie**（明確選擇過）：若與帳號的 locale 不同，伺服器端 `PATCH /me { locale: cookie }`，cookie 維持不變。理由：剛剛在這台裝置做的選擇最新；
  - **裝置沒有 cookie**：若帳號 locale 已啟用，就把 cookie 設成帳號的 locale；否則（例如 `ja`）不寫 cookie，畫面用 `zh-TW`；
  - 註冊：新帳號預設 `zh-TW`；有 cookie 且不是 `zh-TW` 時，比照上面補 `PATCH /me`；
  - 同步失敗不影響登入或註冊結果。
- 登出**不清** `mimic-locale`。

### 2.7 PWA
- `app/manifest.ts`：
  - `lang` 用 `htmlLang(locale)`；
  - `description` 依語言：中文維持「咪咪庫 / Mimiku - 一起存，一起花，一起在異世界探險吧!」，英文 "Mimiku - Save together, spend together, and adventure together in another world!"；
  - `name`／`short_name` 維持 `mimic`；
  - manifest 依 cookie 動態產生；已安裝的 PWA 何時更新 manifest 由瀏覽器決定，這點可以接受。
- `/offline` 頁跟著 cookie 走。
- sw 的 `offlineFallbackHtml` 改雙語（§1.1-8）。`<title>` 維持 `mimic offline`。
- `update-notice.tsx` 的文字進訊息檔。

### 2.8 共用 helper（2I-1 建好，2I-2 使用）
- `web/src/shared/i18n/format.ts`：`useFormatMoney()`（client）／`getFormatMoney()`（server）回傳 `(minor, currency) => formatMinorUnit(minor, currency, intlLocale(locale))`。
- 測試要證明：`zh-TW` 的輸出與現在直接傳 `'zh-TW'` 完全相同。

## 3. 2I-1 檔案範圍

以下檔案裡所有給使用者看的文字都要進訊息檔，包括 JSX 文字、`aria-label`、`title`、`alt`、`placeholder`、`role="status"`／`alert` 的訊息、Zod 的使用者訊息、錯誤代碼對應文字。

- **公開頁**：
  - `app/(public)/layout.tsx`、`page.tsx`、`features/page.tsx`、`privacy/page.tsx`、`terms/page.tsx`、`invite/[code]/page.tsx`；
  - `shared/brand/site-header.tsx`、`landing-stage.tsx`、`landing-interactions.ts`、`landing-room.tsx`、`public-copy.ts`、`brand.ts`；
  - `features/invitations/invite-accept-panel.tsx`、`invite-errors.ts`（公開頁的接受流程會用到）。
- **auth**：`app/(auth)/login`、`register`、`features/auth/auth-form.tsx`、`auth-schema.ts`。
  - Zod 訊息改成 key，在表單層翻譯；或由 schema 工廠接收 `t`。兩種做法擇一，並在 verification 說明選了哪一種。
- **外殼**：
  - `shared/navigation/app-navigation.tsx`：標籤與 `(coming soon)` 的 aria 文字；`aria-label="Primary app sections"` **不變**；
  - `pixel-app-shell.tsx`（浮動鈕「記一筆支出」）；
  - `shared/pwa/update-notice.tsx`、`shared/scene/scene-pause-button.tsx`。
- **設定**：`app/app/settings/page.tsx`、`features/settings/settings-form.tsx`，新增語言區塊（§4.3）。
- **狀態頁**：`shared/ui/app-route-state.tsx`、`app/app/error.tsx`、`not-found.tsx`、`loading.tsx`、`app/app/spaces/[spaceId]/loading.tsx`、`app/global-error.tsx`。
  - `global-error` 在 provider 外面渲染，要自己讀 cookie 載入訊息；做不到時改成中英雙語。
- **API 錯誤 fallback**：`shared/api/errors.ts` 的 `messageForStatus` 是英文。Codex 先查這些 message 是否會出現在畫面上：
  - 會出現的：UI 層改用 `errors.status.<code>` 訊息；
  - 只在 log 出現的：維持英文，並在 verification 列出。
- **PWA**：`app/layout.tsx`、`manifest.ts`、`sw.ts`、`app/offline/page.tsx`。
- **防退化測試**：新增 `web/src/i18n/no-hardcoded-copy.test.ts`，掃描上面這些產品檔案，不得出現 CJK 字元（`぀-ヿ㐀-鿿`）。
  - 白名單只能放：`aria-label="Primary app sections"` 所在行，以及明確標註 `// i18n-exempt: <理由>` 的行；
  - 2I-2 會把掃描範圍擴到整個 `web/src`（測試檔除外）。

## 4. 英文文案與版面

### 4.1 語氣
- 一般 UI：簡潔、口語化的美式英文。按鈕用動詞開頭（"Record expense"），sentence case（只有句首大寫），不使用驚嘆號，Mimiku 台詞除外。
- Mimiku 台詞：第一人稱、友善、帶點調皮，可以改寫，但意思和笑點要保留（§6.3 的草稿）。
- 法律頁殼層（privacy／terms 的 status 文字）照意思翻譯，不改寫。

### 4.2 長度與版面規則
- 導覽列標籤（Home／My Chests／Parties／Quests／Settings）在 360、390、1440 都**不得出現 ellipsis**；e2e 斷言每個 `.label` 的 `scrollWidth <= clientWidth`。若 360 放不下，**停下來回報實測寬度**，不要自行縮小字級。
- 浮動記帳鈕 "Record expense"：360 寬時若需要換行或超出按鈕框，停下來回報（截圖＋實測寬度），不自行改樣式。
- 對話框（Landing PixelDialogue、登入頁）、按鈕、標題、說明文字可以換行，但不得溢出邊框、不得被裁切、不得出現水平捲動。
- **中文版的版面樣式不得改變**：任何為英文加的 CSS 都要限定在 `:lang(en)`，或確認對中文的計算結果完全相同。中文像素必須通過 §7.4。

### 4.3 切換控制項
- **按鈕文字一律顯示「目標語言的名稱」，並以該語言標註**：在中文頁顯示 `English`（`lang="en"`），在英文頁顯示 `中文`（`lang="zh-Hant"`）。不看目前畫面的語言也能找到。
- **site-header**：
  - 放在現有導覽連結（功能／登入或返回基地）的最左側，沿用同一套連結樣式；是 `<button>`；
  - 手機寬度不得把現有連結擠到換行，若會換行就停下來回報；
  - Landing header 以下的像素不得改變。
- **登入／註冊頁**：表單下方，與現有「切換登入／註冊」連結同一區塊，一行小字按鈕。
- **設定頁**：新增「語言 / Language」區塊，用 `fieldset`＋radio：
  - 選項「中文（繁體）」（`lang="zh-Hant"`）、「English」（`lang="en"`）；
  - 選了就立即套用，不需要另外按儲存；
  - 完成後顯示 `role="status"` 訊息（使用新語言），例如「語言已切換為中文。」／"Language changed to English."；
  - 同步帳號失敗時另外顯示一行提示：「只在這台裝置生效，稍後會再同步。」／"Applied on this device only. We'll sync it later."，並在下次登入時依 §2.6 重試。

## 5. 順帶：`latest_recorded` 改必填
- `web/src/shared/api/home-contracts.ts`：`latest_recorded` 移除 `.optional()`，保留 `.nullable()`。
- 刪除 `home-page.tsx` 只為了缺欄位而存在的分支（`null` 的處理保留）。
- 2H 的 e2e「攔截回應並移除欄位」那一案改成斷言**解析失敗會走 Home 的既有錯誤狀態**，或直接刪掉該案（擇一並說明）。
- 依據：2H 的兩次部署 Ed 已在 2026-11-16 確認完成（api＝`1915613`）。

## 6. 術語表（zh-TW／en／ja）

`ja` 欄留空，由 2I-b 填寫並經 Ed 指定的審閱者確認。之後每一輪的新字串都要先對照本表；新術語要先補進本表。2I-b 起把本表搬到 `docs/i18n/glossary.md` 維護。

### 6.1 產品、角色與導覽
| zh-TW | en | ja | 備註 |
|---|---|---|---|
| mimic | mimic | | 產品名，一律小寫、不翻 |
| 咪咪庫 / Mimiku | Mimiku | | speaker、字標副標、頁尾：英文只顯示 Mimiku（2R5） |
| 一起存，一起花，一起在異世界探險吧! | Save together, spend together, and adventure together in another world! | | tagline |
| 首頁 | Home | | 導覽 |
| 我的寶箱 | My Chests | | 導覽 |
| 共同群組 | Parties | | 導覽 |
| 任務 | Quests | | 導覽；單筆為 quest |
| 設定 | Settings | | 導覽 |
| 功能 | Features | | site-header |
| 登入／註冊／登出 | Log in / Sign up / Log out | | 動詞用兩個字 |
| 開始冒險 | Start adventure | | Landing CTA |
| 返回基地 | Back to base | | 已登入 CTA |
| 返回基地（site-header） | Base | | 2R4：header 寬度限制 |
| 往左探索／往右探索 | Explore left / Explore right | | aria-label |
| 語言 | Language | | |

### 6.2 寶箱、群組與金流
| zh-TW | en | ja | 備註 |
|---|---|---|---|
| 寶箱 | chest | | 財務空間的統稱 |
| 個人寶箱 | Personal chest | | 模式：個人 Personal |
| 共同分帳寶箱 | Shared chest | | 模式：共同支出 Shared expenses |
| 共同基金寶箱 | Fund chest | | 模式：共同基金 Pooled fund |
| 群組 | party | | UI 用語；網址與程式碼仍是 group |
| 成員 | member | | |
| 支出 | expense | | |
| 記一筆支出 | Record expense | | 浮動鈕、個人頁 |
| 新增共同支出 | Add shared expense | | |
| 新增基金支出 | Add fund expense | | |
| 付款（人） | Paid by | | |
| 分攤 | Split / share | | 動作用 split，各人份額用 share |
| 分帳 | Split | | |
| 代墊 | Paid on behalf | | 動詞可用 front（"fronted by Amy"） |
| 投入 | Contribution / contribute | | 共同基金入金 |
| 投入排程 | Contribution schedule | | |
| 資金缺口 | Shortfall | | |
| 補足 | Top up | | |
| 結算 | Settle up（動作）／Settlement（名詞） | | |
| 結清 | Close out | | 生命週期：結清中 Closing out、已結清 Closed out |
| 退回（基金退回） | Return | | 結清時退回的款項 |
| 更正 | Correction | | 鎖定後用新交易更正 |
| 鎖定 | Locked | | |
| 封存 | Archive / archived | | |
| 帳本 | ledger | | |
| 加入我的帳本 | Add to my ledger | | 私人參照 |
| 分類／標籤 | Category / Tag | | |
| 未分類 | Uncategorized | | 系統分類以後端 translations 為準 |
| 本月支出 | Spent this month | | |
| 近期分類 | Top categories | | |
| 最近 | Latest | | Home 卡片 |
| 狀態時間 | As of | | 後接 ISO 時間 |
| 草稿 | Draft | | |
| 離線 | Offline | | |
| 邀請／邀請碼 | Invite / Invite code | | |
| Mimic ID | Mimic ID | | 不翻 |

### 6.3 狀態標籤（2G 定）
| zh-TW | en | ja |
|---|---|---|
| 進行中 | In progress | |
| 已完成 | Completed | |
| 已取消 | Cancelled | |
| 待付款 | To pay | |
| 已付款 | Paid | |
| 待收款 | To receive | |
| 已收款 | Received | |

### 6.4 Mimiku 台詞草稿（改寫，供審閱）
| 位置 | zh-TW | en |
|---|---|---|
| Landing 寶箱打開 | 那是普通的寶箱，不是我親戚喔！ | That's just a regular chest. No relation, I promise! |
| Landing 寶箱關上 | 還是蓋好比較安心。 | Better keep the lid on. Feels safer. |
| Landing 刻痕 | 這是⋯⋯很久以前的我？原來早就有冒險者陪著我了。 | Is this… me, long ago? Guess I've had adventurers with me all along. |
| Landing 蝙蝠 | 噓——牠們白天在睡覺啦。 | Shh — they sleep during the day. |
| Landing 火把 | 小心火！我可是木頭做的⋯⋯ | Careful with the fire! I'm made of wood, you know… |
| Landing 物件名 | 舊寶箱／岩壁上的刻痕／蝙蝠／火把 | Old chest / Wall carving / Bats / Torch |
| Home 離線（2I-2） | 現在離線，我先幫你看著最後的狀態。 | We're offline. I'll keep watch over the last update for you. |
| Home 空（2I-2） | 這裡還空空的，先建立一個寶箱吧！ | It's empty in here. Let's make your first chest! |
| Home 待辦（2I-2） | 有 {count} 件事等你確認喔。 | `{count, plural, one {# quest needs} other {# quests need}} your OK.` |
| Home 一般（2I-2） | 今天要記點什麼嗎？ | Anything to record today? |

功能頁四張卡片的英文標題：共同基金 Pooled funds／出資紀錄 Contribution records／支出分帳 Split expenses／結算鎖定 Settlement lock。內文由 Codex 依本表翻譯，小德審閱。

## 7. 驗證

### 7.1 基線與指令
- 基線：`1915613` 的乾淨 worktree（`.tmp/`）。
- web 跑 `npm run lint`、`typecheck`、`npm test`、`build`、`test:e2e`；backend 這輪沒有變更，但仍要跑 CI 的 Backend job 步驟，確認全綠。逐項標明失敗是「既有」還是「本輪造成」。
- **Linux**：WSL Docker `node:22`，`core.autocrlf=false` 乾淨 checkout 候選樹，跑 CI 四個 job（Active Mimic naming、Backend、Web PWA、Production containers）的步驟。`web/Dockerfile` 與 `web/Dockerfile.railway` 都要 build、以 `node` 執行並通過 `/api/health/live`，並在容器內實測：
  - `GET /` 不帶 cookie → `<html lang="zh-Hant">`；
  - 帶 `mimic-locale=en` → `lang="en"`。
- 這輪後端合約不變（`latest_recorded` 只是 web 端由 optional 改必填，後端已經在回傳），**只有一個樹、一次 push**。另外實際跑一次新 web 接 `1915613` 的 API，確認 Home 能正常解析。
- real-backend 只用 `127.0.0.1` 專用 DB。
- 產品程式不得 import `web/` 以外的檔案。
- Vitest 用預設設定（20 秒逾時）全套跑，不要同時跑多套 Playwright。

### 7.2 Vitest（新增）
- **訊息一致性**：`en.json` 與 `zh-TW.json` 的 key 集合完全相同；每個 key 的 ICU 參數名稱集合相同；沒有空字串。
- `resolveLocale`、`htmlLang`、`intlLocale` 的對照（含 `ja`、亂值、缺值 → `zh-TW`）。
- `request.ts`：沒有 cookie → `zh-TW`；`en` → `en`；`ja` → `zh-TW`。
- `/api/locale`：400、寫 cookie、有 session 時呼叫 `PATCH /me`、同步失敗仍回 200 且 `synced:false`。
- 登入／註冊同步的四種情況（有或沒有 cookie × 與帳號 locale 相同或不同），加上帳號是 `ja` 的情況。
- `useFormatMoney` 在 `zh-TW` 下與直接呼叫 `formatMinorUnit(…, 'zh-TW')` 逐字相同；`en` 下的 TWD 為 `NT$`。
- `no-hardcoded-copy.test.ts`（§3）。
- 既有含中文斷言的單元測試：預設 `zh-TW`，**不改斷言**；需要 provider 的測試用共用 render helper 包 `NextIntlClientProvider`（zh-TW）。

### 7.3 e2e（新增 `web/e2e/i18n-phase-2i.spec.ts`）
- 沒有 cookie 造訪 `/` → 中文、`lang="zh-Hant"`、沒有 `mimic-locale` cookie。
- site-header 按 `English` → 不需手動重新整理就變英文、`lang="en"`、cookie=`en`；重新整理後仍是英文；`/features`、`/privacy`、`/terms`、`/invite/<code>` 都是英文；按 `中文` 切回。
- 登入頁、註冊頁的切換按鈕可用；英文下 Zod 驗證錯誤是英文。
- real backend：
  - cookie=`en` 時登入 → 後端 `users.locale` 變成 `en`；
  - 新的 browser context（沒有 cookie）登入同一帳號 → cookie 被設成 `en`，App 外殼是英文；
  - 在設定頁選「中文（繁體）」→ 帳號變回 `zh-TW`，`role=status` 顯示中文訊息。
- 英文下 `/app` 在 360、390、1440：導覽五個標籤沒有 ellipsis（§4.2），浮動鈕文字完整。
- `/manifest.webmanifest`：沒有 cookie → `lang` 為 `zh-Hant`；cookie=`en` → `lang` 為 `en`，description 為英文。
- sw 離線 fallback 同時含中英兩段。
- 鍵盤操作：Tab 到切換按鈕、Enter 切換後，焦點仍在控制項上（設定頁 radio 同理）。
- **既有 2A–2H e2e 全部不改即可通過**（預設中文）。

### 7.4 中文像素回歸（容差 0，與 `1915613` 比對）
- **Landing**：11 個尺寸 header 以下逐像素相同。header 本身因為多了 `English` 按鈕，預期只有 header 列不同；提供 before／after 截圖與差異遮罩，並註明差異範圍只在 header 列內。
- **Home**：11 個尺寸 × empty／ready／offline，整頁（含頂欄、導覽列、浮動鈕區）逐像素相同。
- **三種寶箱頁**：沿用 2H 的 33 張，整頁逐像素相同。
- 允許因動畫時機重拍（比照 2F–2H），並在 verification 註明哪些是重拍。
- 中文版**有預期變化**的頁面：設定、登入、註冊、狀態頁、`/invite/<code>`、`/offline`。只要 before／after 截圖，不做像素比對。

### 7.5 英文截圖（360×800、390×844、1440×900）
- Landing：初始畫面；手機三段各一張；五句台詞在 360 與 1440 各一張。
- `/features`、`/privacy`、`/terms`、`/invite/<code>`（有效、無效）。
- 登入、註冊（含驗證錯誤）。
- `/app` 外殼（Home 頁，內容仍是中文屬預期）、設定頁（含語言區塊、切換成功的 status）。
- `app-route-state` 的錯誤、找不到、載入狀態；`global-error`；`/offline`；更新通知。
- 檔名：`<頁面>-<狀態>-en-<寬>x<高>.png`；中文 before／after 用 `-zh-before`／`-zh-after`。

### 7.6 交付
- `docs/design/assets/reviews/2026-11-16-phase-2i/`：
  - `verification.md`：架構與檔案清單；訊息 key 數（每個 namespace）；§2.2、§2.5、§3 要求註明的事項；Linux／Docker 結果；Vitest 與 e2e 結果；回歸結果；英文截圖清單與發現的版面問題；測試修改清單；未完成事項；
  - `screenshots/`。
- `.agents/devlog.md` 追加一筆（CRLF）。
- **停在視覺審核**：不要 commit、不要 stage。

## 8. commit 與 push（小德執行，Ed push）
1. `feat(web)`：§2–§5 全部 → 只動 `web/`。
2. `docs(visual)`：spec、verification、截圖、devlog、decision-log → 只動 `docs/`、`.agents/`。
- 一次 push：`git push origin main`。Railway 只會重新部署 web。
- 部署後小德確認：`/sw.js` 的 build id 改變；沒有 cookie 的 `GET /` 是 `lang="zh-Hant"`；帶 `mimic-locale=en` 是 `lang="en"`；chunk 裡有新字串。

## 9. 2I-2 大綱（2I-1 核准後補完整規格）
- **web**：§3 以外所有含中文或英文的產品檔案，依 2026-11-16 盤點約 450 個字串：
  - pooled-workspace 98、personal-page 50、shared-workspace 36、shared-expense-form 31、settlement-panel 28、home-page 26、lifecycle 25、task-center 24 等；
  - 群組與 App 內邀請的英文；
  - `formatMinorUnit` 的 11 個呼叫點改用 `useFormatMoney`；邀請到期時間跟著語言；
  - `no-hardcoded-copy` 掃描擴到整個 `web/src`。
- **後端**（web 先 push、後端後 push；合約欄位不變）：
  - taxonomy API 沒帶 `locale` 時改用 `users.locale`（目前預設 `zh-TW`）；
  - Home `recent_categories` 改用 `termName(locale)`，修正中文使用者看到「Food」的問題；
  - 個人頁的分類名稱維持現行做法；
  - `UpdateMeDto.locale` 改成 `@IsIn(['zh-TW','en','ja'])`。
- **語言切換後的分類名稱**：Home、記帳頁都是 server 端載入，切換後 `router.refresh()` 就會依新的 `users.locale` 重抓。前提是 §2.5 的同步成功；同步失敗時分類名稱會暫時沿用帳號原本的語言，屬可接受的降級。
- **截圖**：Home、三種寶箱（含各種彈窗與面板）、任務、群組，英文三種寬度；中文 Home 與三種寶箱逐像素回歸。

## 2R（2026-11-16，Codex 實作前停止點；審閱者決定）

1. **既有 e2e 的英文可及名稱**：§1-4 把寫死英文的頁面改成中文後，凡是用這些英文字找元素的既有斷言（例如 `navigation-phase-2d.spec.ts` 的 `Settings` 標題、`pixel-responsive.spec.ts` 的 `Log in to accept` 連結），**只能把名稱改成對應的中文**。測試情境、步驟、其他斷言、所有中文斷言與 `Primary app sections` 都不得改動。§7.3「既有 e2e 不改即可通過」的範圍據此縮小：只有因 §1-4 中文化而失效的英文名稱可以改。verification 要逐條列出（檔案:行、舊名稱 → 新名稱、對應的訊息 key）。理由：這些名稱本來就來自可見文字，改成中文是 Ed 的決策直接造成的結果，不是行為改變。
2. **`latest_recorded` 的 2H 相容性案例**（`home-ledger-trigger-phase-2h.spec.ts` 第 158 行附近，原本接 `8089cc6` API、驗證缺欄位時 Home 仍能載入）：改成攔截 `/api/app/home` 回應並移除欄位，斷言 Home 進入既有的錯誤狀態（不是空白頁、不是未處理的例外），而且不寫 `mimic.home.latest-recorded.*`。另外依 §7.1 實際接 `1915613` API，確認欄位存在、Home 正常、ledger 規則與 2H 相同。§5 原本的「或直接刪除該案」選項取消。理由：必填之後，缺欄位就是合約錯誤，應該走錯誤路徑；舊 API 已不在部署範圍。

## 2R2（2026-11-17，攔截點修正；審閱者決定）

2R-2 指定的攔截點不可行：`/app` 由 server 端 `loadHome()` 直接讀後端 `/api/v1/home` 並在同一路徑驗證（交接文件已註明「瀏覽器攔截不到」），`/api/app/home` 是獨立的 BFF 路由。改為：

- 在 `web/e2e/helpers/` 建立**測試專用的本機 HTTP 代理**（只綁 `127.0.0.1`），轉送到 `1915613` API，只在該測試案例中移除 `/api/v1/home` 回應裡每張卡片的 `latest_recorded`，其他請求與回應原樣轉送。
- 只有這個案例的 web server 指向代理（用既有的後端 base URL 環境變數，例如獨立的 Playwright project 或 webServer 設定）；其他測試照舊直連 API。**產品程式不得為此新增任何測試用分支或設定。**
- 斷言：Home 進入既有錯誤畫面；頁面沒有未處理的例外（`pageerror` 為 0）；`mimic.home.latest-recorded.*` 沒有被寫入。
- 正常 Home 與 ledger 行為照 2R-2 直連 `1915613` API 驗證。
- 代理的檔案、使用的環境變數與啟動方式寫進 verification。

## 2R3（2026-11-17，公開頁手機 header；Ed 決定）

預檢（verification「Landing header 預檢」）：加入語言按鈕後，360 px 四種組合單行，390 px 四種組合都換行（中文「功能」「登入」直排，英文 Back to base 三行）。

1. **延伸緊湊版，斷點實測（Ed 決定）**：只把 `hero.module.css` `@media (max-width: 380px)` 裡**屬於 header 的規則**（`.brandLink` 副字標隱藏、`.siteNav` gap、`.navActions` gap、`.navLink` 的 min-height／padding／font-size）抽到新的 media query，斷點設為「完整版 header 在四種組合（中／英 × 未登入／已登入）都單行」的最小實測寬度，向上取整到 4 px 的倍數。
   - 量測至少涵蓋 390、393、412、414、430，以及找出的斷點前後各 1 px，記在 verification；
   - `.title` 與 `.primaryAction` **留在原本的 380 px 區塊**，Landing header 以下的像素不變（§7.4）；
   - header 高度不變；字級只沿用既有的緊湊值，不另外縮小；文案不變。
2. **360 px 餘裕（Ed 決定先量再定）**：英文已登入在 Chrome＋Arial 只剩 1.3 px。請在 Linux（沒有 Arial）或指定 `font-family` 為 Roboto、Liberation Sans 各量一次 360 px 四種組合。任一組合的餘裕 < 8 px 或換行，就停下來回報量測與截圖，由 Ed 決定是否縮短文案；不要自行改文案或樣式。
3. 中文 header 在斷點範圍內也會隱藏副字標「咪咪庫 / Mimiku」，屬於 header 列的預期差異，列入 §7.4 的 header before／after。

## 2R4（2026-11-17，320 px header；Ed 決定）

2R3 量測結果：完整版 header 在 542 px 起四組皆單行，緊湊斷點定為 **544 px**；360 px 在 Roboto（最小餘裕 44.16 px）與 Liberation Sans（33.38 px）下皆單行。320 px（既有 Landing e2e 涵蓋）英文已登入時，導覽內寬 288 px、需要 326.70 px，「中文」與 Back to base 都換行。

1. **英文 site-header 的「返回基地」一律顯示 `Base`**（所有寬度；用獨立訊息 key，例如 `nav.header.base`）。Landing CTA、其他位置仍是 `Back to base`。中文不變。
2. 術語表 §6.1 補一列：返回基地（header）→ Base。
3. 重新量測 320／360／390／544±1 px 的英文已登入組合：都要單行，320 px 餘裕至少 8 px（Arial、Roboto、Liberation Sans 各一次）。仍不足時停下來回報。

## 2R5（2026-11-17，審閱後補件；Ed 決定＋審閱者決定）

Ed 已核准英文畫面與中文 Landing header 的變化，條件是補齊下列兩項。

1. **字標副標（Ed 決定）**：英文模式下，App 頂欄與公開頁 header 的 wordmark 副標「咪咪庫 / Mimiku」改成 `Mimiku`，與頁尾、對話框 speaker 一致；中文不變。術語表 §6.1「咪咪庫 / Mimiku」列的備註改為「speaker、字標副標、頁尾：英文只顯示 Mimiku」。重拍英文 `home-shell`、`landing-initial`、`settings-default` 三種寬度，並確認 544 px 斷點內外 header 仍單行（副標在緊湊版本來就隱藏）。
2. **三種寶箱頁中文像素回歸（審閱者決定）**：2H 的原圖沒有交付，改成與 Home 相同的做法，用乾淨 `1915613` 的 production build 與候選 build，在同一個 `1915613` API、同一份測試資料、同一個 Chrome 下兩邊都拍：個人、分帳、基金三頁 × 11 個尺寸＝33 張整頁，容差 0，可比照 2F–2H 因動畫時機重拍並註明。若有差異，提供遮罩並停下回報。
3. 中文 Home 44 張與 Landing header 以下 11 張在第 1 項之後重跑一次，確認仍相同。

## 待辦
- 2I-2（§9）；2I-b 日文；術語表搬到 `docs/i18n/glossary.md`。
- 之後每一輪的新字串都要同時提供 zh-TW／en（2I-b 起加 ja），並通過訊息一致性測試。
- 公會 Phase 排在 2I-2 之後。

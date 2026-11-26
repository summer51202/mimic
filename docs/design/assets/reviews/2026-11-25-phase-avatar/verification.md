# Phase Avatar 驗證｜2026-11-26

- spec：`docs/superpowers/specs/2026-11-25-phase-avatar-design.md`
- 像素回歸：`docs/design/pixel-regression-standard.md`
- 基線：`e1a3e4f`（`origin/main`）。乾淨 worktree `.tmp/avatar-base-e1a3e4f/`，production build。
- 狀態：**未 commit、未 stage，停在視覺審核。**

## 1. 實作決定（spec 要求寫進 verification 的項目）

| 項目 | 決定 | 理由 |
|---|---|---|
| 資料表 | spec 寫的 `users` 實際是 Prisma model `User` 的實體表 `"User"`（沒有 `@@map`），migration 照實際名稱寫 | migration-contract 既有規則禁止出現 `"users"` |
| `avatar_class` 型別 | `VARCHAR(20)` 加 CHECK `User_avatar_class_check`（8 個值或 NULL），不用 Prisma enum | 之後加職業只要新 migration 改 CHECK；Postgres enum 加值不能放在 transaction 內 |
| `avatar_prompt_dismissed_at` | `TIMESTAMPTZ(6)` nullable；`PATCH /me { avatar_prompt_dismissed: true }` 每次寫入當下時間 | spec 只需要 boolean，回應是 `avatar_prompt_dismissed = (欄位 != null)` |
| `PATCH /me` 驗證 | `avatar_class`：8 值之一，`null`、大小寫不符、其他值都回 400；`avatar_prompt_dismissed`：只接受 `true` | 照 spec §3.2；省略表示不變 |
| web 合約 | `avatar_class` 欄位缺少時保持 `undefined`（舊 API），`null` 或這版不認得的值視為「未選」 | spec §3.3；三種狀態要分開，舊 API 才不會出現提示或設定區塊 |
| 舊 API 時的設定頁 | `/me` 沒有 `avatar_class` 欄位時**不顯示**職業區塊 | 舊 API 會靜默丟掉 PATCH 的未知欄位，按「決定」看似成功卻沒儲存；不顯示比顯示一個無效入口誠實。新 web 接舊 API 時設定頁和基線零差異 |
| Home 讀 `/me` | `loadHomeAvatar()` 與 `loadHome()` 並行；`/me` 讀取失敗只少了角色與提示，不會讓 Home 失敗（框架的 redirect 仍往上拋） | spec §3.2「Home 不改 API」 |
| 首次提示的 X／Esc | 只關閉這一次，不寫入伺服器，下次進 Home 會再出現；只有「之後再說」寫入 `avatar_prompt_dismissed` | spec 只定義兩個按鈕的行為；X 是 PixelDialog 內建的關閉 |
| Home 角色縮放 | 8 個 192×192 master 的不透明範圍（`avatarFullBounds`，測試逐張比對 PNG）對到 `layout.json` 的 slot 方框，用 `background-size／position` 繪製，繼承場景的 `image-rendering` | 見 §6 待審事項 1 |
| 手機卡片避讓 | 有職業時，手機版卡片的「下一個內容頂端」加入角色 slot 的 `y`（247），卡片太高時改走 flow，不會壓到角色 | spec §4.2 safe zone；沒有職業時計算和現在完全相同 |
| 名單未選職業 | 48 px 虛線空位 `aria-hidden`，替代文字 `{name}（尚未選擇職業）` 放在同一列的視覺隱藏文字 | spec 同時要求空位 `aria-hidden` 和這段 alt；舊的 4 張頭像檔案保留未刪 |
| 彈窗置中 | picker 的 CSS module 補 `margin: auto; max-height: calc(100dvh - 2rem); overflow: auto` | 全域 reset `* { margin: 0 }` 會清掉 dialog 的置中；個人、分帳、基金頁的彈窗都是同樣寫法。第一版漏了，1440 寬時彈窗貼左上，已修正並重拍 |
| 字串 | `common` 沒有「取消」「之後再說」「決定」這類 key（三語全文搜尋），19 個都新增在 `avatar` 命名空間；中文既有字串無變動 | spec §6 |
| client 訊息 | `src/app/layout.tsx` 把 `avatar` 加進 `NextIntlClientProvider` | 少了會在瀏覽器出現 `MISSING_MESSAGE: avatar`（實測時發現並修正） |

`groups.avatar`（`{name}的頭像`）已不再使用，依「中文既有字串逐字不變」保留，下一輪和舊頭像檔一起清理。

## 2. 測試數

| 範圍 | 結果 |
|---|---|
| 後端 unit（`npm test`） | 39 suites、352 tests 通過 |
| 後端 HTTP（`test:e2e`） | 5 suites、54 tests 通過（含 `PATCH /me` 8 個職業、7 種 400、成員名單 `avatar_class`） |
| `test:migration-only-db` | 2 suites、14 tests 通過（新增 `user-avatar-migration.e2e-spec.ts`：CHECK、跨請求持久化、名單） |
| `test:spaces-db` | 20 suites、156 tests 通過 |
| migration contract | 新 migration 只加兩個 nullable 欄位與 CHECK，且是最新一個；`prisma migrate diff` 對 `User` 無差異 |
| web lint／typecheck | 0 錯誤（2 個既有 warning）／通過 |
| web Vitest | 140 files、759 tests 通過（含 `messages.test.ts`、`no-hardcoded-copy.test.ts`、兩套素材契約） |

CI（WSL Docker `node:22`）：見 §5。

## 3. 新 web 接舊 API（`e1a3e4f` 後端）

候選 web（port 3665）接基線 API（3661）。四種使用者 × 三語 × 320／1440，共 24 組，全部通過（`.tmp/avatar/oldapi-result.json`）：

- Home：沒有提示（包括「未選且未跳過」的新人），沒有角色圖層；
- 設定頁：沒有職業區塊；
- 名單：4 人全部是中性空位，沒有任何頭像圖；
- 無 console error、無 4xx／5xx；
- 對舊 API 送 `PATCH /me { avatar_class }` 回 200，舊 API 把欄位剝掉，資料不變，回應也沒有新欄位（web 因此不顯示設定入口，見 §1）。

像素上也成立：A 組（候選 web 對基線 web，兩邊都接基線 API）所有頁面除了名單頭像外零差異，見 §4。

## 4. 像素回歸

環境依標準 §1：
- 同一個 PostgreSQL（`127.0.0.1:25461`，15 個 migration），同一份測試資料，同一個 Chrome，軟體繪製旗標全加；
- 三語（cookie `mimic-locale`）× 6 個視窗（320×568、360×800、390×844、768×1024、1024×768、1440×900）；
- 頁面：landing、login、register、Home、Home（群組）、我的寶箱、群組列表、群組詳情（名單）、任務、設定、4 個寶箱（更正、結算、基金、結清中）。

測試資料（`web/scripts/demo-data.mjs` 加上 `.tmp/avatar/setup-users.mjs`）：

| 使用者 | 狀態 |
|---|---|
| 展示隊長 | 未選、已跳過（零差異使用者） |
| 展示夥伴 | 已選（預設 bard；審閱截圖時輪流換 8 個） |
| 展示新人 | 未選、未跳過（首次提示） |
| 展示醫者 | 已選 physician，未跳過 |
| 名單 | 上面 4 人：2 人已選、2 人未選 |

| 組 | 使用者 | 格數 | 完全相同 | 只有預期差異 | 失敗 |
|---|---|---:|---:|---:|---:|
| A：基線 web vs 候選 web（都接基線 API） | 隊長 | 252 | 234 | 18（名單） | 0 |
| A | 新人 | 72 | 54 | 18（名單） | 0 |
| B：候選 web 接基線 API vs 接候選 API | 隊長 | 252 | 216 | 36（名單、設定） | 0 |
| B | 夥伴 | 72 | 0 | 72（Home、群組 Home、設定、名單） | 0 |
| B | 新人 | 72 | 36 | 36（名單、設定） | 0 |

（B 組夥伴、新人只跑 Home、群組 Home、設定、名單；其他頁兩邊是同一份候選 web，API 只差頭像欄位，隊長的全頁矩陣已涵蓋。彈窗 CSS 修正後，這四頁在最終建置上全部重跑。）

判定方式：
- **零差異使用者**：隊長在 A、B 兩組都是除名單（A）與名單、設定（B）以外所有頁面整頁 RGBA 相同。A 組的設定頁也相同（舊 API 不顯示職業區塊）。
- **預期差異頁**都滿足：E 以外像素 0 差異（容差 0）、候選不溢出、DOM 文字序列在移除預期新增字串後完全相同。
  - **名單**：E＝每列的 48 px 頭像或空位（高度不變）。新增文字只有視覺隱藏的 `{name}（尚未選擇職業）`；其餘差異只是前面插了一個節點造成的兄弟索引位移。
  - **設定頁**：E＝新的職業區塊，插在身分區塊之後。沒有該區塊的一側在身分區塊的 `margin-bottom` 加 Δ（`calc(<原值> + Δpx)`）。下一個元素頂端誤差 ≤ 1/64 px、頁高相同，18 格都對齊。Δ：320 寬 262–266 px、360／390 寬 226–230 px、768 以上 170–174 px。
  - **Home（夥伴）**：E＝角色圖層，頁高不變，E 以外 0 差異；卡片沒有因為角色改走 flow。
  - **Home（新人）**：候選端 36 格都出現提示（標題正確、彈窗與頁面無橫向溢出）。記錄後用 X 關閉（不寫入伺服器），關閉後整頁和接舊 API 的一側 0 差異。接舊 API 的一側 0 格出現提示。
- **fixed／sticky 元素**（頂欄、桌機側欄、底部導覽、記帳鈕）：除了下面這 18 格，其餘都在整頁截圖裡和 E 的重疊 ≤ 25%，而且像素相同。
  - 例外：設定頁 320／360 寬，底部導覽或記帳鈕和職業區塊重疊 29.5–76.5%。依標準 §5.4 補拍視窗截圖：捲到最大捲動位置時重疊 0%，遮罩內 0 差異，三位使用者 18 格都通過（`evidence-B-*.json` 的 `fixedSupplement`）。
- **asOf**：Home、任務頁成對連拍，UTC 秒數 ≥ 40 時等下一分鐘。B 組任務頁 ja 1440 第一次跨分鐘（02:16／02:17），擷取腳本的 asOf 讀取漏抓任務頁的時間，所以沒有自動重拍。修正讀取後重拍，兩邊同為 02:19，0 差異。

重拍紀錄（環境問題，非產品差異）：
- A 組 `chest-pooledActive-ja-768x1024`：候選那次擷取時瀏覽器短暫判定離線，頁面多了離線提示（頁高 2530／2645）。重拍後 0 差異。
- 日文第一次中斷於 360×800 設定頁：測試帳號 access token 在長時間的格子裡過期（兩邊同時 `SESSION_REQUIRED`）。擷取腳本改為每頁前重新登入，從中斷處續跑。
- 02:20 基線 API 有一次 Prisma transaction 逾時（同時跑三組擷取加 CI，負載過高），出現在 Home 第一格的 console。該格重新載入後像素相同。

## 5. CI（WSL Docker `node:22`）

兩棵樹都以 `git -c core.autocrlf=false archive e1a3e4f`（與 GitHub checkout 相同的 LF 位元組）為底，疊上本輪檔案：
- 只有 web：133 個檔案（web、docs、素材、審閱資料夾、devlog）；
- 全部：148 個檔案（再加 15 個後端檔案）。

| job | 只有 web | 全部 |
|---|---|---|
| naming | 通過 | 通過 |
| backend（build、unit、HTTP e2e） | 通過（基線後端） | 通過 |
| backend-db（migrate deploy 後 migration-only、spaces-db） | 通過：8＋156 tests（基線） | 通過：14＋156 tests（含新 migration） |
| web（CI workflow 合約、lint、typecheck、Vitest、build） | 通過：140 files、759 tests | 通過：140 files、759 tests |
| containers（映像契約、backup、API／Web health、`web/Dockerfile`） | 通過，API 與 Web health 都 ok | 通過，API 與 Web health 都 ok |
| 第二個 web Dockerfile（`web/Dockerfile.railway`） | 建置成功 | 建置成功 |

兩棵樹都是在彈窗置中修正之後的最終內容上跑的。

註：
- 這台 Windows 的 git 設定 `core.autocrlf=true`。直接從新 worktree 或預設 `git archive` 取檔會變成 CRLF，素材雜湊測試會因此失敗 10 項。改用 `core.autocrlf=false` 匯出後消失，與程式碼無關。
- Docker build 內的 `npm ci` 在這台機器的網路上偶爾 ECONNRESET／ETIMEDOUT。腳本只對 `docker build` 重試，檢查本身不重試。

## 6. 待審事項

1. **Home 角色是非整數倍縮放。** 已核准的 full master 是 192×192（不透明範圍約 120×168），`layout.json` 的 slot 是 1× 場景像素（手機 84–95×119、桌機 96–119×149–150）。
   - 所以手機版也是約 0.71 倍的 nearest-neighbor 縮小，桌機再乘上場景的非整數倍率。
   - spec §4.2 寫「1× master，手機整數倍」，現有素材做不到這一點，除非另外輸出 1× 場景用的角色圖（等於新素材，依 spec §5 要由 Ed 決定）。
   - 8 個職業的實際效果見 `home-all-classes-390-mosaic.png`。
2. **slot 寬度和 master 比例差 ≤ 2%。** slot 方框來自另一份 512 master 的取樣。目前把 192 master 的不透明範圍拉伸到 slot 方框（例如 warrior 寬 108.2 → 107），保證位置與 safe zone 和已核准的 layout 一致。
3. **矮視窗的彈窗會在內部垂直捲動。** 320×568、360×800、英文 390×844 的內容高度大於視窗（例如日文 320：827／536）。
   - 寬度都不溢出，按鈕在捲動後可見。
   - 開啟時焦點在 X，320 寬時 X 的焦點框會出現在截圖中。

## 7. 其他檢查

- **safe zone 重疊掃描**：8 職業 × 三語 × 高度 568／800／1080 × 寬度 320–1920（每 16 px），共 7272 次量測。
  - 角色框和卡片、對話框、Mimiku、火堆的 DOM 矩形交集都是 0，也沒有被場景裁切。
  - 繁中、英文 4848 次見 `.tmp/avatar/overlap.log`，日文 2424 次見 `overlap-result-ja.json`。
- **溢出檢查**：三語 × 6 視窗。提示彈窗、設定頁、名單、Home 都沒有橫向捲動，職業名稱與按鈕沒有截斷（`.tmp/avatar/overflow-result.json`）。
- **素材**：`npm run assets:promote -- --phase-avatar` 推廣 16 張，SHA-256 與 manifest 相符。manifest 只改 16 筆的 `disposition`（`promoted-phase-avatar`）與 `runtime_target`。
- **顏色**：選中格是 2px `#b79556` 加 `--mimic-color-surface` 底。亮金只有「決定」；「之後再說」「取消」「更改職業」都是 secondary。

## 8. 審閱截圖（本資料夾）

全部是候選 web 接候選 API，未墊高的原圖；三語 × 320／390／1440。

| 檔名 | 內容 |
|---|---|
| `prompt-{locale}-{w}.png` | 首次提示（未選），視窗截圖 |
| `prompt-selected-{locale}-{w}.png` | 同上，選中吟遊詩人（黃銅框） |
| `home-{warrior,bard,physician}-{locale}-{w}.png` | Home 角色，整頁 |
| `home-all-classes-390-mosaic.png` | 8 職業 Home（繁中 390×844 視窗）。上排左到右：warrior、mage、ranger、rogue；下排：alchemist、bard、cartographer、physician |
| `settings-chosen-{locale}-{w}.png` | 設定頁，已選（夥伴） |
| `settings-none-{locale}-{w}.png` | 設定頁，未選（隊長） |
| `settings-change-dialog-{locale}-{w}.png` | 設定頁開啟的更改彈窗（「取消」取代「之後再說」） |
| `roster-mixed-{locale}-{w}.png` | 群組名單，2 人已選、2 人未選 |
| `evidence-*.json` | 五組回歸的每格證據：E rect、墊高、fixed 遮罩與重疊比例、差異數與 bbox、asOf |
| `pixel-regression-sha256.txt` | 所有成對截圖（含相同的）的 SHA-256；檔案在 `.tmp/avatar/<組>/png/`，不進 git |

整頁截圖中的頂欄、底部導覽、記帳鈕是 fixed 元素，會停在第一個視窗的位置，這是整頁擷取的特性，不是版面問題。

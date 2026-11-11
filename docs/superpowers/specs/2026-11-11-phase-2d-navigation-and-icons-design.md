# Phase 2D：導覽列與圖示

日期：2026-11-11。狀態：待 Codex 實作，停在視覺審核。

依據：Phase 2A／2B（Landing）、2C（Home）已核准，見 decision-log 2026-11-10、2026-11-11。對話框色票（`--mimic-color-dialogue-*`）與「低調黃銅＋暗鐵，亮金只給主要 CTA」的金屬規則沿用 2A。圖示素材與 hash 以 `docs/design/assets/approved/page-visual-v1/production-asset-manifest.json` 為準（Icons 校準見 decision-log「Approved Icons optical evidence — 2026-10-01」）。

## 0. Ed 已定的決策（2026-11-11）

1. **hud-dark 全站改暖褐**：`--mimic-color-hud-dark` 的全站值改為 `#211a18`（等於 `--mimic-color-dialogue-field`），並移除 `.space-home` 內的局部覆寫。內文色 `--mimic-color-ink`／`--mimic-color-ink-soft` **這輪不動**（仍為海軍藍系），留到之後的 consumer plan 再決定。
2. **Shell 配色**：頂欄、桌機側欄、手機底部導覽全部用暖深褐底＋黃銅邊，跟 `PixelDialogue` 一致；內容區維持奶油底。
3. **圖示呈現**：圖示＋文字。桌機側欄 48 CSS px，手機底部導覽 32 CSS px。
4. **選中狀態**：黃銅框＋略亮底（不用亮金）。
5. **公開頁 header**：改成跟 app 頂欄一致的暖深褐。已登入時 header 仍顯示「登入」的問題**這輪不處理**（另列待辦）。
6. **安裝圖示與 favicon**：這輪一起換成核准版，`theme_color` 改 `#211a18`。
7. **浮動記帳鈕**：加 `action-record-expense` 圖示（32）＋文字，保留亮金（它是主要 CTA）。
8. **導覽標籤**：維持現有文字（首頁、我的寶箱、共同群組、任務、設定）。

## 0.1 審閱者自行決定的事（附理由）

- **頂欄與側欄的品牌名不重複**：頂欄改用 `Wordmark` 元件（產品名＋「咪咪庫 / Mimiku」），移除頂欄右側單獨的「Mimiku」字；桌機側欄移除它自己的 `Wordmark`。理由：目前桌機同一畫面出現兩次品牌名，右上那個「Mimiku」也沒有功能。保留頂欄（而不是取消桌機頂欄）是為了不改 Home 場景的高度公式（2C 核准的 `視窗高 − top bar`）。
- **手機底部導覽改成 5 欄**：目前的 grid 是 6 欄，只有 5 個項目，右邊空一欄，這是 bug。
- **側欄的 sticky 位置**：現在是 `top: 0; min-height: 100dvh`，捲動時上方 4rem 會被頂欄蓋住。改成貼在頂欄下方，高度 = 視窗高 − 頂欄高。
- **頂欄高度改由 shell 提供 CSS 變數**：Home 目前用 `main → parentElement → previousElementSibling` 找頂欄量高度，shell 的 DOM 一動就會壞。改成 shell 根元素提供 `--mimic-app-top-bar-height`（值等於頂欄的實際外框高度，含邊線），Home 改讀這個變數，移除那段 DOM 走訪與 observer。**頂欄外框高度不得改變**，Home 的倍率要跟 2C 一模一樣（見 §7）。
- **圖示的像素渲染規則**沿用 2A 的「放大用 pixelated、縮小用 auto」：桌機 48 CSS px 在任何 DPR 都是放大或 1×，一律 `pixelated`；手機 32 CSS px 的裝置像素 = 32 × DPR，對 48 原圖來說 DPR ≥ 1.5 是放大（`pixelated`），DPR < 1.5 是縮小（`auto`）。用 `@media (min-resolution: 1.5dppx)` 切換。
- **新增 token `--mimic-color-hud-raised: #3a2c24`**：當作選中項目的底色。`#f0dfc4` 在它上面是 10.26:1，`#bc9b65` 是 5.12:1。
- **焦點框**沿用 `--mimic-color-focus #2f82d6`：在 `#211a18` 上是 4.31:1，達到非文字元素 3:1 的要求。手機底欄有 `overflow-x: clip`，焦點框要畫在裡面（`outline-offset` 用負值或改用 inset box-shadow），不能被裁掉。
- **舊安裝圖示不刪**：`web/public/icons/*` 被 Phase 1 歷史審閱頁當作「舊版參考」引用（`asset-style-gate.test.ts`），所以保留不動。新檔推廣到 `web/public/pixel-ui/v1/icons/install/`，manifest 和 precache 清單改指新路徑。
- **favicon.ico**：核准版只有 16／32 PNG。用這兩張 PNG 的**原始位元組**包成 ICO（ICO 允許內嵌 PNG），取代 `web/src/app/favicon.ico`。verification 要把 ICO 裡的兩張 PNG 拆出來，確認 hash 等於核准檔。另外在 metadata 加上 16／32 PNG 的 `<link rel="icon">`。不新增 apple-touch-icon（沒有核准的 180 尺寸）。
- **導覽 `aria-label` 維持 `Primary app sections`**：e2e helper 依賴它。圖示 `alt=""`＋`aria-hidden`，可及名稱由文字標籤提供（符合 manifest 的 accessibility 要求）。

## 1. 範圍

### 1.1 做

- 推廣 12 個圖示素材（§2）。
- 全站 `--mimic-color-hud-dark` 改值，以及受影響處的對比檢查（§3）。
- App shell：頂欄、桌機側欄、手機底部導覽、浮動記帳鈕（§4）。
- 公開頁 header（§5）。
- 安裝圖示、favicon、`theme_color`（§6）。
- 測試、截圖、`verification.md`、devlog（§7）。

### 1.2 不做

- 不改 `--mimic-color-ink`／`ink-soft`。
- 不改公開頁 footer、Landing 場景，也不改 Home 場景、卡片區或對話框的內容與版面。
- 不改導覽標籤文字、路由，也不改 `currentAppSection` 和 `quickExpenseHref` 的邏輯。
- 不處理已登入時公開 header 的「登入」連結，不讓公開 layout 變成動態渲染。
- 不用 event／status／mode 圖示（它們的 consumer 是之後的頁面）。
- 不用 ImageGen，不改像素，不改後端。

## 2. 素材推廣（`disposition: "promoted-phase-2d"`）

用 `npm run assets:promote` 逐位元組複製，並核對 SHA-256：

| 類別 | 檔案（`page-visual-v1/` 下） |
|---|---|
| 導覽 | `icons/ui/nav-home.png`、`nav-adventure-log.png`、`nav-guild.png`、`nav-tasks.png`、`nav-settings.png` |
| 動作 | `icons/ui/action-record-expense.png` |
| 安裝 | `icons/install/favicon-16.png`、`favicon-32.png`、`icon-192.png`、`icon-512.png`、`icon-maskable-192.png`、`icon-maskable-512.png` |

對應關係：首頁 → nav-home（篝火）、我的寶箱 → nav-adventure-log（日誌）、共同群組 → nav-guild（握手）、任務 → nav-tasks（任務板）、設定 → nav-settings（齒輪）。其他 manifest 紀錄維持不變。

## 3. 全站 hud-dark 改暖褐

- `tokens.css`：`--mimic-color-hud-dark: #211a18;`（寫字面值，方便 grep），另加一個單元測試確認它等於 `--mimic-color-dialogue-field`。新增 `--mimic-color-hud-raised: #3a2c24`。
- 移除 `web/src/features/home/home.css` 開頭 `.space-home` 的 `--mimic-color-hud-dark` 覆寫（現在跟全站值相同，已多餘）。
- 列出所有 consumer（`web/src` 約 47 處，排除測試），分成邊框／文字／陰影／背景四類，寫進 verification。每個「文字」與「背景上的文字」組合都要量改前與改後的對比，任何一組低於 4.5:1（大字 3:1）就停下來回報。已知數值：在 `surface` 上 16.47:1、`surface-raised` 上 17.13:1、`coin-action` 上 9.61:1。
- 確認彈窗 backdrop（`globals.css` 的 `color-mix(hud-dark 68%)`）會變成暖色遮罩，這是預期的，請截圖。
- 測試裡寫死 `#17213a` 或 `rgb(23, 33, 58)` 的斷言要更新，並逐條說明。特別是 `home-phase-2c.spec.ts` 那條「shell 仍是 `#17213a`」，現在要改成「shell 與 Home 都是 `#211a18`」。

## 4. App shell

### 4.1 共用色票

| 用途 | 值 |
|---|---|
| 底色 | `--mimic-color-hud-dark`（#211a18） |
| 邊線（頂欄下緣、側欄右緣、底欄上緣） | 2px `--mimic-color-dialogue-edge`（#b79556） |
| 選中底色 | `--mimic-color-hud-raised`（#3a2c24） |
| 選中框 | 2px `--mimic-color-dialogue-edge` |
| 選中文字 | `--mimic-color-dialogue-text`（#f0dfc4） |
| 未選中文字 | `--mimic-color-dialogue-speaker`（#bc9b65，6.54:1） |
| hover | 文字改 `dialogue-text`，底色 `color-mix(in srgb, var(--mimic-color-hud-raised) 55%, var(--mimic-color-hud-dark))`，沒有框 |

- 圖示在選中與未選中時都是**全彩**，不做降飽和、不調透明度（像素圖降透明度會發灰）。
- 選中狀態不能只靠顏色區分：除了框和底色，也要保留 `aria-current="page"`。

### 4.2 頂欄

- 外框高度維持現狀（verification 要量改前與改後的值，必須相同）。
- 左側放 `Wordmark`。在深色底上，產品名用 `dialogue-text`，角色名用 `dialogue-speaker`；做法是加一個深色版 class 或 modifier，**不要**改 `.mimic-wordmark` 的預設色，其他淺色底上的用法維持不變。
- 移除右側的「Mimiku」字。
- 在 shell 根元素提供 `--mimic-app-top-bar-height`（§0.1）。
- `.shell` 背景的 hud-dark 10% 漸層保留，會跟著變成暖色。

### 4.3 桌機側欄（內容欄斷點維持 `48rem`）

- 寬度維持 15rem（Home 內容欄寬度不能變）。
- 移除側欄的 `Wordmark`。
- `position: sticky; top: var(--mimic-app-top-bar-height); height: calc(100dvh - var(--mimic-app-top-bar-height)); overflow-y: auto`。
- 每項：48×48 圖示＋標籤（0.95rem），左對齊，高度至少 56px，內距左右 12px，圖示和文字間距 12px。
- 圖示一律 `image-rendering: pixelated`。

### 4.4 手機底部導覽

- 5 欄（`repeat(5, minmax(0, 1fr))`）。
- 每格：32×32 圖示在上、標籤在下（0.72rem，單行，超出用省略號）；觸控區至少 44×44。
- 底欄 `min-height` 維持 4.5rem，加上 safe-area；`main` 的底部 padding 與浮動記帳鈕的 bottom 偏移若需要調整，要在 verification 說明。
- 選中狀態的框和底色畫在整格上（圖示＋標籤）。
- 圖示 `auto`；`@media (min-resolution: 1.5dppx)` 時改 `pixelated`。
- 360 寬時 5 個標籤都要完整顯示（「共同群組」「我的寶箱」不能被截斷），截圖驗證。

### 4.5 浮動記帳鈕

- 內容：`action-record-expense` 32×32 圖示（`alt=""`、`aria-hidden`）＋「記一筆支出」。可及名稱不變。
- 背景保留 `coin-action`；邊框與陰影本來就用 hud-dark，會自動變成暖褐。
- 圖示的渲染規則同 §4.4。
- `/app` 不顯示的規則不變。

### 4.6 圖片載入失敗

- 圖示的 `<img>` 一律帶 `width`／`height`，載入失敗時要保留原本的尺寸、文字標籤照常可讀、不顯示破圖示。e2e 用 route 攔截讓圖示請求失敗，在 390 與 1440 各截一張。

## 5. 公開頁 header

- `siteHeader` 背景改 `hud-dark`，下緣 2px `dialogue-edge`；Wordmark 用 §4.2 的深色版；「功能」「登入」連結用 `dialogue-text`，hover 加底線，焦點框同 §0.1。
- **高度不得改變**：Landing 桌機縮放用的可用高度跟 header 有關，所以 header 外框高度必須跟現在完全相同。
- 回歸：Landing 2B `screenshots-2r/` 的所有截圖中，**header 以下的區域**（場景、對話框、footer）要逐像素相同（容差 0），只有 header 區域可以不同。若有任何像素不同，逐張說明原因（例如全域 hud-dark 影響到某個按鈕），不要自行修正對比以外的地方。
- `/features`、`/login` 各截 390 與 1440。

## 6. 安裝圖示、favicon、theme_color

- `manifest.ts` 的 icons 改指 `/pixel-ui/v1/icons/install/…`；`theme_color` 改 `#211a18`；`background_color` 不變。
- `next.config` 的 precache 清單同步更新路徑；`pwa-cache-policy.test.ts` 跟著改。
- `favicon.ico` 依 §0.1 用核准 PNG 的原始位元組包成 ICO。
- 根 layout 的 metadata 加入 16／32 PNG icon 連結；若有 `viewport.themeColor`，也改成 `#211a18`。
- 舊 `web/public/icons/*` 與 `icon.png` 不動。

## 7. 驗證

### 7.1 指令與基線

`npm run lint`、`typecheck`、`test`、`build`、`test:e2e`。基線用 Phase 2C 最新 commit `b767be1` 的乾淨 worktree（放在 `.tmp/`），逐項標示失敗是「既有」還是「本輪造成」。需要財務資料的頁面用 loopback 真實後端，只用 `127.0.0.1` 專用 DB。

### 7.2 新 e2e：`web/e2e/navigation-phase-2d.spec.ts`

尺寸：360×780、390×844、430×932、768×1024、1024×768、1280×720、1440×900、1920×1080。

- 五個導覽項目：圖示 `src` 對應 §2、渲染後的 CSS 尺寸（桌機 48、手機 32）、`image-rendering`（模擬 DPR 1／2／3）、標籤文字、`aria-current`、可及名稱。
- 手機 5 欄、沒有空欄、沒有水平捲軸；360 時標籤不被截斷。
- 桌機側欄沒有 Wordmark、頂欄有且只有一個；側欄捲動後頂端不被頂欄遮住（捲到頁尾時量側欄的 `getBoundingClientRect().top` 等於頂欄高度）。
- 計算後顏色：頂欄、側欄、底欄、選中項、未選中項、公開 header 都符合 §4.1。
- 焦點框：鍵盤 Tab 經過每個導覽項目，焦點框完整可見（手機底欄沒有被裁切）。
- 圖示載入失敗的 fallback（§4.6）。
- 浮動記帳鈕：圖示、文字、可及名稱；`/app` 不顯示，其他 app 頁面有顯示。
- manifest：icons 路徑、`theme_color`；favicon.ico 拆出來的 PNG hash。

### 7.3 回歸

- **Home**：2C `screenshots-2r/` 的所有尺寸 × 三種狀態，量測 Home 場景的倍率與外框尺寸，必須跟 2C 2R verification 的倍率表**完全相同**。場景元素（含卡片區與對話框）的截圖區域逐像素比較，容差 0；有差異就逐張說明。`home-phase-2c` 與 `navigation-home-tasks` 都要全綠（hud-dark 斷言依 §3 更新）。
- **Landing**：依 §5。`landing-phase-2a`、`landing-phase-2b` 全綠。
- **全站 hud-dark 的改前／改後對照**：`/app/personal`、`/app/groups`、一個群組詳情、`/app/tasks`、`/app/settings`、一個 space 詳情、邀請流程頁、QuickExpense 彈窗、一個確認彈窗（PixelDialog），各截 390×844 與 1440×900。改前在基線 worktree 截、改後在工作樹截，檔名成對（`<page>-<size>-before.png`／`-after.png`）。

### 7.4 交付

- 截圖存 `docs/design/assets/reviews/2026-11-11-phase-2d/screenshots/`。不需要錄影（這輪沒有動態）。
- `verification.md` 放在同一個資料夾，內容包括：推廣檔 hash、manifest 新 SHA-256、hud-dark consumer 分類表與對比表、頂欄改前與改後的外框高度、Home 倍率對照、Landing 逐像素比較結果、favicon.ico 拆檔 hash、圖示渲染規則實測、基線比較、未完成事項。
- `.agents/devlog.md` 追加一筆（CRLF）。

## 8. 審閱時 Ed 要看的點

1. 暖深褐 shell 跟洞穴場景、奶油內容區放在一起的整體觀感（桌機與手機）。
2. 選中狀態（黃銅框＋#3a2c24）夠不夠明顯。
3. 手機 32 px 圖示的清晰度與辨識度。
4. 全站 hud-dark 改暖褐後，各頁的邊框、卡片與彈窗遮罩（看改前／改後對照）。
5. 公開 header 跟 Landing 場景的銜接。
6. 新的安裝圖示與 favicon（核准版是海軍藍底，跟暖褐頂欄的搭配）。

## 待辦（不在本輪）

- 已登入時公開 header 仍顯示「登入」（要嘛連到 `/app`，要嘛改成「返回基地」），需要決定公開 layout 是否改成動態渲染。
- `--mimic-color-ink`／`ink-soft` 是否也改成暖色系。
- event／status／mode 圖示的 consumer（記帳筆記本、公會等頁面）。
- `PixelButton` 停用狀態（整顆 `opacity: 0.55`）在白色 panel 上只有 2.54–3.85:1（改色前就存在）；之後考慮改用專屬停用色票，不再用整顆透明度（見 2R.1）。

## 2R：對比門檻澄清（2026-11-11）

Codex 第一輪在 §3 停下：`PixelButton` 停用狀態在白色 panel 上只有 2.54–3.85:1（例如 `/app/groups/new` 送出中的按鈕）。審閱者重算，結果一致（primary 2.80、secondary 2.54、ghost 3.85，`#211a18`）。這個問題改色前就存在，改色後反而略好。

### 2R.1 停用元件豁免（Ed 決定）

- §3 的「任何文字組合」改為：**啟用狀態**的文字與背景組合要 ≥ 4.5:1（大字 3:1）。依 WCAG 1.4.3，停用（inactive）元件不在對比要求內。
- 停用狀態仍要量，數值列在 verification 的對比表，標明「豁免（停用）」；不得比改色前更低。
- 停用樣式本輪不改，列入待辦。

### 2R.2 交付

從第一輪的停止點繼續，完成 §1–§7 全部項目。第一輪的 `verification.md` 可以直接改寫成完整版本；保留「觸發停止的量測」表格，作為一個小節。

### 2R.3 審閱補記（2026-11-11）

- `/login` 屬於 `(auth)` route group，本來就沒有 site-header。§5 寫「`/features`、`/login` 各截 390 與 1440」是審閱者盤點時的誤會；`/login` 的截圖只是用來確認沒有受到影響。
- Ed 核准 2D，並接受 Home 2560×1440 empty／ready 兩張各有 2 個卡片圓角抗鋸齒像素的差異（最大差值 2），列為已知例外。

# Phase 2E：手機實看修正（安裝圖示、回到入口、公開 header、停用按鈕）

日期：2026-11-11。狀態：待 Codex 實作，停在視覺審核。

依據：2A–2D 與 2E-0／2E-1 已核准，2026-11-11 staging 部署成功。Ed 在手機上實看後提出問題，並確認這輪範圍。

## 0. Ed 已定的決策（2026-11-11）

1. **安裝圖示的海軍藍底不搭**：主畫面圖示、maskable、favicon 的底色改成暖深褐 `#211a18`（與頂欄、對話框、`theme_color` 同色）。**用程式替換底色，Mimiku 本體的像素不動**；如果邊緣留下的藍色毛邊無法乾淨處理，先停下回報，再考慮改用 ImageGen。示意圖見審閱者的 `install-icon-bg-directions.png`（方向 A）。
2. **手機版找不到回到 Landing 的入口**：app 頂欄的 mimic 字樣改成連到 `/`（桌機、手機都生效）。
3. **已登入時，公開 header 顯示「返回基地」**，取代「登入」，連到 `/app`。
4. **`PixelButton` 停用樣式改用專屬色票**，不再用整顆透明度。
5. 內文的 `ink`／`ink-soft` 海軍藍**維持不改**（Ed 沒有選這一項）。

## 1. 範圍

### 1.1 做

§2 安裝圖示、§3 回到入口、§4 公開 header、§5 停用樣式、§6 驗證。

### 1.2 不做

- 不改 Mimiku 的像素、內文色、導覽、Landing／Home 場景。
- 不改 Dockerfile、CI、`.railway/`、backend。
- 產品程式不得 import `web/` 以外的檔案（`web-build-context.test.ts`）。
- 舊的 `web/public/icons/*`、根目錄的 `icon.png` 不動。

## 2. 安裝圖示換暖深褐

### 2.1 產生方式

- 對象是六個核准檔：`icons/install/favicon-16.png`、`favicon-32.png`、`icon-192.png`、`icon-512.png`、`icon-maskable-192.png`、`icon-maskable-512.png`。
- 寫一支可重現的腳本（放在 `docs/design/assets/reviews/2026-11-11-phase-2e/`），只替換海軍藍系的底色像素，換成 `#211a18`，並保留原本的明暗起伏（新值 = 目標色 + 原像素與海軍藍平均值的亮度差）。哪些像素算海軍藍（例如藍色通道明顯高於紅、綠，而且偏暗）由 Codex 依實際像素決定，寫進 verification。
- 寶箱嘴巴內部原本畫的是深海軍藍，同樣換成暖深褐，這是允許的。
- **不能有任何殘留的藍**：腳本執行後，要確認沒有藍色通道高於紅色通道 12 以上、而且偏暗的像素；邊緣的混色像素也要處理。做不到就停下回報。
- **Mimiku 本體逐像素不變**：除了「被判定為海軍藍系」的像素之外，其他像素都要跟原檔逐位元組一致。每個檔案都要附一張「變更像素遮罩」圖，讓審閱者確認變動只出現在底色與嘴巴內部。
- favicon 16／32 也用同一支腳本處理，審閱頁要放大檢查。

### 2.2 素材紀錄（不覆寫舊核准檔）

- 新檔放在 `docs/design/assets/approved/page-visual-v1/icons/install-warm/<同檔名>`，在 manifest **新增**六筆紀錄。`sources` 指向原核准檔與它的 SHA-256，`export_method` 寫明是「`recolor-background`＋腳本路徑」，其餘欄位（css_size、accessibility、fallback 等）沿用原紀錄。
- 原本六筆 `icons/install/*` 的紀錄改成 `disposition: "superseded-phase-2e"`、`runtime_target: null`，並刪除它們在 `web/public/pixel-ui/v1/icons/install/` 的執行期副本。核准檔本身保留，作為 lineage。
- 用 `npm run assets:promote -- --phase-2e` 推廣六個新檔到 `web/public/pixel-ui/v1/icons/install-warm/`，`disposition: "promoted-phase-2e"`。
- `manifest.ts` 的 icons、`next.config.ts` 的 precache 清單、根 layout metadata 的 favicon PNG 連結，都改指向 `install-warm`。`web/src/app/favicon.ico` 用新的 16／32 PNG 原始位元組重新包裝（作法同 2D）。
- 調整相關測試（`assets.test.ts`、`asset-style-gate.test.ts`、`pwa-cache-policy.test.ts`、manifest 測試等），並在 verification 逐條說明改了什麼。

### 2.3 審閱頁

`docs/design/assets/reviews/2026-11-11-phase-2e/install-icons-review.html`：原版與新版並排，每個尺寸都附變更像素遮罩，maskable 疊上安全區，另外模擬主畫面 60／40 px 的實際大小，放在淺色與深色桌布上各一次。

## 3. 頂欄 mimic 連到 `/`

- `PixelAppShell` 頂欄的 `Wordmark` 外面包一層 `Link href="/"`。可及名稱是「回到 mimic 入口頁」，不要跟導覽的「首頁」（`/app`）混淆。
- 外觀不變：不加底線，hover 時字色改用 `dialogue-text`；`focus-visible` 顯示焦點框（同 2D 的焦點規則）。觸控區至少 44×44。
- 已登入的使用者回到 `/` 會看到 Landing 的「返回基地」，形成來回的路徑。
- e2e：手機與桌機都點一次，確認回到 `/`；鍵盤 Tab 能聚焦到它；可及名稱正確。

## 4. 已登入時公開 header 顯示「返回基地」

- `(public)/layout.tsx` 用既有的 `hasSession()` 判斷登入狀態。已登入時，header 的「登入」改成「返回基地」，連到 `/app`；未登入時維持「登入」。「功能」連結不變。
- 這會讓 `(public)` 底下的頁面（`/features`、`/privacy`、`/terms`、`/invite/...`）變成動態渲染，跟 `/` 一樣。在 verification 列出 build 輸出中這些路由改變前後的渲染模式。
- Service worker 的 NetworkFirst 公開頁快取在離線時可能顯示舊狀態（2B 已記錄），沿用同樣的說明，不額外處理。
- header 高度不能改變：Landing header 以下的區域，跟 2E-1 之後的截圖逐像素比對，容差 0。

## 5. 停用按鈕的專屬色票

- 新增 token：`--mimic-color-disabled-surface: #ece3d3`、`--mimic-color-disabled-text: #5a4e44`、`--mimic-color-disabled-edge: #8a7c6c`。審閱者預先算過：文字對底色 6.32:1；邊線對底色 3.18:1，對白色 4.05:1。
- `.pixel-button:disabled`（所有 emphasis 都一樣）改成：停用底色、停用文字色、2px **虛線** 停用邊線、拿掉陰影、`opacity: 1`、`cursor: not-allowed`。hover／active 不產生任何變化。
- 盤點全站其他用透明度表示停用的地方，例如 `home-scene.module.css` 裡 `.dialogue [aria-disabled="true"]` 的 `opacity: .65`、`landing-stage.module.css` 裡 `.control[aria-disabled="true"]`。
  - 放在**深色底**上的停用控制項（例如 Home 對話框離線時的 CTA）不能用上面的淺色色票，要改用：底色 `--mimic-color-hud-raised`、文字 `--mimic-color-dialogue-speaker`（5.12:1）、虛線邊線 `--mimic-color-dialogue-edge`。
  - 每個停用控制項，在它實際所在的底色上，文字對比都要 ≥ 4.5:1；verification 列出完整的對比表。
- 停用狀態仍然要能看出跟啟用不同：除了顏色，還有虛線邊、沒有陰影；`disabled`／`aria-disabled` 屬性保持不變。

## 6. 驗證

- 基線：`0ab70b1` 的乾淨 worktree（`.tmp/`）。
- 指令：`lint`、`typecheck`、`npm test`、`build`；加上 CI 全部四個 job 的關鍵步驟，在 Linux（WSL Docker `node:22`，`core.autocrlf=false` 的乾淨 checkout）跑，**兩個 web Dockerfile 都要 build 成功**，並通過健康檢查。
- e2e：`landing-phase-2a`、`landing-phase-2b`、`home-phase-2c`、`navigation-phase-2d`，加上新的 `web/e2e/polish-phase-2e.spec.ts`（涵蓋 §3、§4、§5 與 manifest／favicon）。real-backend 只用 `127.0.0.1` 專用 DB。
- 像素回歸（容差 0）：
  - Landing header 以下的區域，與 2E-1 的比對基準相同；
  - Home 場景區：**離線狀態除外**，因為離線 CTA 的停用樣式會變，這是預期的。
- 截圖存 `docs/design/assets/reviews/2026-11-11-phase-2e/screenshots/`：
  - 公開 header 未登入／已登入（390、1440）；
  - app 頂欄的焦點狀態（390、1440）；
  - 停用按鈕的改前／改後：`/app/groups/new` 送出中、設定頁儲存中，以及 Home 離線，各兩個尺寸；
  - 主畫面圖示模擬。
- `verification.md`：圖示腳本與遮罩判定方式、六個新檔的 hash、確認沒有殘留藍色、Mimiku 像素不變的證明、manifest 新的 SHA-256、ICO 拆檔 hash、渲染模式變化、停用色票對比表、測試修改清單、Linux／Docker 結果、基線比較。
- `.agents/devlog.md` 追加一筆（CRLF）。

## 7. 審閱時 Ed 要看的點

1. 新的安裝圖示（審閱頁與主畫面模擬），以及 favicon 放大後的樣子。
2. 停用按鈕的新外觀，在淺色頁面和 Home 離線時各看一次。
3. 已登入的公開 header，以及從 app 頂欄回到 Landing 的路徑。

## 2R：第一輪停止點的決定（2026-11-11，Ed 決定）

Codex 第一輪只做了探測（`.tmp/phase-2e-icon-probe.cjs`、`.tmp/phase-2e-probe-*.png`、`.tmp/phase-2e-pupil-comparison.png`）就停下，repo 沒有修改。原因：Mimiku 的黑色輪廓、瞳孔、嘴巴內部，以及木板的分隔線，都是偏藍的近黑（約 `#080e27`），跟背景屬於同一個色系。所以 §2.1 的「不能殘留藍色」和「Mimiku 本體逐像素不變」互相衝突。

### 2R.1 允許偏藍近黑的像素一起換成暖近黑（取代 §2.1 的「Mimiku 本體逐像素不變」）

- 規則改成：凡是被判定為**海軍藍系**的像素（底色、外框內的底、輪廓、瞳孔、嘴巴內部、深色分隔線），都依 §2.1 的公式換成以 `#211a18` 為基準的暖色。**其他像素**（木頭、金屬、牙齒、金幣、愛心、眼白、亮部）一律逐位元組不變。
- 判定規則沿用 Codex 探測時的條件（`a > 0 && b > r && b > g && b <= 192`），或是在 verification 說明更好的版本。必須證明：(1) 換色後沒有任何像素同時滿足 `b − r > 12` 且偏暗；(2) 沒被判定為海軍藍系的像素，與原檔逐位元組相同（附遮罩圖）；(3) 同一個檔案內，被換色的像素的亮度變化是一個固定常數（也就是 `#211a18` 與原海軍藍平均亮度的差），容許 ±1 的捨入誤差。這樣整體只是略微變亮、換了色相，明暗結構保持不變。
- 不使用 ImageGen。
- Ed 已經在審閱者的比較圖（`install-icon-outline-compare.png`，原版對照探測版的 512）上確認了這個方向。審閱頁仍要放每個尺寸的原版、新版與遮罩，特別是 favicon 16／32 的放大圖。

### 2R.2 接續

依 2R.1 完成 §2–§6，其餘規則不變。

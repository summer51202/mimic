# Phase 2F 驗證

基線為 `.tmp/phase-2f-baseline` 的乾淨 detached worktree，HEAD 為 `3ab87cd718379bdfef574f0702d124d2f6a88a56`。

## 素材推廣

`npm run assets:promote -- --phase-2f` 驗證下列十檔、兩張新 ledger 動態條和 timing。各 runtime 副本與核准來源逐位元組相同。

| §2 檔案 | SHA-256 |
| --- | --- |
| `frames/frame-notebook.png` | `cfbb8f907aab0312bac926f8ac945f2dc4345f92ba45a9e587195b05c8444370` |
| `icons/ui/event-contribution.png` | `173b840f695fc77f549831fc25aeb11716cd1eaa35e24f5e6cb9518a93adc57a` |
| `icons/ui/event-expense.png` | `840c5da0f78a0437f08727bbec7973937c4bbdde0e1c2a017006b0a1249572ce` |
| `icons/ui/event-reimbursement.png` | `0f3c251f889faa51f47bbf390de6dec8c57dba853013c41a55cfa56e35af89e5` |
| `icons/ui/event-shortfall.png` | `198b2ad8425adf0cd575b16f05a3a20e4accccfef158c718f9fde35df502698d` |
| `icons/ui/mode-personal.png` | `59df5cbb970c5a1a4fcc3f8a3841e32821fea401c61ca90244a33ef53ce1548f` |
| `icons/ui/mode-pooled.png` | `f3a3b1704ddab90990eb3fddccc3d11a4f772009806e022a3634805ca0f83311` |
| `icons/ui/mode-shared.png` | `58e61510d5eb6bf453cf7244c0dfb23b0b89851f2d173bf6ce64d17395a1b7af` |
| `icons/ui/status-lock.png` | `0cb525aca29bdd3ef7dde8641faf9ac597f2756351221f19441daa7b1c73f1ff` |
| `icons/ui/status-offline.png` | `f1935a2fdda462c87ab615879022706cc8267a2dc7ffa68c0770c4f223bd3194` |

Manifest SHA-256 為 `8b6468c1fc4c122d389b2212be312847158c6e1dfbb7e7d4a9e8b4852ba40c82`。共 82 筆 runtime 推廣紀錄，核准目錄共 134 筆紀錄。

## 筆記本對比

| 組合 | 對比 |
| --- | --- |
| 主文字 | 12.09:1 |
| 次要文字（日期、類型、備註、離線、鎖定） | 6.27:1 |
| 來源徽章文字／白底 | 17.13:1 |
| 列分隔線／紙面 | 4.12:1 |
| 藍色內圈／紙面 | 2.80:1 |
| 深色外圈／藍色內圈 | 4.31:1 |
| 深色外圈／紙面 | 12.09:1 |

| 按鈕 | 文字／按鈕底 | 外框／紙面 | 外框／按鈕底 |
| --- | --- | --- | --- |
| Primary | 9.61:1 | 12.09:1 | 9.61:1 |
| Secondary | 7.76:1 | 12.09:1 | 7.76:1 |
| Ghost | 17.13:1 | 12.09:1 | 17.13:1 |
| Danger（共用樣式，本頁筆記本沒有此按鈕） | 4.10:1 | 12.09:1 | 4.18:1 |
| Disabled（所有 emphasis） | 6.32:1 | 2.86:1 | 3.18:1 |

## Motion 2R 與紙面遮罩

從舊 master 分離五格 512×512，使用 `compose-motion-calibration-v02.mjs` 的 `bounds`、`register`、`scale`（2R 沿用 v02 ledger），裁切矩形為 `[48, 34, 464, 479]`。中間格與 512 key pose 的 RGBA 相同。按 B1 `export-page-visual-b1.mjs` 的水平串接和 PNG 編碼流程組回兩張動態條。Node 24.14.0 重現的十個小影格及兩張動態條 PNG 均與核准來源逐位元組相同，桌機 147,293 bytes、手機 101,351 bytes。舊 runtime 副本也等於舊核准檔。

以內建 ImageGen 編輯五格 sprite，限定左頁紙面，要求逐格增加平行短墨線。原始輸出 SHA-256 為 `69b4bb6d1429369b63760bd42101131bd9067ec40fb2c408d35505d26a128a76`。合成時取其墨線與乾淨紙面，依原圖定位、取樣及調整紙面亮度，以像素遮罩覆蓋筆跡。原圖 alpha 全數沿用。將同一張遮罩以 Motion 2R 的映射推導到桌機和手機尺寸，再逐 byte 比對 RGBA。

| 檔案 | 舊 SHA-256 | 新 SHA-256 | 影格 1–5 改動像素 |
| --- | --- | --- | --- |
| Master | `6d2da052a1417372cc4f924d5b215a1a5aa11940167bd1bf23e4e980d2905757` | `81402668450768eee010fc753cb69cdecb52abf8f5e6209a422005bcfaef8c4f` | 98 / 320 / 371 / 579 / 1015 |
| 桌機 | `45ae5b2d20baa2d0cedc7e33219c9600a5beb260af1d6e7cdaa3a26cbbde9083` | `42cfcf206ee7e3ffe3b025fdc91c37fc8e8fcfafecdc634cbb116010297d19a2` | 7 / 23 / 28 / 40 / 85 |
| 手機 | `f5aecd67b8299d53598bde6ef971bf2c7400ab330322963b4ffff87ed84a39c2` | `cb0e2139f4e214b0bb72053e1cd4228fb65cc092a5043da9f84aa7ce04a3c05d` | 5 / 15 / 19 / 28 / 51 |

<details>
<summary>內建 ImageGen 提示詞</summary>

> Precise local edit of this 5-frame horizontal transparent pixel sprite sheet. Edit only the paper surface of the LEFT page of the tiny open book in each of the five cells. Keep its page outline, quill including nib, coin, character, right page, paper shape and all five poses unchanged. Replace all left-page lettering and partial lettering with short straight isolated parallel brown ink strokes following perspective. Frame 1 has one small stroke, frame 2 has two, frame 3 three, frame 4 four, frame 5 five. No glyphs, digits, crosses, letter-like shapes or symbols. Preserve paper cream pixel texture and shading. Match exact original registration and five evenly spaced cells, no borders. Output the full sprite sheet in the same aspect ratio as the input.

</details>

每一格遮罩外的相異 RGBA bytes 都為 0，所有影格的相異 alpha bytes 都為 0。逐格差異及原圖與新圖並列於[書頁墨線審閱](ledger-inkline-review.html)。

Timing 的 desktop/phone ledger `asset_id` 各加入 `-inkline`，其餘欄位相同。舊 SHA-256 為 `c4d698ee9cd5a2371dc4921408883cc52e14712ffc657f3dc0d46a89132692ba`。新 SHA-256 為 `939505ed9b3f3871587af5a076894a0c6c94077283a66a25649767766c674695`，approved 與 web 兩份相同。

## 測試修改

- `tokens.test.ts` 驗證中心色與 frame manifest 相同。
- `app-section.test.ts` 驗證共同寶箱屬於群組導覽。
- `assets.test.ts` 與 `asset-style-gate.test.ts` 驗證推廣清單、檔案及來源 hash、superseded 狀態、書頁遮罩及 alpha。
- `pooled-workspace.test.tsx` 驗證加入類型文字後的日期與分類。`personal-reference-layout.test.ts` 的手機列版型改由瀏覽器驗證。
- `ledger-notebook-phase-2f.spec.ts` 新增六個尺寸與三種 DPR 的樣式、資產、離線、鍵盤焦點和窄版行為。

## 執行結果


WSL 以 `core.autocrlf=false` 建立 `3ab87cd` 的乾淨 checkout。Linux 候選從該 Git 快照套用工作樹檔案及已刪除的 runtime 舊動態條，不需要改動 Git index。Linux production Web 基線與候選的擷取使用同一套本機 API。專用資料庫 `mimic_phase_2f` 僅發布於 `127.0.0.1:39432`，套用 12 個 migration。

| CI job | 結果 |
| --- | --- |
| Active Mimic naming | Node 22 命名測試 6 個通過，repo 命名掃描通過。 |
| Backend | `npm ci`、Prisma generate、build 通過，Jest 322 個及 HTTP e2e 37 個通過。 |
| Web PWA | CI workflow contract 32 個通過，lint 0 errors、2 個既有警告，typecheck 通過。首輪 Vitest 662/663，重跑 663/663。獨立的候選 production build 通過。 |
| Production containers | Image contracts、Linux backup contracts、API／Web／backup build、三支備份 shell 語法、PG18／age／minisign／AWS runtime、使用者與啟動指令檢查、API 與 Web 的 live health 通過。 |

### 失敗歸因

| 失敗 | 歸因與處理 |
| --- | --- |
| 新 token 與新群組導覽單元測試在實作前失敗 | 本輪新增的驗收條件。實作後已通過。 |
| `personal-reference-layout.test.ts` 舊 flex 選擇器、`pooled-workspace.test.tsx` 舊日期字串 | 本輪造成。分別以瀏覽器 grid 斷言及新的類型＋日期、分類斷言覆蓋，重跑通過。 |
| `landing-warm-rest-composition.test.ts` 的 `keeps two unapproved composition drafts and immutable asset lineage` 在 5000 ms 逾時 | 既有，乾淨基線重現。候選單檔重跑也有 `writes real dimensions, exact 2x pixels, grayscale and clean transparent layers` 在 5000 ms 逾時，兩項測試及被測審閱素材均為基線內容。完整 Web 重跑 663/663。 |
| 2A 使用完整 Chrome 時資產清單多出暖色 favicon request | 既有瀏覽器差異。使用歷史驗證採用的 Chromium Headless Shell 後 10/10 通過。 |
| 新 e2e 把 `img.src` 當相對路徑、捲動完成前讀取矩形 | 本輪測試程式造成。改為比對圖片 URL 路徑結尾、立即捲至頁尾。 |
| 新截圖 fixture 的讀取錯誤分頁與封存 | 本輪測試資料造成。分頁使用 26 筆超過 API 預設 25 筆上限。封存使用 API 允許封存的空個人寶箱，含財務歷史的寶箱依既有規則回傳 `409 SPACE_HAS_FINANCIAL_HISTORY`。 |
| 第一輪離線像素取樣中圖層解碼失敗 | 本輪取樣程式造成。先解碼圖層，再切離線。 |

### 360 px 與播放實測

個人筆記本的內容寬 204 px，計算式為 `360 − 2×16（shell）− 2×16（個人頁）− 2×46（筆記本）`。360 px 測試中頁面 `scrollWidth` 等於視窗寬，Tab 經過的筆記本控制項均至少 44 px，焦點外圈的矩形在筆記本界線內。

Home 在 1440×900 與 390×844 的實際錄影都觀察到影格 `0,1,2,3,4`，之後回到待機。兩部影片與 master、桌機及手機的逐格遮罩可從[墨線審閱頁](ledger-inkline-review.html)開啟。


### 零容差畫面回歸

採用 2E 的 11 個尺寸（360×780、390×844、430×932、768×1024、1024×768、1280×720、1366×768、1440×900、1536×864、1920×1080、2560×1440）。Landing 比較 header 以下全頁，Home 比較可見的 scene viewport。待機動畫暫停在第 0 格，Home 測空白、可記帳與離線三種狀態。2C 的實際 idle、blink、ledger 和 11 尺寸倍率表也通過，Home layout JSON 與基線同一份內容。

| 區域 | 尺寸／狀態 | 零差異對照數 |
| --- | --- | ---: |
| Landing header 以下 | 11 尺寸 | 11 |
| Home 場景 | 11 尺寸 × 3 狀態 | 33 |

比較保留所有 RGBA 值，容差為 0。首輪完整取樣的三組重測如下。

| 樣本 | 首次異像素 | 重測 |
| --- | ---: | --- |
| Home ready 1024×768 | 6，場景矩形最右一欄，每個通道差至多 1 | 基線兩次相同，候選也為 0。 |
| Home offline 1280×720 | 1930 | 三張控制樣本中，基線 A 與基線 B 異 825 像素，基線 A 與候選也異 825，基線 B 與候選為 0。判定為既有擷取波動。 |
| Landing 1536×864 | 55，全部位於同一欄 | 基線兩次相同，候選也為 0。 |

原始比較結果保留於 `.tmp/phase-2f-pixels-2.log`、`.tmp/phase-2f-pixel-control.log` 與 `.tmp/phase-2f-landing-control.log`。頂欄 64 px。公開 header 的 66／70 px、路由與鍵盤焦點由 2D／2E 瀏覽器測試涵蓋。

### 既有 Playwright 規格

| 規格 | 結果 |
| --- | --- |
| `landing-phase-2a` | Chromium Headless Shell 10/10。 |
| `landing-phase-2b` | Chrome 20 個一般測試通過，手機與桌機的 full-motion 測試分開跑均通過。桌機首次等待 Wordmark 眨眼時超過 11 秒，屬既有動畫測試的取樣時序波動，基線與候選重跑均通過。2B 回歸的影片輸出到 `.tmp/`。 |
| `home-phase-2c` | 5/5。 |
| `navigation-phase-2d` | Chromium Headless Shell 11/11。 |
| `polish-phase-2e` | Chromium Headless Shell 8/8。 |

### 視覺審閱素材

[截圖資料夾](screenshots/)包含 26 組 before／after 及兩張 4× 外框特寫。帳目頁的配對以同一筆測試資料擷取。個人讀取錯誤使用測試瀏覽器攔截下一頁 GET，封存使用獨立空帳本，離線由瀏覽器 context 模擬。

- [個人有資料 360 px](screenshots/personal-data-360x780-after.png)與[頁尾 360 px](screenshots/personal-quick-action-360x780-after.png)。
- [共同分帳 1440 px](screenshots/shared-data-1440x900-after.png)與[共同基金缺口 1440 px](screenshots/pooled-shortfall-1440x900-after.png)。
- [外框角落](screenshots/notebook-corner-4x.png)與[外框重複邊緣](screenshots/notebook-edge-seam-4x.png)。
- [書頁原圖、新圖、遮罩與 Home 播放](ledger-inkline-review.html)。


### 新瀏覽器驗證

`ledger-notebook-phase-2f.spec.ts` 的 360×780、390×844、768×1024、1024×768、1440×900、1920×1080 與 DPR 1／2／3 矩陣通過。包含四本筆記本、圖示與文字、離線提示、鎖定及缺口圖示、焦點、缺圖 fallback、群組導覽與浮動鈕。頁尾矩形在 hydration 後量測，避免初次捲動被路由捲動還原覆蓋。Wordmark 於 390 與 1440 px 的鍵盤焦點另有成對截圖。

`.agents/devlog.md` 保留原有 261,203 bytes，追加段落使用 CRLF。核准的舊 PNG 與過去審閱截圖、影片內容保持原樣。交付停在視覺審核，Git HEAD 為 `3ab87cd`，index 無差異。


### 最終 Web 映像

最終瀏覽器測試檔同步後，使用各自原 Dockerfile 從同一份候選 Web context 重建。兩次 `id -un` 均為 `node`，映像的 `Config.User` 皆為 `node`，啟動指令皆為 `["node","server.js"]`。兩個容器各綁定 loopback 後呼叫 `/api/health/live`，均回傳 `{"data":{"ok":true}}`。

- `web/Dockerfile` sha256:05c06444481089dbbf55d5cbff6a18969b42fea18152cd59c0aa9ff455a11676
- `web/Dockerfile.railway` sha256:1237ce904c2835b4e1fc421b1acf7b0e0b5a07a072d2d75a14b9e32c1d384075


## 2R

只修 §6 書頁合成。審閱者首輪量測為遮罩內紙面 **238.2**，外擴 4 px 未修改紙面 **226.4–228.0**，差 **10.2–11.8**。首輪紀錄及原截圖、影片、遮罩全部保留。

### 紙面量測與殘影

每格遮罩由連續的紙面補片與首輪墨線組成。使用 BT.709 亮度，值域 0–255，標準差以母體計算。遮罩內只計補片的紙面，排除墨線。遮罩外採遮罩外接矩形外擴 4 px 的環帶，排除書脊、羽毛筆及墨線。取樣條件為 alpha ≥ 245、亮度 ≥ 150、R ≥ 218、G ≥ 200、B ≥ 170 且 R − B 為 16–51。補片以附近原始紙面依距離插值、帶入樣本紋理，最後校準平均亮度到同格環帶。第 1 格以原本無字的紙面作補片。五格的墨線像素沿用首輪 ImageGen 取樣，位置及 RGB 逐像素相同。

| 影格 | 內 n | 內平均 | 內 SD | 外 n | 外平均 | 外 SD | 平均差 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 188 | 235.64 | 0.55 | 414 | 235.33 | 3.23 | 0.30 |
| 2 | 478 | 233.92 | 6.02 | 304 | 233.52 | 6.49 | 0.40 |
| 3 | 141 | 240.97 | 1.29 | 483 | 240.48 | 2.89 | 0.48 |
| 4 | 549 | 234.62 | 8.55 | 351 | 234.22 | 6.75 | 0.40 |
| 5 | 1267 | 235.08 | 2.05 | 410 | 234.97 | 4.39 | 0.11 |

[高對比殘影檢查](ledger-inkline-2r-residual.png)將亮度 200–245 映射至 0–255，並列原圖、首輪與 2R。第 2、4、5 格首輪可辨識的字形輪廓在 2R 欄已消除。補片不沿舊字逐像素上色。重建指令為 `node docs/design/assets/reviews/2026-11-12-phase-2f/compose-ledger-inkline-2r.mjs <output-dir> [first-round-master]`。

### 動態條與素材

Motion 2R 原流程再次用原 master 重現桌機及手機原始 PNG，再以相同裁切、縮放、串接及編碼導出 2R。master／desktop／phone 的所有影格遮罩外 RGBA 差異都是 0，整張 alpha 差異也是 0。三張新差異遮罩已接到[審閱頁](ledger-inkline-review.html)。

| 檔案 | 首輪 SHA-256 | 2R SHA-256 |
| --- | --- | --- |
| `mimiku/action-record-ledger-inkline.png` | `81402668450768eee010fc753cb69cdecb52abf8f5e6209a422005bcfaef8c4f` | `c70551c68e36d20bcd11e7c474baab896882eff25ac37958f74729f39fc0fd24` |
| `motion/mimiku-record-ledger-inkline-desktop.png` | `42cfcf206ee7e3ffe3b025fdc91c37fc8e8fcfafecdc634cbb116010297d19a2` | `e2248e30cbd4db4ed6457f6c5e0bc6ee7f7a1ba27e1e33b08ce688544880743e` |
| `motion/mimiku-record-ledger-inkline-phone.png` | `cb0e2139f4e214b0bb72053e1cd4228fb65cc092a5043da9f84aa7ce04a3c05d` | `dcdbcbfb26f5faf68fd20d02b48458a4632de78884add3b7f18a3d6938b13fc0` |

2R manifest SHA-256 為 `fd4a9f8b53fdcdc7e8afea3489bc757c866e100521072adae32d36549f6099f3`。兩份 motion-timing 的 SHA-256 仍為 `939505ed9b3f3871587af5a076894a0c6c94077283a66a25649767766c674695`。原 ImageGen 輸出為 `69b4bb6d1429369b63760bd42101131bd9067ec40fb2c408d35505d26a128a76`。推廣腳本先驗證 master 內容及動態條的 master 來源 hash。兩個素材單元測試共 37 個通過。


| 原圖到 2R 的 RGBA 相異像素 | 影格 1 | 影格 2 | 影格 3 | 影格 4 | 影格 5 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Master | 275 | 615 | 434 | 934 | 1741 |
| 桌機 | 18 | 47 | 33 | 71 | 133 |
| 手機 | 12 | 31 | 21 | 47 | 84 |


### Home 實測

`home-phase-2c` 五個測試全數通過。Home 場景以首輪相同的 11 個尺寸、空帳本／可記帳／離線三種狀態比對，等待圖層解碼後擷取，待機停在第 0 格。第一批與 `3ab87cd` 比對 33 組中有 30 組完全相同。1024×768 的三組首次差 6／6／55 個像素，使用同型容器的首輪與 2R 重跑，三組分別為 `0`、`6 → 0`、`0`，每一組最後皆取得 RGBA 零差異對照。6 像素集中在擷取矩形最右一欄，首輪已記錄此處取樣波動。完整計數保留於 `.tmp/phase-2f2r-pixels.log` 與 `.tmp/phase-2f2r-pixel-control.log`。

兩部 2R [Home 錄影](ledger-inkline-review.html)分別使用 1440×900 與 390×844，皆觀察到 `0,1,2,3,4` 並回到待機。Real backend 使用獨立 `mimic_phase_2f2r` PostgreSQL 18 資料庫，僅發布於 `127.0.0.1:39433`。


### Linux Web PWA 與容器

使用 WSL Docker `node:22`（`v22.23.4`）。從 `core.autocrlf=false` 的乾淨 `3ab87cd` Git 快照套入候選工作樹，包含 2R 素材與測試變更。依 Web PWA job 安裝 Web／Backend 依賴、產生 Prisma client，CI workflow contract 32/32。Lint 0 errors，兩項既有 review config 警告。Typecheck 通過。

| Dockerfile | Image ID | 執行身分及健康 |
| --- | --- | --- |
| web/Dockerfile | sha256:7cf7d7ed37564800d59c18a8b86424303805f530c509ef597aed35ee8c7a02ab | node，/api/health/live 200 |
| web/Dockerfile.railway | sha256:c260f841915f76860e52926c02534932122b8f487e5ea1e4430011311dbde076 | node，/api/health/live 200 |

首次完整 Vitest 與容器建置並行時有 11 個 5 秒逾時。失敗集中於未修改的測試，沒有任何 2R 素材斷言失敗。

| 首輪逾時檔 | 件數 | 歸因 |
| --- | ---: | --- |
| `shared-expense-form.test.tsx` | 1 | 既有測試的執行逾時 |
| `avatar-classes-calibration.test.ts` | 1 | 既有測試的執行逾時 |
| `landing-a-title-calibration.test.ts` | 4 | 既有測試的執行逾時 |
| `landing-war-room-calibration.test.ts` | 2 | 既有測試的執行逾時 |
| `landing-warm-rest-composition.test.ts` | 3 | 既有，首輪已在基線重現同一檔逾時 |


容器與瀏覽器結束後，標準 5 秒門檻以單一 worker 重跑，661/663，兩項既有 `landing-warm-rest-composition.test.ts` 仍逾時。以命令列 `npm test -- --testTimeout=20000` 完整重跑，126 檔、663 個測試全數通過。Web production build 退出碼為 0。未修改 repo 的測試門檻。

首輪與 2R 的 Linux 快照逐檔比對，`web/src` 只差兩支素材測試，`web/public/pixel-ui/v1` 只差兩張 ledger 動態條。2R devlog 以 CRLF 追加，保留前 262,013 bytes。工作交付停在視覺審核。


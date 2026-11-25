# Phase 公會 I1 驗證｜2026-11-24

## 停止點 §7.7

日文 Home ready、360×800 的 DOM 文字比對出現一筆差異。基線是 `2026-11-24 06:48 UTC`，候選是 `2026-11-24 06:49 UTC`，兩者父節點路徑相同。差異落在 Home 的時間戳，兩次擷取跨分鐘。保存 `home-ready-ja-360x800-dom.json`。本格在 DOM 閘門停止，沒有判定 RGBA 像素結果，也沒有繼續其餘矩陣。重啟驗證時應讓同一 API 的兩次 Home 擷取共用同一個生成時間，再比對 DOM。

## 已驗證

- 基線 worktree `.tmp/guild-base-11317ce/` 為 detached `11317ce`，建置前工作樹乾淨。兩個 production Web 連到同一個基線 API。real-backend 使用專用 PostgreSQL `127.0.0.1:25441`，套用 14 個 migration。
- 停止前 49 對畫面通過 DOM 文字順序與零容差 RGBA。Landing 18 對、Home empty 18 對、Home ready 13 對。PNG 的 98 筆 SHA-256 見同目錄清單。390×844 的繁中代表樣本留在審閱目錄，其他一致配對位於 `.tmp/guild-pixel-archive/`。
- 320px 實際彈窗前測使用開發候選。繁中個人支出內容寬 232px，日文共同支出 248px，兩者皆無整頁水平捲動。暫存截圖與量測位於 `.tmp/guild-i1/`。
- 四個推廣素材的 SHA-256 已通過腳本校驗。Web 型別檢查通過，針對性測試 6 個檔案、53 個測試通過。
- WSL Docker 的標準與 Railway Web Dockerfile 皆已建出映像。Node 22 命名 job 通過。資料庫 job 初跑使用了測試守衛不接受的名稱，已改用 CI 所要求的固定名稱啟動重跑。完整五個 CI jobs 尚未驗收。
- 任務頁由 PixelAppShell 的 `main[data-quick-action]` 包住，該元素提供 `app-content` 容器，因此任務圖示沿用 LedgerIcon 的容器查詢。

## 待完成

§6 剩餘零差異矩陣、預期差異頁 bbox、完整三語候選截圖與 §6.3 彈窗矩陣。I1 尚未達到視覺審核門檻。遵照停止要求，保留目前工作樹供追查。

## 2R2 重拍紀錄

保留原 49 對。從 Home ready ja 360×800 續跑，兩個 production Web 接同一個本機 API。Home 成對連續擷取，UTC 秒數 ≥ 40 時等至下一分鐘，兩邊 asOf 一致後才比較 DOM 與 RGBA。未遮罩、修改 DOM 或攔截 API。下表重拍次數不包含首次擷取。

| 配對 | 重拍次數 | 最後 asOf（兩邊相同） |
|---|---:|---|
| home-ready-ja-360x800 | 0 | データの確認時点：2026-11-24 07:11 UTC |
| home-ready-ja-390x844 | 0 | データの確認時点：2026-11-24 07:11 UTC |
| home-ready-ja-768x1024 | 0 | データの確認時点：2026-11-24 07:11 UTC |
| home-ready-ja-1024x768 | 0 | データの確認時点：2026-11-24 07:12 UTC |
| home-ready-ja-1440x900 | 0 | データの確認時点：2026-11-24 07:12 UTC |

截至停止時共 73 對零差異畫面通過（含原 49 對）。不含時間戳的頁面沒有 asOf 重拍項目，已通過的配對見 SHA-256 清單。

### 新停止點：個人頁差異超出摘要範圍

繁中個人頁 320×568 的 DOM 文字順序一致。整頁影像由 320×1473 變為 320×1475。摘要上緣同為 y=485.42，底緣由 y=799.20 變為 y=801.20。差異 bbox 延伸到 y=1475（右下邊界不含），共有 44,540 個差異座標落在基線及候選摘要矩形的聯集外。統計包含完整影像尺寸差異。依 §6.3 停止，原始截圖、矩形及計數見 personal-zh-TW-320x568-2r2 系列。

停止時中止本輪零差異擷取與 WSL Docker Node 22 CI 續跑。任務板成對擷取、其餘預期差異頁、三語截圖、彈窗矩陣與五個 CI job 的完整驗收待續。

## 2R3 參與者公告板對比

以實作的 CSS 色值對公告板底色 #39271e 計算 WCAG sRGB 相對亮度對比。Select 底與文字沿用淺底深字。

| 檢查 | 色值 | 實測 | 門檻 |
|---|---|---:|---:|
| Select 外邊 | #b79556 | 5.02:1 | 3:1 |
| Select 標籤 | #f0dfc4 | 10.83:1 | 4.5:1 |
| 3px 焦點框 | #2f82d6 | 3.56:1 | 3:1 |
| 2px 焦點內圈 | #f0dfc4 | 10.83:1 | 3:1 |


Chromium 在 390×844 分別開啟共同分帳與基金參與者公告板，實際讀取兩個 Select 的 computed style。兩者均為木底 rgb(57,39,30)、邊框 rgb(183,149,86)、標籤 rgb(240,223,196)、白底深字。兩者都進入 :focus-visible 並顯示 3px rgb(47,130,214) 外框。

### 2R3 累計位移與停止點

保留前一輪 73 對。群組詳細頁新增 17 對通過 DOM 與零容差 RGBA，累計 90 對。個人頁使用新 production 候選，兩邊捲動位置均為 (0,0)。依 DOM rect 排除 fixed 像素並另外以 0 位移比較。個人頁繁中 320×568 與 360×800 通過。

**繁中個人頁 390×844 觸發 §6.3／2R3.2 範圍外差異。** DOM 文字順序一致，頁高差與累計位移均為 +2px。摘要上方、左右與 fixed DOM rect 本身均逐像素相同。套用 +2px 後，摘要下方仍有 316 個差異像素，bbox 為 [220,378) × [762,764)。浮動記帳鈕的 rect 為 [216,374) × [712,760)，其 CSS 陰影向右、向下各延伸 4px，差異帶的位置與固定陰影被納入位移比對相符。依規格保留原始 DOM rect，未擴張排除範圍。逐格證據見 personal-2r3-evidence.json，原始截圖見 personal-zh-TW-390x844-2r3 系列。

TypeScript 與 53 個針對性 Web 測試通過。WSL Docker Node 22 的 migration-only 資料庫測試 8 個、金融空間資料庫測試 156 個通過。2R3 標準 Web Dockerfile 已建成候選映像。停止時中止剩餘零差異矩陣及 CI，2R3 Railway Dockerfile、完整容器與 Web jobs、剩餘個人頁、共同分帳、基金、任務與彈窗矩陣待續。尚未進入視覺審核。

## 2R4 固定元件繪製範圍

使用 production 頁面的 getComputedStyle 逐層讀取外陰影，並納入可見 outline 的 width＋offset。每邊取最大外溢，外擴後向外取整。位移比較在基線座標排除基線畫框與候選畫框向上平移 Δ 後的區域，另外以 0 位移比較兩邊擴張畫框聯集。JSON 記錄原始 rect、色樣 CSS、陰影各層參數、演算法、擴張 rect 與差異 bbox。兩邊 scroll 均為 (0,0)。

- 繁中個人 390×844 已重判通過。即時擷取與原 2R3 PNG 重算均通過，原擷取的 fixed、摘要外差異分別為 0、0。用於重算的即時 DOM rect 與歷史證據一致。
- 繁中個人 768×1024 觸發 §6.3。DOM 文字一致、頁高 1225→1227、累計 Δ=2，擴張 fixed 比對 0 差異。剩餘 480 個差異像素都位於 [0,240) × [1022,1024)，與桌面 sticky 側欄的底緣相符。補查同一帶 y=1022–1025 不位移比對為 0 個差異。未改動或排除 sticky 側欄，結論仍為停止。
- 原 90 對零差異保留。停止前設定頁新增 10 對通過，累計 100 對，見 SHA-256 清單。WSL Docker Node 22 命名檢查通過，停止時中止後續 CI 與零差異擷取。共同分帳、基金、任務、剩餘個人頁與彈窗矩陣尚待驗證。

## 2R5 sticky 與 fixed 證據

依 computed position 納入所有有畫面矩形的 fixed 或 sticky 元素。沿用 2R4 的繪製外溢、雙座標排除及不位移比對。各格 JSON 記錄 DOM rect、擴張矩形、position 與兩邊 scroll。

- 原繁中個人 768×1024 的 PNG 已用新規則重判。fixed／sticky 不位移差異 0，摘要下方位移差異 0。同格即時重拍以及繁中 1024×768 也通過。
- 繁中個人 1440×900 觸發 §6.3。兩邊 scroll 都是 (0,0)，DOM 文字一致，頁高差與累計位移皆為 +56px，摘要外的位移比對為 0。唯一差異是 expanded rect 不位移比對的 16 個像素，bbox [1266,1270) × [876,880)。
- 浮動記帳鈕原矩形 [1266,1424) × [828,876)，陰影位移 (4,4)，模糊與擴散皆為 0。矩形外擴後涵蓋左下 4×4 角落，該角不在按鈕原矩形或其位移陰影內。原始 PNG 在該角的 RGBA 值為基線 6fb7dfff、候選 ead7acff, eb6f28ff, de6726ff, 782d17ff, 5b1f0cff。證據保留規格指定的擴張矩形，沒有另改挖除形狀。
- 原有 100 對保留，本輪新增 12 對通過零容差比對，累計 112 對。WSL Docker Node 22 命名檢查通過，剩餘擷取與 CI 已在新停止點中止。共同分帳、基金、任務、剩餘個人頁與彈窗矩陣待續，尚未進入視覺審核。

## 2R6 繪製範圍聯集

固定與 sticky 使用 DOM rect、各層非 inset 陰影 rect 與可見 outline rect 的聯集。每層陰影先平移 offset 再外擴 spread＋ceil(1.5×blur)。證據 JSON 記錄所有成員、遮罩演算法與兩邊 scroll。位移比較分別排除基線與移至基線座標的候選聯集；不位移比較只檢查兩邊聯集。

| 個人頁原圖 | 來源 | 聯集不位移差異 | 摘要下方位移差異 |
|---|---|---:|---:|
| personal-zh-TW-390x844 | 2r3 | 0 | 0 |
| personal-zh-TW-768x1024 | 2r4 | 0 | 0 |
| personal-zh-TW-1440x900 | 2r5 | 0 | 0 |

320×568、360×800、1024×768 的已通過版本沒有保存完整原始 PNG 配對。320 的 2R2 PNG 早於 2R3 產品樣式變更，2R3 只保存候選。這三格用相同 production 基線與候選、同類個人支出資料補拍，通過聯集規則。

個人頁共 11 格通過（含補拍及有原圖可重判的格位）。英文 1440×900 觸發 §6.3。兩邊 scroll=(0,0)，DOM 文字順序一致，頁高 1023→1079，累計 Δ=56，固定與 sticky 聯集不位移差異為 0。摘要下方位移後仍有 9 個 RGBA 差異像素，基線座標 bbox 為 [1142,1296) × [763,765)。保存兩張原始截圖及 personal-2r6-evidence.json。

原有 112 對保留。停止前新增 16 對零差異，累計 128 對。WSL Docker node:22 命名與容器／備份契約檢查通過，其餘 CI 已停止。剩餘矩陣、任務與彈窗證明待續，尚未進入視覺審核。

## 2R7 墊高對照

只在基線擷取頁設定畫面目標的 inline margin-bottom。對照的有效下緣為 DOM rect 下緣加上新增的 margin。產品程式未變更。原始位移結果、對照 rect、頁高、捲動位置與同座標比對結果均見 personal-2r7-evidence.json。

- 英文個人 1440×900 重判通過。原始位移比較有 9 個差異。+56px 墊高後，對照與候選頁高同為 1079px，有效下緣、fixed／sticky 位置及 scroll 均一致。同座標內容與 fixed／sticky 聯集差異均為 0。
- 日文個人 320×568 觸發 §7.7。+23px 墊高後對照與候選頁高都為 1475px，有效下緣同為 801.203125px，兩邊 scroll=(0,0)，fixed／sticky 成員矩形一致。摘要外內容為 0 差異，但同座標的 fixed／sticky 聯集有 3 個差異像素，座標為 x=153、y=485 至 487。該列位於浮動記帳鈕陰影的次像素左邊緣（陰影 rect 左緣 153.9375px）。JSON 保存實際 RGBA，未採用任何容差。原始、墊高與候選 PNG 均已保存。
- 原 128 對保留，新增 11 對零差異，累計 139 對。WSL Docker node:22 命名及容器／備份契約檢查通過。其餘 CI 與畫面矩陣在新停止點中止，尚未進入視覺審核。

## 2R8 fixed／sticky 與預期差異區交集

重判日文個人頁 320×568 的原始 2R7 基線、墊高對照和候選 PNG。兩邊捲動為 (0,0)，頁高均為 1475px，摘要有效下緣同為 801.203125px。各個 E rect 向外取整後取聯集，從 fixed／sticky 不位移比對中扣除。扣除後差異為 0；內容區差異也為 0。

觸發 2R8 的 25% 停止門檻。fixed／sticky 聯集有 51756 個像素，與 E 聯集相交 18837 個像素（36.40%）。交集是浮動記帳鈕陰影區 [153,288) × [485,488) 的 405 px，以及底部導覽 [32,288) × [496,568) 的 18432 px。計數取交集矩形聯集，每像素只計一次。逐格結果見 personal-ja-320x568-2r8-replay.json。

原有 139 對零差異結果保留。本輪因重判首格超過門檻，未續跑零差異矩陣、其餘預期差異頁、彈窗截圖或 CI。尚未進入視覺審核。

## 2R9 逐元素重疊與最大捲動補拍

日文個人頁 320×568 使用同一 11317ce 基線與 I1 production 候選，重新擷取並套用 2R9。頂欄重疊 0%，浮動記帳鈕重疊 405px（4.92%），底部導覽重疊 18,432px（80%）。依規則補拍對照與候選各一張 320×568 視窗截圖。兩邊頁高 1475px，捲動位置皆為 (0,907)，摘要已在視窗外。整張視窗 181,760 個 RGBA 像素逐一比較，差異 0。證據在 personal-2r9-evidence.json 與該格的兩張 bottom PNG。

原 139 對保留，日文註冊頁剩餘 5 對均通過，零差異矩陣 144／144 完成。舊 Playwright Chromium 執行檔已不存在，本輪新增配對和補拍兩側皆使用本機 Chrome 158.0.8127.37。

日文個人頁 360×800 觸發 2R9 的「最大捲動仍重疊」停止點。頁首不位移比對的既定範圍及墊高對照非 E 內容均為 0 差異。頁首浮動記帳鈕重疊 7,212／8,236 px（87.57%），底部導覽重疊 15,688／25,920 px（60.52%），因此補拍。兩邊頁高 1402px，最大捲動均為 (0,602)。候選摘要仍出現在視窗 y=[0,179)，與 sticky 頂欄交集 [32,328) × [0,64)，即 18,944／23,040 px（82.22%）。浮動記帳鈕與底部導覽已無交集。此格因「無重疊」前置條件未成立，未判定整張補拍的像素差異。證據 JSON 保留逐元素比例、座標、捲動與實際比對狀態，兩張補拍均保存。

本輪已跑到 WSL Docker node:22 的命名、後端、migration-only 資料庫與容器契約檢查，並建出 API 映像。金融空間資料庫、Web 及容器 jobs 在停止點中止，未驗收完整五個 jobs。預期差異矩陣、彈窗及剩餘三語截圖亦依停止點保留待續，尚未進入視覺審核。

## 2R10 逐元素補驗

日文個人頁 360×800 已通過。頁首整頁截圖驗到 sticky 頂欄，重疊 0%，逐像素差異 0。浮動記帳鈕與底部導覽起始重疊分別為 87.57% 與 60.52%，因此兩側都補拍在最大捲動 (0,602)。該處兩個待驗元素重疊均為 0%，扣除 E 後差異 0。已在頁首驗過的頂欄，此次與 E 的交集歸給 E。每個元素的擷取位置、重疊比例與差異數見 personal-2r10-evidence.json。

日文個人頁其餘 390×844、768×1024、1024×768、1440×900 均通過；390×844 的浮動記帳鈕另外在 (0,558) 通過。此前已通過的個人頁證據及 144 對零差異結果均保留。

### 2R10 新停止點

共同分帳繁中 320×568 的 DOM 文字順序一致。基線整頁截圖 378×1441，候選 320×1695，候選 document scrollWidth 為 320px。基線墊高對照為 378×1695，頁高已對齊，寬度仍差 58px。三個預期區域的有效下緣，對照→候選分別為 457→457、785→805、1442→1547。共同分帳結算板及參與者板未對齊，2R7 的同座標比較前置條件不成立，因此停止。詳細 rect、DOM 比對結果與原始位移參考在 shared-2r10-evidence.json，基線、墊高、候選三張原始 PNG 已保存。本格為雙成員群組的空共同分帳初檢，完整狀態資料矩陣仍未跑。

保留 144／144 零差異結果。WSL Docker node:22 命名、容器／備份契約檢查與 API 映像完成。其餘 CI 與 Web Dockerfile 驗證在停止點中止。共同分帳其餘格、基金、任務及彈窗驗證待續，尚未進入視覺審核。

## 2R11 橫向溢出成因

繁中共同分帳 320px 的基線內容欄寬 288px，但 grid 欄軌為 358px，document.scrollingElement.scrollWidth 為 374px。具體路徑是 `main.shared-page > div.pixel-panel.shared-lifecycle > div.shared-add-participant > label.pixel-field > select.pixel-field__input`。Select 的 min-width 為 auto、white-space 為 pre，含成員名稱與 Mimic ID 的 option 帶出 306px 的選單固有寬度。生命週期面板連同內距及外框達 358px，右緣為 374px。

在基線單獨把 Select 的 min-width 暫設為 0，文件寬從 374px 降到 320px。候選的 board Select 已套用 min-width: 0，實測外框寬 196px；其公告板與內容欄均為 288px，文件寬 320px。診斷操作只在本機基線頁面進行。上述量測及完整 computed 值在 shared-2r11-overflow-cause.json。前次 2R10 的成員名稱與 ID 樣本測得 378px，本次雙方共用的新測試資料測得 374px。

### 2R11 基線溢出格位

寬度矩陣 216 格（12 頁面狀態 × 3 語言 × 6 個視窗）。候選溢出 0 格。所有結果及溢出元素路徑見 scrollwidth-2r11.json。任務板起始資料為一種投入任務，基金起始資料為投入排程，共同分帳起始資料為兩名群組成員且無支出。這份矩陣未涵蓋尚待補驗的其他資料狀態及開啟中的彈窗。

| 格位 | 基線 scrollWidth | 候選 scrollWidth |
|---|---:|---:|
| shared-zh-TW-320x568 | 374px | 320px |
| shared-zh-TW-360x800 | 374px | 360px |
| shared-en-320x568 | 374px | 320px |
| shared-en-360x800 | 374px | 360px |
| shared-ja-320x568 | 374px | 320px |
| shared-ja-360x800 | 374px | 360px |


### 2R11 目視清單

| 格位 | DOM 路徑變更 | 固定區零容差結果 | 候選整頁截圖 |
|---|---:|---|---|
| shared-zh-TW-320x568 | 28 筆 | 21684 px 比對，差異 0 | [PNG](./shared-zh-TW-320x568-2r11-visual-candidate.png) |
| shared-zh-TW-360x800 | 28 筆 | 29688 px 比對，差異 0 | [PNG](./shared-zh-TW-360x800-2r11-visual-candidate.png) |
| shared-en-320x568 | 28 筆 | 21632 px 比對，差異 0 | [PNG](./shared-en-320x568-2r11-visual-candidate.png) |
| shared-en-360x800 | 28 筆 | 25408 px 比對，差異 0 | [PNG](./shared-en-360x800-2r11-visual-candidate.png) |
| shared-ja-320x568 | 28 筆 | 21684 px 比對，差異 0 | [PNG](./shared-ja-320x568-2r11-visual-candidate.png) |
| shared-ja-360x800 | 28 筆 | 25344 px 比對，差異 0 | [PNG](./shared-ja-360x800-2r11-visual-candidate.png) |

六格 DOM 文字順序完全一致，所有路徑變更逐條記於 shared-2r11-evidence.json。fixed／sticky 以兩側捲動 (0,0) 的視窗截圖量測，逐格扣除與 E 的交集。

### 2R11 新停止點

共同分帳繁中 390×844 不屬於 2R11 例外：雙方 scrollWidth 都是 390px。DOM 文字順序一致。原始基線與候選在摘要上方仍有 49 個 RGBA 差異像素，bbox 為 [2,387) × [66,67)。另外，墊高對照與候選頁高都為 1637px，但三個區域的有效下緣分別為 439→439、764→766、1423→1489，後兩個區域未對齊。依 2R7 的前置條件停止，墊高對照未做同座標像素判定。三張 PNG 與逐格 JSON 已保存。

144 對零差異結果保留。WSL Docker node:22 命名、後端與 migration-only 測試已執行，標準 Web Dockerfile 成功建出映像。偵測到停止點後中止其餘流程，完整 CI、Railway Web Dockerfile、其餘畫面與彈窗矩陣尚未驗收。

## 2R12 小數墊高與同座標比對

保留既有 144 對與個人頁證據。共同分帳繁中 390×844 重拍時，首輪測試憑證過期，擷取只載入頁面空殼。空殼結果已排除，擷取腳本加上摘要實際可見的檢查，重新登入後使用同一測試資料。另在量測前確認 inline margin 生效，並在截圖後讀取實際 DOM 幾何。

三個 E 的高度差直接取自 DOM，未四捨五入，本格恰為 2／64／130px，累計 2／66／196px。基線 inline margin-bottom 以 calc 設定。重新擷取後三區 top 與有效 bottom 誤差均為 0，頁高同為 1637px，最後一個 E 後沒有可量測的 flow sibling。DOM 文字順序相同。原始基線在 y=66 的 49 個差異僅列為參考，墊高對照與候選該列差異為 0。

§6.3 停止點：對齊成立且 fixed／sticky 比對差異為 0，但 E 外仍有 8 個 RGBA 差異像素，位於新增共同支出按鈕的四角，bbox [62,328) × [876,923)。逐像素 RGB 各差 1，alpha 相同。已保存三張 PNG、實測 rect 與 RGBA 座標。因零容差條件未通過，未續跑其餘格位。

WSL Docker node:22 命名與後端單元測試通過（346 個），容器及備份契約檢查通過。停止時中止其餘驗證，完整五個 CI job、其餘三語矩陣及彈窗尚未驗收。

## 2R13 軟體光柵化與零容差

本輪 Chrome 的基線、墊高對照、候選與補拍均用相同旗標：`--disable-gpu --disable-gpu-rasterization --disable-partial-raster --force-color-profile=srgb --disable-lcd-text`。繁中共同分帳 390×844 試拍對齊，E 外及 fixed／sticky 比對結果均為 0；最大捲動補拍也通過。原本 8 個圓角差異不再出現。本輪維持 RGBA 容差 0，未啟用 ±1（0 格、0 像素）。既有 §6.2 的 144 對零差異保持原驗證紀錄。

### 2R13 續跑與停止點

共同初始資料另有 8 個常規格位在軟體繪製下通過。候選彈窗初檢保存 41 個截圖及尺寸記錄（未完成同座標證明或完整彈窗矩陣）。

基金繁中 320×568 觸發 §6.3。DOM 文字順序一致，兩側寬度為 320px，墊高後頁高同為 2360px，各區有效邊對齊。摘要高度差為 -74px，候選摘要下緣 y=692，對照中基線摘要的實際繪製區延伸至 y=766。預期框外有 21,294 個 RGBA 差異，bbox [16,304) × [692,766)，固定元件差異為 0。例：白色表面 RGB (255,255,255) 對 (255,250,240)，超出抗鋸齒的限制。證據見 pooled-2r13-evidence.json 與 pooled-zh-TW-320x568-2r13 三張原始 PNG。

WSL Docker node:22 的命名、後端單元與 HTTP E2E 測試已通過（346＋37 項），容器／備份契約檢查通過。完整 CI、兩個 Web Dockerfile 的本輪驗收、剩餘共同／基金／任務和彈窗矩陣在停止點中止。未進入視覺審核。

## 2R14 只墊高較矮的區塊

保持 2R13 的五個軟體繪製旗標與 RGBA 零容差。基金繁中 320×568 的摘要基線 572px、候選 498px，在候選加 74px margin-bottom。其他區塊逐一以非負小數差墊高較矮一側，兩張擷取頁高、區塊上緣與有效下緣均對齊。不使用負 margin。視覺樣本使用未墊高的候選 PNG。

基金繁中 320×568 的 E 外、fixed／sticky 與補拍均為 0 差異（最大捲動 1866px）。基金繁中六個視窗全通過。英文與日文矩陣因停止點尚未完成。

任務板繁中 320×568 已確認 API 中有六種任務。原始及墊高配對依 2R2 連續擷取，墊高配對第 1 次就取得相同 asOf：狀態時間：2026-11-24 13:05 UTC。DOM 文字順序一致，六張卡片上緣誤差 0，雙側墊高頁高同為 2146px，fixed／sticky 差異為 0。

§6.3 停止點：任務板 E 外仍有 7,070 個差異像素，bbox [37,293) × [815,1946)。差異含任務卡邊界外的底色，例如 (288,815) 由 RGB (255,250,240) 變為 (217,199,168)。未符合 2R13 的 ±1 條件，未啟用容差。逐格 JSON 與四張 PNG 均已保留。

先前 41 張候選彈窗截圖已保留，本輪補上 13 張。六種可直接開啟的彈窗已涵蓋三語 × 320／390／1440，共 54 張，為候選視覺與寬度初檢。共同支出鎖定提示、更正、退回計畫及完整同座標證明仍待驗收。

WSL Docker node:22 命名、容器／備份契約檢查已執行，其他 CI 在停止點中止。既有 144 對與已通過格位保留，尚未進入視覺審核。

## 2R15 預期區域的繪製外溢

E 遮罩取雙側對齊 rect，再聯集兩側實測的各層非 inset 陰影與可見 outline。每個成員矩形存於 JSON 的 ePaint；固定元件沿用 2R6–2R10。Chromium 保留 2R13 五個旗標與 RGBA 容差 0。

任務板繁中 320×568 用 2R14 的墊高 PNG 與同位置重拍所得的 computed style 重判。六張任務卡均納入各自右、下偏移 5px 的原樣陰影。先前 7,070 個 E 外差異歸零，即時重拍也為 0，補拍於 (0,1578) 通過。保存原始、墊高四圖及 tasks-2r15-evidence.json。基金英文 320 與 360 的雙側墊高驗證皆通過。

### 2R15 基金與彈窗進度

基金初始投入排程三語 × 六視窗均已通過，繁中沿用 2R14 的六格，英文與日文新增十二格證據。81 張候選彈窗截圖的檔案與尺寸見 dialogs-2r15-index.json。保留前 54 張，補拍永久鎖定提示、更正、退回計畫各三語 × 三寬，新增 27 張；已確認列出的 PNG 全部存在。

線上與離線任務板資料均含六種 API 任務。原始、墊高與需要補拍的任務畫面依 2R2 成對核對 asOf。子分支初跑曾在時間戳列出現差異，補上補拍的時間門檻後重拍，未修改或遮罩時間文字。離線三語 × 320／390／1440 共九格全部通過，證據在 tasks-offline-2r15-evidence.json。

WSL Docker node:22 的容器 job 已通過，包含 API／Web 健康檢查與標準 Web Dockerfile，另外 Railway Web Dockerfile 也建置完成。後端單元 346、HTTP E2E 37、migration-only 8、金融空間資料庫 156 項通過。Web job 狀態待續跑結果。

### 2R15 三語頁面與重拍紀錄

- 既有 §6.2 容差 0 的 144 對保留。
- 線上任務板 18／18、離線任務板 9／9。參見 [線上證據](tasks-2r15-evidence.json)、[離線證據](tasks-offline-2r15-evidence.json)、[2R2 重拍與最終 asOf](2r15-task-asof.json)。
- 基金投入排程 18／18，採 [2R14 繁中證據](pooled-2r14-evidence.json) 與 [2R15 英文、日文證據](pooled-2r15-evidence.json)。AWAITING_PAYMENT、SENT、COMPLETED 各三語與三尺寸，合計 27／27，參見 [退回證據](pooled-returns-2r15-evidence.json)。
- [群組離開彈窗](leave-dialog-2r15-evidence.json) 9／9，文字、背景遮色與捲動位置相同，彈窗範圍外 0 px。
- [候選彈窗截圖索引](dialogs-2r15-index.json) 涵蓋九種狀態、三語、三尺寸，共 81 張，含三組 2R15 新增狀態。

### 2R15 Web CI 重跑

首輪 CI 容器的暫存 checkout 漏帶 docs，造成 TypeScript 找不到測試引用的 JSON 與 MJS。補齊後，Web lint（2 個既有警告）與 typecheck 通過。Vitest 揭露 Gate B 測試的 promotion allowlist 未列入 promoted-phase-guild。補上這個 disposition 後，該測試檔 19／19 通過，完整 WSL Node 22 Web job 重跑。既有 .agents/devlog.md 的 G1／I1 新增區段確為 CRLF，Git 差異只有追加。

共同分帳日文 390×844 與 1440×900 已補拍，兩格 E 外差異 0。共同分帳一般頁面合計 18／18（含 2R11 的基線溢出例外）。核對個人、共同分帳、基金、線上任務板與離線任務板各三語 × 320／390／1440，45 個候選畫面格位皆有原尺寸 PNG。

### 2R15 彈窗驗證完成

八種會在預期差異頁開啟的彈窗共 72 格，逐格量測兩側摘要／公告板、彈窗與實際畫框的 DOM rect 及外溢，比對相同捲動與背景遮色下的範圍外 RGBA，全部 0 px。個人／共同支出的擷取等標籤與版面就緒後進行，排除初次載入造成的畫框寬度變動。證據見 [彈窗成對比對](dialog-pair-2r15-ready-evidence.json)。加上群組離開的九格，共 81／81。

### 2R15 更正分頁與長日文

在專用 DB 建立獨立測試空間，僅將該空間與參與者的起始日回填至前一天。原支出、自動完成的結算及 26 筆更正全部經正式 API 建立。實際分頁為 25＋1 筆。基線與候選共用資料，涵蓋未更正、一次、兩次（含長日文原因）、作廢與 22 次更正。共九格皆通過，候選無水平溢出，原始支出主金額不變。DOM 文字的新增項與路徑差異和 E 外 RGBA 證據見 [更正資料與像素證據](shared-corrections-2r15-evidence.json)。

### 2R15 CI 最終結果

WSL Docker Node 22 五個 job 已通過。naming 通過，backend 單元 346 與 HTTP E2E 37 通過，backend-db migration-only 8 與 financial-spaces 156 通過，web 的 workflow 契約 50 項及 Vitest 725 項通過，lint 無錯誤（兩個警告），typecheck 與正式建置通過，containers 的映像、備份契約及健康檢查通過。標準與 Railway Web Dockerfile 均成功建置。Web 最終重跑帶入 repo 根目錄 icon.png，兩套素材契約均保留四項 Guild 素材的路徑與 SHA-256 檢查。

驗證完成，停在 Ed 的視覺審核。stage 為空，backend/ 無工作樹變更。

## 2R16 修正輪｜§6.3 停止點

修正前 production Docker 映像已於修改前保存為 .tmp/guild-i1-r1-build/production.tar，SHA-256 為 0a1b226c25fbf4bc4db1acfdb1bc5be2441ebd079046e49598cd9ccb3143b6e2。修正版以 production Dockerfile 建置，兩版均連線至同一個本機 API 與專用測試 DB。

基金摘要本子內的舊偽元素已停用。共同分帳更正標示使用專用 class 將 32px 圖示排在兩行文字左側，圖示不縮放，文字可換行。驗證採用與 2R13 相同的五個 Chromium 軟體繪製旗標，墊高與 E 繪製範圍沿用 2R14／2R15。

英文共同分帳更正 320×568 的 DOM 文字一致，兩側墊高整頁皆為 320×5973，E 已對齊。E 與 fixed／sticky 遮罩外仍有 1 個差異像素，座標 (109,1833)，RGB [203,184,146] 對 [234,215,172]，通道差 31／31／26，超過 2R13 容差條件。fixed／sticky 區外溢扣除 E 後差異為 0。逐點證據見 [2R16 比對](2r16-expected-evidence.json)，原始與墊高圖位於 .tmp/guild-i1/2r16-captures/。

停止前繁中更正六種視窗通過；其他頁面已完成 2 格，個人支出彈窗已完成 16 格。命名、後端單元 346 項與 HTTP E2E 37 項通過，migration-only 8 項通過；其餘 CI 已中止。候選截圖覆蓋、審閱目錄搬移與完整回歸均待續。本輪尚未進入視覺審核。

## 2R17 文字繪製外溢

僅對 E 的後代文字節點使用 Range.getClientRects()。每個實測矩形四邊各加 2 px，兩版各量各的，再與 2R15 的 E 繪製遮罩取聯集。英文更正頁 320×568 的 157 個文字矩形收納了原先的 1 個越界像素 (109,1833)，其餘像素容差維持 0。已通過的 2R16 六格保留。

英文更正頁 1440×900 的第一輪比對因腳本使用預估累計位移當作額外對齊條件而提前中斷。四組 E 的實測上緣、加墊後有效下緣、兩版頁高與後續 flow 位置吻合。以實測矩形重算原 PNG，並重拍確認 E 外差異皆為 0。彈窗重拍對齊頁面和彈窗的兩個捲動位置後再比較。基金摘要與共同分帳更正各 18 格通過。逐格矩形數與差異座標見 [2R17 預期差異證據](2r17-expected-evidence.json)。

### 2R17 矩陣驗證完成

以 2R16 修正前 production 為基線，比對三語 × 六種視窗。其餘頁面 216／216 格的 DOM 文字和 RGBA 相同（含共同分帳無更正、線上／離線任務板）。彈窗 162／162 格通過；退回計畫的複合畫面中，允許變動的底層基金摘要仍可透過背景遮色看見。對有此差異的格位，另以兩側同樣隱藏摘要且保留版面的擷取圖驗證整個彈窗與背景，RGBA 差異為 0。例：英文 768×1024 最初在畫框外側的 8 px，對應量條位置，扣除底層摘要的影響後歸零。比對資料見 [其餘頁面](2r17-zero-evidence.json) 與 [彈窗](2r17-dialog-evidence.json)。

### 2R17 CI 與審閱目錄容量

WSL Docker Node 22 的 naming、backend、backend-db、web、containers 五個 job 通過，Web 725／725，標準與 Railway Web Dockerfile 均建置成功。

覆蓋指定的三語基金與更正候選共 18 張。已移出 216 張基線、墊高對照及中間截圖至 .tmp/guild-pixel-archive/2r17-review/，SHA-256 全部重驗一致。JSON 僅壓縮序列化空白，六張 2R11 目視圖與 decision-log 保留。

歸檔後實測 32,155,781 bytes（32.16 MB，30.67 MiB，未計入本段）。超過 30 MB，依 2R16 容量停止條件暫停視覺審核。

### 2R17 歸檔後的前 20 大檔案

| 排名 | 檔名 | Bytes |
|---:|---|---:|
| 1 | `2r17-dialog-evidence.json` | 926,454 |
| 2 | `2r17-expected-evidence.json` | 813,180 |
| 3 | `tasks-2r15-evidence.json` | 584,941 |
| 4 | `shared-corrections-en-320x568-2r15-candidate.png` | 581,561 |
| 5 | `shared-corrections-ja-320x568-2r15-candidate.png` | 558,408 |
| 6 | `shared-corrections-ja-390x844-2r15-candidate.png` | 499,600 |
| 7 | `shared-corrections-ja-1440x900-2r15-candidate.png` | 483,567 |
| 8 | `shared-corrections-en-390x844-2r15-candidate.png` | 482,814 |
| 9 | `shared-corrections-zh-TW-320x568-2r15-candidate.png` | 467,905 |
| 10 | `shared-corrections-en-1440x900-2r15-candidate.png` | 464,956 |
| 11 | `dialog-pair-2r15-ready-evidence.json` | 460,261 |
| 12 | `pooled-returns-2r15-evidence.json` | 419,952 |
| 13 | `shared-corrections-zh-TW-390x844-2r15-candidate.png` | 406,874 |
| 14 | `home-ready-zh-TW-390x844-candidate.png` | 401,322 |
| 15 | `home-empty-zh-TW-390x844-candidate.png` | 395,862 |
| 16 | `landing-zh-TW-390x844-candidate.png` | 393,054 |
| 17 | `shared-corrections-zh-TW-1440x900-2r15-candidate.png` | 388,970 |
| 18 | `tasks-offline-2r15-evidence.json` | 295,768 |
| 19 | `pooled-ja-1440x900-2r15-candidate.png` | 256,946 |
| 20 | `contribution-schedule-ja-1440x900-2r14-dialog.png` | 256,655 |

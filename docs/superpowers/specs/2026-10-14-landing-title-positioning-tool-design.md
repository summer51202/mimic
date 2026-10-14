# Landing — 桌機單行標題定位工具

**日期：** 2026-10-14
**狀態：** 使用者選擇桌機單行 MIMIC，並同意可拖曳定位工具；本文待書面核對，工具尚未實作。
**範圍：** Phase 1 / Landing review-only 溝通工具，不是產品互動或素材核准。

## 1. 目的與已同意方向

沿用 `2026-10-09-landing-a-party-staggered-wordmark-design.md` 的無法師 A 場景。使用者已選定桌機單行，不再要求重新選排列；這個選擇不代表字標落點、亮度、石壁融合或 Scenes family 已核准。

使用者希望直接指出標題的理想位置，而不依賴「上面一點／下面一點」往返猜測。已比較三種溝通方式：

- 可拖曳定位預覽：立即觀察物件關係，輸出可重現的座標，採用此方案。
- 截圖畫框：不用工具，但每次微調都要重新截圖，保留為備用方式。
- 百分比網格：精確但需要人把視覺轉成數字，作為工具輔助而非主要操作。

本輪只移動既有桌機單行字標。大小、素材、亮度、像素顆粒、其他場景物件以及手機版一律不改。

## 2. 放在哪裡、如何呈現

在現有 `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-a-title-review.html` 頂部加入獨立的「桌機單行：標題定位」區塊。原有桌機比較、共同手機版、灰階、參照、exact hashes 與四章日誌保留，作為歷史比較證據。

定位區不是新候選圖或 production 頁面。使用桌機場景固定 16:9 比例，縮放適應容器；即使在窄視窗也顯示同一桌機場景，不依 media query 切換成手機圖。不開新 localhost server，不依賴未知 port。

場景由既有不含標題的桌機底圖加既有透明字標組成，不能拿已含標題的彩色圖再疊一個字標，避免殘影／雙重標題。保留登入、木牌文字、對話框與 CTA 的既有 review-only 呈現，使定位時能觀察實際構圖關係；不新增認證、角色、火把或篝火產品互動。

既有桌機底圖：

- path：`samples/landing-a-title/scene-desktop-logical.png`
- 尺寸：960 × 540 logical pixels
- SHA-256：`ce0d33c06d816ec5c77aa07dcbf846d6d481d83076988cf00f40ff6b42e0f48e`

既有、已套共同色調的桌機單行字標：

- path：`samples/landing-a-title/wordmarks/desktop-single.png`
- 尺寸：288 × 84 logical pixels
- SHA-256：`4ecc5bc6788f34854aac81a54d35b85fad9648c9f9d6499200f825246976ff31`

相對素材路徑以上述 review 資料夾為根。這兩個檔案只讀，不改 bytes。定位不是創意來源稿，不需要重新 ImageGen、重畫 SVG／canvas 或改字形。

## 3. 座標與操作

### 座標規則

- 唯一權威座標為 960 × 540 場景內的字標左上角 `x, y`，單位 logical pixel。
- 初始／還原位置為 `x=385, y=84`；尺寸固定 `width=288, height=84`。
- 顯示輔助中心百分比：`(x + width/2)/960*100`、`(y + height/2)/540*100`，保留兩位小數。初始中心約 55.10%、23.33%；百分比不是輸出重建時的權威值。
- 拖曳以實際圖片內容區轉換，不以 viewport、頁面、容器 padding 或邊框為座標原點。拖曳時保持按下點與字標的偏移，不瞬間把中心吸到游標。
- 位置四捨五入至整數 logical pixel；限制 `0 ≤ x ≤ 672`、`0 ≤ y ≤ 456`，確保整顆字標不被場景邊界裁掉。
- 不限制於原 manifest 的小 wall rectangle，否則無法自由試落點。不自動吸附、移動背景或猜測岩壁可用區。場景邊界限制只防裁切；是否跨洞口、岩縫、蝙蝠、人物或破壞焦點仍需人工目視。

### 拖曳與微調

- 預設啟用定位：只有字標可拖曳，其餘物件鎖住，沒有縮放／旋轉控制。
- 支援 pointer events 與 pointer capture；移出字標仍能完成拖曳。放開、取消、失去 capture、關閉定位或還原時都終止拖曳，不持續跟隨；取消保留最後有效位置。只在拖曳字標時阻止手勢捲動，頁面其他區域仍可正常捲動。
- 字標可 Tab 聚焦，有明確名稱及 focus outline。只在字標聚焦且定位啟用時攔截方向鍵：每次 1 logical pixel，Shift + 方向鍵每次 10；輸入框、其他控制項和整頁捲動不被劫持。
- 提供可點擊的四方向微調按鈕，讓觸控或不易拖曳的使用者也能操作；使用相同的 1-pixel step 和 clamp 規則。
- 每次移動立即更新畫面及數值，不需按套用。文字欄位只讀，不新增座標輸入／匯入功能。

### 輔助線與乾淨預覽

- 輔助線切換：顯示／隱藏字標框、中心十字以及穿過中心的水平／垂直線，輔助層不接收 pointer events。
- 定位模式切換：關閉時不能拖曳／微調且沒有可移動字標的 focus ring；隱藏定位線以呈現乾淨場景。保留座標與複製功能。
- 重新啟用定位後還原先前輔助線偏好；焦點若正在字標上，關閉定位時安全移至模式切換控制。
- 還原按鈕只恢復初始字標位置並刷新數值，不改定位／輔助線偏好，也不還原任何 repository 檔案。

## 4. 複製與後續套用

「複製位置」輸出可讀 JSON，包含：

- 固定 schema 識別 `mimic-landing-title-position/v1`、`reviewOnly: true`。
- frame 識別 `desktop-single`、場景 logical width/height。
- 實際底圖與字標相對 path、SHA-256，避免把座標套到另一輪素材。
- anchor `top-left`、單位 `logical-px`，當前整數 `x, y`、固定 width/height。
- 輔助中心百分比，按前述公式計算。

JSON 同步顯示在可選取的只讀文字區。優先使用瀏覽器 clipboard API；只有成功後顯示「已複製」。若 file URL 權限、不支援或 clipboard 寫入失敗，保留 JSON 並提示手動選取／Ctrl+C，不偽稱成功。位移後清除舊成功提示，避免誤以為剪貼簿也是最新位置。若複製請求仍在等待時位置已變動或還原，完成後明確提示「剪貼簿為先前位置，請重新複製」，不得把舊請求成功當成最新座標已複製；連續請求的狀態只由最新請求更新。

不使用 localStorage，不自動保存到檔案、manifest 或 config。頁面清楚提示重整會回初始位置，請先複製。使用者貼回 JSON 後，agent 才在另外明確授權的步驟中套用並重新合成審核圖；本工具不自動核准、生成 production exports 或提升 runtime。

## 5. 實作分界與失敗行為

採現有靜態 review renderer 的增量方式，不另建 framework app：

1. 可獨立測試的純定位數學／payload 模組：負責整數化、clamp、拖曳換算、步進與序列化，不讀寫 repository。
2. 瀏覽器定位 controller：負責圖片就緒、pointer／keyboard／toggle／clipboard 與單一位置 state。
3. 現有 renderer 增量加入定位區及 self-contained script；增加 renderer-only 產頁方式，只讀既有 manifest／素材，不為 UI 修改重跑素材生成器。

頁面須在既有 `file:///D:/Project/mimic/.../landing-a-title-review.html` 可使用；必要 metadata 隨 HTML 嵌入，不依賴 fetch、遠端 CDN、file URL ES-module import 或後端服務。JSON 以安全文字方式顯示，不把 payload 當 HTML 或可執行程式。

底圖或字標缺失、載入失敗或尺寸與 metadata 不符時，顯示明確錯誤，停用拖曳／微調／複製，不顯示「可重現」假位置。不替換成另一張圖。定位 UI 不與原有三個 `.scene` 的歷史 contract 混用；避免 broad selectors 影響既有 overlay／UI。

## 6. 驗收與驗證

實作前建立 failing contracts，依 test-driven-development 再寫程式。至少驗證：

- 初始 385/84、固定 288/84、960/540 圖片、無舊字標殘影；底圖／字標／所有既有素材 hashes 不變。
- 拖曳偏移、不同顯示比例、整數化、四方向 step／Shift step、四邊 clamp；焦點外不攔截方向鍵，pointer release/cancel 正確終止。
- 模式與輔助線獨立偏好、乾淨預覽、焦點處理、還原、JSON 與畫面位置一致。
- 真實 clipboard 成功、拒絕／缺失 fallback，不以 stub 成功掩蓋失敗；位移後複製提示失效，延遲完成／連續請求不冒稱最新位置已複製。
- 圖片載入失敗／尺寸不符會停用控制，而既有比較頁仍可閱讀。
- 320／390／768／1440 Playwright：定位區始終桌機比例、圖片載入、拖曳座標換算、可操作控制、無水平溢位；原三個 scene、共同手機和四章日誌 contract 仍通過。
- focused Vitest、相關 ESLint／typecheck、renderer-only 連續兩次 byte-identical HTML、`git diff --check`、本輪新檔 whitespace 與實際截圖目視。

使用 repository self-review 修正重要問題；宣稱完成前依 verification-before-completion 取得實際命令輸出。實作後以 AGENTS.md 格式增補 devlog，保留原文 bytes。完整 production build 與帳務 full suites 不由靜態 review 工具成功推論。

## 7. Dirty 保護與停止點

Inline Execution，不建立 worktree，不使用 subagent。保留目前 main 的既有 dirty、staged、untracked 與歷史 review；不觸碰、暫存或提交 `.codex-remote-attachments/`、`reference/`，不使用 `git add .`。

本文件為可獨立提交的新規格；只以 exact path 提交，既有 index 不混入。後續既有 untracked renderer／HTML／tests 若改動，保留原內容並最小增量；不為製造乾淨 commit 而重建舊檔。若不能安全拆分，實作留為未提交修改。

不改素材 bytes、現有 manifest/config 座標、手機落點、runtime source、`web/public`、asset registry、PWA manifest、service worker、產品頁面、Home、帳務、角色互動、production exports 或 Phase 2。新工具仍 reviewOnly；Scenes／素材仍 awaiting-calibration，runtimePromotion false。

書面規格核對後才寫實作計畫。實作完成並驗證後，開啟同一 review 頁，說明如何操作與複製位置，停止等待使用者實際定位回饋。工具完成不代表標題位置已核准。

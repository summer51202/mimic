# 像素回歸標準做法

- 來源：公會 Phase 的 spec 2R2–2R17（`docs/superpowers/specs/2026-11-19-phase-guild-design.md`）和 2I-b 的經驗整理而成。公會 Phase 停了 17 次，全部都是比對規則沒涵蓋到的情況，實作一次都沒錯。
- 適用：所有視覺輪。spec 的「驗證」一節直接引用本文件，只寫該輪特有的頁面、資料與預期差異。
- 容差：**一律 0**（RGB，每個通道）。只有 Ed 明確同意，才可以放寬。

---

## 1. 環境
- 基線：上一個核准 commit 的乾淨 worktree（`.tmp/<phase>-base-<sha>/`），用 production build。候選也用 production build。
- 同一個 API、同一份測試資料、同一個 Chrome。後端也有變更時分兩組：
  - **A 組**：候選 web 對基線 web，兩邊都接基線 API；
  - **B 組**：候選 web 分別接候選 API 與基線 API。
- Chromium **一律**加上軟體繪製旗標，基線、候選、對照都用同一組：
  `--disable-gpu --disable-gpu-rasterization --disable-partial-raster --force-color-profile=srgb --disable-lcd-text`
  沒加這組旗標時，頁面其他部分改變後，沒改過的元素也可能出現 ±1 的抗鋸齒差。
- 語言：用 cookie `mimic-locale` 切換 zh-TW／en／ja。
- 視窗：320×568、360×800、390×844、768×1024、1024×768、1440×900。
- 用 Pillow 比對時要先轉成 RGB，或逐通道判斷：RGBA 的 `getbbox()` 只看 alpha。

## 2. 每一格的順序
1. **量寬度**：基線與候選的 `document.scrollingElement.scrollWidth`。
   - 候選大於視窗寬：停止，這是回歸；
   - 基線大於視窗寬（既有溢出）：這一格改用「DOM＋候選不溢出＋fixed 比對＋Ed 目視」，並找出撐寬的元素寫進 verification。
2. **比 DOM 文字**：用 `TreeWalker(document.body, SHOW_TEXT)` 依序記錄父元素路徑＋文字，兩邊必須相同。預期新增的文字、預期的路徑變化要逐條列出。
3. **伺服器時間戳**（Home、任務板的 asOf）：基線與候選連著拍一對；UTC 秒數 ≥ 40 時等到下一分鐘再開始；asOf 不同就整對重拍，最多 3 次。不遮罩、不攔截 API。
4. **比像素**：見 §3、§4。

## 3. 零差異頁
- 整頁 RGBA 逐像素相同。
- 相同的成對截圖不進 git：移到 `.tmp/<phase>-pixel-archive/`，commit 一份 SHA-256 清單，每類只留一組 390×844 範例。

## 4. 預期差異頁
預期會改變的元素稱為 E。

1. **E 的比對區域**（兩邊都算，取聯集）：
   - `[top, max(兩邊 E 的下緣))` × E 的左右範圍；
   - E 自己的繪製外溢：每一層非 inset 的 `box-shadow`（平移 x、y，再往外擴 `spread＋ceil(1.5×blur)`）、可見 `outline`（`width＋offset`），用 `getComputedStyle` 算；
   - E 內每個文字節點用 `Range.getClientRects()` 量出的矩形，四邊各往外擴 2 px（字形可能畫出文字框外，例如 V、W）。
2. **墊高**：E 的高度有變時，**較矮的那一邊**在 E 上把 `margin-bottom` 加 `|Δ|`，用小數、不四捨五入，寫成 `calc(<原值> + <小數>px)`。
   - **永遠不用負 margin**：較高那一邊的 E 內容會蓋到被拉上來的內容；
   - 這只是擷取腳本的量測操作，不改產品程式；
   - 有多個 E 時依文件順序累計；每個 E 的 top／bottom、最後一個 E 之後第一個 flow 元素的 top，誤差都要 ≤ 1/64 px，頁高要相同。
3. **E 以外的所有像素**（E 上方、兩側、之間、下方）：兩張墊高後的圖用同一座標比對，容差 0。
   - 不要拿原始基線直接位移去比：頁面背景會隨頁高變化，tile 對齊也會產生 ±1 的抗鋸齒差。
4. 視覺審核用的截圖一律是**沒墊高**的原圖。

## 5. fixed／sticky 元素
computed `position` 是 `fixed` 或 `sticky` 的元素（頂欄、桌機側欄、底部導覽、浮動記帳鈕、記帳小夥伴…）。整頁截圖時，它們不會跟著內容位移。

1. **繪製遮罩**＝DOM rect ∪ 每層陰影 rect ∪ outline rect，取**聯集**，不要用外接矩形：外接矩形的角落會露出會位移的內容。
2. 比對 E 以外的區域時，兩邊的遮罩都要排除。
3. 遮罩內另外做不位移比對，兩邊捲動位置要一致，結果必須逐像素相同；但遮罩和 E 重疊的部分歸給 E，不在這裡比。
4. **每個元素**至少要在一張截圖裡做到「和 E 的重疊 ≤ 25%，其餘部分逐像素相同」。
   - 原始整頁截圖已經做到的，不用補拍；
   - 做不到的，補拍視窗截圖：捲動位置依序試最大捲動、0、再以視窗高的一半為間隔掃描，選第一個讓所有還沒驗到的元素都達標的位置；
   - 所有位置都不行才停止。

## 6. 證據
- 每一頁一份 JSON：
  - 每個 E 的基線／候選 rect、外溢矩形、墊高量、累計位移；
  - 每個 fixed／sticky 元素的遮罩成員、重疊比例、在哪一張截圖被驗到；
  - 每一步的差異數與 bbox。
- 審閱資料夾只放：每一格的最後一版候選、證據 JSON、`verification.md`。base／control／padded 圖和中間版本都移到 `.tmp/` 封存，SHA-256 留在 `pixel-regression-sha256.txt`。

## 7. 停止點
- 任何一步的差異落在允許範圍外，就停下。保存三張原圖（基線、墊高對照、候選）和差異座標、RGB 值。
- 小德會先自己重算。如果是規則沒涵蓋的情況、而且不需要放寬標準，小德直接補寫 2R；需要放寬（例如容許 ±1），先問 Ed。

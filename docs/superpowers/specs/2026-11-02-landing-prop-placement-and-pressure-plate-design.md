# Landing 道具擺位工具與壓力板重繪

日期：2026-11-02。狀態：使用者同意方案 A＋C（拖放擺位工具＋壓力板重繪）；尚未實作。

## 背景

寶箱 v04 已核准（decision-log 2026-11-02）。依 2026-10-09 規格，寶箱、地圖木箱與壓力板位置留到本輪處理。現況（桌機 960×540 邏輯座標）：

| 圖層 | 桌機 [x, y, width] | 手機 |
|---|---|---|
| chest（v04，104×120 包絡） | origin (92,230)，ground (144,350) | 不在初始畫面 |
| mapCrate（113×63／手機 79×44） | [235,281,113] | [20,286,79] |
| pressurePlate（67×14，opacity 0.85） | [850,339,67] | 不在初始畫面 |

審閱觀察：

1. 寶箱、地圖木箱、戰士、篝火、Mimiku、木牌底緣幾乎都落在畫面約 60% 高的同一水平帶，缺少前後景深；對話框（桌機底部 18–22%）以上仍有一段閒置地板。
2. 寶箱緊貼左樓梯與大石，且與地圖木箱並排，兩個木箱輪廓相近而黏在一起；寶箱是互動物件，目前位置最不顯眼。
3. 壓力板是冷灰色扁平石板，在暖色場景中讀起來像門墊，實際尺寸下難以辨識為機關。
4. 右半部（Mimiku、遊俠、木牌、右通道、壓力板）較擁擠。

## 設計依據（不變）

- 2026-09-14 規格：初始互動物件為火把、蝙蝠、壓力板／陷阱、寶箱與隱藏壁畫；各自只有短暫視覺回饋與一句 Mimiku 台詞，不給貨幣、成就或財務效果。
- 2026-10-05 規格：壓力板是右通道附近**無害的舊遺跡**，可讀性來自接縫、磨損邊與少量可見機械間隙；**不得**有愛心、箭頭、骷髏、警告標誌或發光符號。
- 手機初始畫面聚焦小隊、地圖與木牌；左右探索物（寶箱、壓力板）透過水平探索進入，不放進手機初始畫面。
- 對話框不得遮住臉、篝火、Mimiku 與主要木牌。

## C — 壓力板重繪（先做）

- built-in ImageGen 新增 pressure plate v02 來源，保存全部原始嘗試、prompt 與 lineage；v01 唯讀保留。
- 暖色調：與周圍地面同色系（暖灰褐／赭石），不是冷灰；以略深的四周接縫、一側較亮的磨損邊、以及一條可見的下沉間隙或略高於地面的板面表達「機關」。
- 形狀：舊的長方形石板，可由 2–3 塊拼成，透視與地面一致；可微幅放大（建議寬 72–80、高 16–22 邏輯像素），以 1× 可辨識為準。
- 禁止任何警告符號、骷髏、箭頭、愛心、發光、文字；不暗示危險。
- 像素語法與戰士、寶箱 v04、地圖木箱一致；透明背景、binary alpha、透明像素 RGB 為 0。
- review：1×／4×／真實灰階、v01 對照、放在現位置的桌機場景。此步只審外觀，不審位置。

## A — 道具擺位工具

擴充既有 Landing 標題定位工具的模式（`landing-title-position.*`），新增獨立道具擺位頁；舊工具與其輸出唯讀保留。

可移動物件：

- 桌機：chest（v04，以 ground anchor 擺放，可切換八格中任一格預覽，尤其 closed 與 open）、mapCrate、pressurePlate（使用 C 選定的新來源；未選定前用 v01）。
- 手機：只有 mapCrate。

工具需求：

- 指標拖曳、鍵盤／按鈕微調（1 px 與 10 px）、重設、各物件獨立座標，並沿用標題工具的剪貼簿 JSON 回執、隱藏 frame 不可操作、失敗圖片停用等行為。
- 導引層（可切換）：對話框區域（桌機底部 22% 保守值）、地板可行走帶、其他人物／篝火／Mimiku／木牌／標題的外框，以及禁止遮擋區。
- 即時警示（不阻擋拖曳）：物件進入對話框區、遮到臉／篝火／Mimiku／木牌、腳底離開地板帶、超出畫面或寶箱 open 狀態蓋子超出允許範圍。
- 圖層順序依 y 自動前後排序，並在 JSON 中記錄。
- 不縮放、不旋轉（若擺位後需要調整大小，另開一輪）。
- 回執 JSON 包含 frame、物件 id、座標、來源 hash 與警示清單。

## 交付與停止點

1. C：壓力板候選 → 使用者審外觀 → 選定。
2. A：工具完成 → 使用者拖放並回傳 JSON。
3. 另一輪依 JSON 套用位置，產出新的桌機／手機場景 review（比照 2026-10-15 標題位置套用）。

## 凍結範圍

標題位置（桌機 376/100、手機 130/59）、所有人物、篝火、Mimiku、木牌、背景、火把、蝙蝠、壁畫、對話框規格與寶箱 v04 圖稿不變。不修改 web/public、runtime、registry、PWA、service worker、產品頁或帳務；不標示 approved；不做 production exports／Phase 2。不使用 worktree／subagent，不 stage／commit 實作與產物；新增檔案獨立，devlog 只追加。驗證比照既有 review：focused Vitest、ESLint、typecheck、四 viewport Playwright、byte-identical 重建。

## 壓力板 ImageGen prompt（v02 attempt-01）

```text
Use case: stylized-concept. Create ONE small transparent pixel-art game prop: an old, harmless stone pressure plate set flush into a warm cave floor, seen from the same gentle front-top perspective as the supplied scene. Image1 is the actual cave scene for perspective, floor colour and scale only; do not reproduce the scene. Image2 (warrior) and Image3 (approved treasure chest) are pixel-style references only; do not draw them.

Design: a rectangular plate made of 2-3 fitted worn stone slabs, warm ochre/umber-grey stone matching the surrounding floor hue, NOT cool grey. Readable as a mechanism through: a slightly darker continuous seam around its edge, a narrow visible sunken gap along the front edge, one softly rubbed lighter edge where feet have stepped, and a plate surface very slightly raised or recessed relative to the floor. It looks like an ancient, long-inactive remnant, harmless, not threatening.

Strictly NO skulls, arrows, hearts, warning signs, runes, glow, symbols, text, spikes, blood, cracks spreading out, or extra props. Final size about 76 x 18 logical pixels; designed as low-resolution pixel art from the start, shown enlarged with hard square pixel edges. Fine deliberate stepped clusters like the references, selective dark-brown outline only where it helps, 2-3 tones per material, no blur, antialiasing, gradients, noise or photoreal texture. Genuine transparent background; no ground patch extending beyond the plate's own rim.
```

## C 修訂 — pressure plate v02 attempt-04（2026-11-02）

使用者審閱 v02 候選（attempt-03，SHA-256 `9be635235f59d04107827569c372346508cea8423d65143575ee72039b0101ab`）後要求再修一輪。保留其三塊石板、凸起邊框、無威脅符號、80×18 畫布、origin (850,339)、opacity 0.85 與所有凍結範圍；attempt-01～03 原檔唯讀保留，新嘗試另存並更新 lineage。

### 修正 1 — 前緣下沉間隙

v02 主要靠邊框表達，讀起來像石板底座，不像可被踩下的板子。v01 前緣那道明顯深色縫隙是較好的機關提示。

- 沿板子**前緣（朝觀者的長邊）**加一道連續、深暖褐近黑的下沉間隙，1× 時至少 1 px 高、橫跨板寬約 80% 以上；左右短邊可有較淡的延續。
- 板面看起來略高於間隙、略低於周圍地面邊框，讓「按下去會沉」的關係成立。
- 間隙是陰影縫，不是發光、不是尖刺或孔洞陣列。

### 修正 2 — 色調靠近地板

場景實測（桌機 v02 場景、板內 vs 周圍地板環帶的平均 HSV）：板 S 0.474、V 0.578；地板 S 0.695、V 0.542。板子偏灰白。

- 提高石材暖度與飽和度，往地板的赭橘褐靠攏；目標在同一量測方式下板內平均 **S ≥ 0.58**，並維持**明度略高於地板（V 差 0.02–0.08）**，讓可點物件仍能被找到。
- 磨亮邊仍可略亮，但不得變成亮米白或冷灰。

### 驗收

- 新增 contract：場景內板子與地板環帶的平均 S／V 量測（上述門檻），v02 attempt-03 作為負向對照必須失敗 S 門檻。
- review 頁加上 attempt-03 對照、1×／4×／灰階、實際場景與前緣放大。
- 其餘驗證比照 C：focused Vitest、ESLint、typecheck、四 viewport Playwright、byte-identical 重建；停在外觀審核，不開始 A。

### ImageGen prompt（attempt-04，編修 attempt-03）

```text
Use case: precise-object-edit. Image1 is the pressure plate to refine; keep its three fitted worn stone slabs, raised surrounding rim, perspective, footprint, pixel grammar and harmless ancient-remnant character. Image2 is the actual warm cave scene for floor colour reference only; do not reproduce it. Genuine transparent background.

Make exactly TWO corrections:
1. MECHANISM GAP: along the FRONT long edge facing the viewer, add one continuous narrow dark warm-brown, near-black recessed gap running across at least 80% of the plate width, about one final pixel tall, with a fainter continuation along the short side edges. The slabs should read as sitting slightly proud of that gap and slightly lower than the surrounding rim, as if they would sink when stepped on. A shadowed seam only: no glow, spikes, holes, symbols or text.
2. WARMER STONE: shift the slab and rim stone toward the cave floor's warm ochre / orange-umber hue with clearly more saturation, so it no longer looks grey-beige against the floor. Keep it only slightly lighter than the surrounding floor so it remains findable; worn stepped edges may be a little lighter but never pale cream or cool grey.

Change nothing else. No skulls, arrows, hearts, warning signs, runes, glow or extra props. Hard square pixel edges, fine deliberate clusters, 2-3 tones per material, no blur, antialiasing, gradients or noise.

## C 修訂 — pressure plate attempt-05：視角對齊右側通道（2026-11-02）

使用者審閱 attempt-04（selected retry SHA-256 `6186839b101bbad448f6fe22e181652a61ed3168942f3490226b413aab5fab16`）後指出視角錯誤。attempt-04 的顏色（板 S 0.70、V 比地板高約 0.05）與前緣縫隙均達標，予以保留；attempt-01～04 原檔、review 與 contract 唯讀保留。

### 問題

右側通道樓梯的每階前緣大致水平，但階梯整體往**右上**堆疊進通道，表示該處地面的深度軸往右上傾斜；地板石塊也以斜向排列。壓力板卻是**左右對稱、兩短邊向中間收的梯形**（正對鏡頭的一點透視），看起來貼在畫面上，與腳下地面及緊鄰的樓梯不在同一空間。

### 目標形狀

- 前、後兩條長邊保持水平，平行於樓梯踏階前緣。
- 左、右兩條短邊**朝同一方向（往上時向右）傾斜**，彼此平行，平行於樓梯側緣的堆疊方向；整體為往右傾的**平行四邊形**，像是順著通道鋪在入口前。
- 三塊石板的分隔線也沿同一深度方向傾斜（與短邊平行），不再呈放射狀。
- 前緣縫隙沿前方長邊，規則同 attempt-04；左右短邊縫隙較淡。

### 先量測、後生成

1. 從實際場景 architecture（不含 prop 圖層）量出右側樓梯最下方 2–3 階**左側邊緣**的斜率 dx/dy（往上一列時向右移的像素數），記入 manifest；目測估計約 0.8–1.0。
2. 依此斜率產生一張平行四邊形**輪廓導引圖**（僅外框與三格分隔線，無材質），作為 ImageGen 參照之一，保存於 derivations 並記入 lineage。
3. 允許畫布加寬以容納傾斜（例如約 92×18）；前方長邊的左端點與寬度盡量維持 attempt-04 的落點，origin 隨畫布調整並記錄。opacity 0.85 不變。

### 驗收

- **斜率 contract**：由 sprite alpha 量出左、右短邊的外緣斜率，兩者同號（往上向右），且各自落在量得的樓梯斜率 ±25% 內；兩短邊斜率差 ≤ 20%。attempt-04 作為負向對照必須失敗（左右異號）。
- 保留 attempt-04 的色彩 contract（同一固定遮罩下板 S ≥ 0.58、V 比地板高 0.02–0.08）與前緣縫隙 contract（前緣連續深色列 ≥ 80% 寬）；遮罩需隨新形狀調整並記錄。
- review 頁：attempt-04 對照、1×／4×／灰階、導引圖疊合、場景實際大小與樓梯口局部放大。
- 其餘驗證比照 C；停在外觀審核，不開始 A。

### ImageGen prompt（attempt-05，編修 attempt-04）

```text
Use case: precise-object-edit. Image1 is the pressure plate to redraw in a new perspective. Image2 is a flat outline guide giving the REQUIRED outer shape and slab divisions. Image3 is the actual cave scene for perspective and floor colour reference only; do not reproduce it.

Keep from Image1: the warm ochre/orange-umber stone colours and tonal values, three fitted worn stone slabs, the thin raised rim, the continuous dark recessed gap along the FRONT long edge, the harmless ancient-remnant character, pixel grammar and genuine transparent background.

Change the PERSPECTIVE ONLY: the plate lies on the cave floor in front of a stairway that recedes up and to the RIGHT. Draw it as a parallelogram exactly following Image2: the front and back long edges stay horizontal; the left and right short edges are parallel to each other and BOTH lean to the right going upward (away from the viewer), matching the stairs' receding direction. The two slab dividing seams lean the same way, parallel to the short edges. It must NOT be a symmetric trapezoid and the short edges must NOT converge toward the centre.

No skulls, arrows, hearts, warning signs, runes, glow, text or extra props. Hard square pixel edges, fine deliberate clusters, 2-3 tones per material, no blur, antialiasing, gradients or noise.
```

## C 修訂 — pressure plate attempt-06：對齊地板石磚的菱形（2026-11-02）

使用者審閱 attempt-05（selected retry-02 SHA-256 `d2902a1277831ddd88b779852949ee34c79b6c83650cf44fb3d3ceaeca36c9b4`）後說明：期望形狀是**與地板石磚相同的菱形**，不是平行四邊形。attempt-05 的「前後長邊水平、短邊沿樓梯斜」是依樓梯推導的錯誤規格，**取代**上一節的目標形狀與斜率 contract。attempt-01～05 原檔、review 與 contract 唯讀保留。

### 地板石磚觀察（審閱者目測，需由實作量測確認）

場景地板石磚是扁平菱形：長對角線水平，左右兩端與上下兩端各有頂點；寬約為高的 2.5 倍，四邊斜率約 dy/dx = ±0.4，左右對稱（左上與右下邊平行、右上與左下邊平行）。這是整片地板的網格方向，與單一樓梯無關，因此壓力板日後在地板上任意移動都不會破壞透視。

### 目標形狀

- 壓力板外形為**與地板石磚同斜率的扁平菱形**：長對角線水平，上下頂點在垂直中線上，左右對稱。
- 尺寸：長對角線約 80–88 邏輯像素，短對角線依量得比例推得（以 2.5:1 估計約 32–35）；可依石磚實際大小微調，約為 1.5–2 塊石磚的大小。
- 三塊石板改為沿**同一組邊方向**切分（分隔線平行於其中一組對邊），像地板石磚般拼接；也可改成 2×2 菱形拼接，以視覺較自然者為準並記錄。
- 前緣縫隙改為沿**朝向觀者的兩條下邊**（左下邊與右下邊）的連續深色下沉縫，上兩邊較淡或無。
- 保留 attempt-05 的暖赭色調、低調磨損與無威脅性；**減少**石面上的深色斑塊，改為少量石紋，避免讀成生鏽鐵板。
- opacity 0.85 不變；畫布與 origin 依新形狀重算並記錄，菱形中心盡量維持 attempt-05 板面中心的位置。

### 先量測、後生成

1. 從 architecture-only 場景，在壓力板附近與畫面中段各取至少 5 塊清楚的石磚，量出四邊斜率 dy/dx 與寬高比，記入 manifest（含所選石磚座標與標註圖）。
2. 依量得平均值產生菱形**輪廓導引圖**（外框＋分隔線，無材質），作為 ImageGen 參照，保存並記入 lineage。

### 驗收

- **菱形 contract**：由 sprite alpha 量出四條外緣斜率；左上／右下邊與右上／左下邊兩組各自平行（斜率差 ≤ 15%），兩組斜率互為相反號、絕對值各在量得石磚斜率 ±20% 內；上下頂點水平位置差 ≤ 2 px（左右對稱）。attempt-05 必須作為負向對照失敗（有水平邊）。
- 顏色 contract 保留：固定遮罩（隨新形狀調整並記錄）下板 S ≥ 0.58、V 比地板高 0.02–0.08。
- 縫隙 contract 改為：左下與右下兩邊各有連續深色縫，覆蓋各邊長 ≥ 80%。
- review：attempt-05 對照、1×／4×／灰階、導引圖疊合、**旁邊並排一塊真實地板石磚的放大比較**、場景實際大小與局部。
- 其餘驗證比照 C；停在外觀審核，不開始 A。

### 對 A 的影響

壓力板對齊地板網格後，擺位工具不需把它限制在右側通道附近；但仍需遵守對話框、遮擋與地板帶等通用警示。

### ImageGen prompt（attempt-06，編修 attempt-05）

```text
Use case: precise-object-edit. Image1 is the pressure plate to redraw in a new shape. Image2 is a flat outline guide giving the REQUIRED outer shape and slab divisions. Image3 is the actual cave scene: copy the shape and angle of its FLOOR STONE TILES; do not reproduce the scene.

Keep from Image1: the warm ochre/orange-umber stone colours and values, thin raised rim, harmless ancient-remnant character, pixel grammar and genuine transparent background.

Change the SHAPE: the plate is a flat stone slab set into the floor in the same projection as the floor tiles in Image3: a wide, flat DIAMOND (rhombus) with a horizontal long diagonal, pointed left and right ends and pointed top and bottom vertices, left-right symmetric, about 2.5 times wider than tall, following Image2 exactly. All four edges are slanted; there are NO horizontal or vertical edges. Divide it into fitted stone pieces whose seams run parallel to the diamond's edges, like the floor tiles. Put one continuous dark recessed gap along BOTH lower edges facing the viewer (lower-left and lower-right), so the plate looks like it would sink when stepped on. Reduce the dark blotchy patches on the stone surface to a few subtle stone marks so it reads as worn stone, not rusty metal.

No skulls, arrows, hearts, warning signs, runes, glow, text or extra props. Hard square pixel edges, fine deliberate clusters, 2-3 tones per material, no blur, antialiasing, gradients or noise.

## 決定：移除壓力板（2026-11-03）

使用者實際在擺位工具中嘗試後，決定放棄壓力板這個互動道具。後續擺位套用只處理寶箱（桌機）與地圖木箱（桌機／手機）；壓力板圖層自 Landing 場景移除，attempt-01～06 僅作歷史保存。詳見 decision-log 2026-11-03「Landing pressure plate removed」。

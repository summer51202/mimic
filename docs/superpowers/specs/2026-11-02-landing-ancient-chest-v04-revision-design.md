# Landing 古老珍藏寶箱 v04 — 開蓋節奏、扣鎖機構與修補可讀性修訂

日期：2026-11-02。狀態：使用者已審閱 v03 並選擇「三點都修」（方案 C）；v04 圖稿尚未生成，仍 awaiting-calibration。

## 背景與審閱結論

v03（`ancient-treasure-chest-review.html`，family-source SHA-256 `93a3096fd29ae343d833cc5921bcc6a3740d824af4765f856fb8f762a217f170`）的整體方向維持：低調古老、修整後續用的胡桃木寶箱、兩道窄暗鐵箍、細長機械扣鎖、金幣為主與少量藍綠寶石、與戰士及地圖木箱同調。八格下半部對位、共同尺度與包絡外零差異均正確。

v03 不標示 approved。以下三點必須在 v04 修正，其餘一律不動。

### 問題 1 — 開蓋角度分配失衡（最高優先）

以 v03 2× sprite（208×240）的 alpha bounding-box 頂端實測：

| frame | closed | latch-release | unlatched | cracked | half-open | opening-wide | near-open | open |
|---|---|---|---|---|---|---|---|---|
| bbox top (2×) | 114 | 112 | 112 | 110 | **92** | 90 | 86 | 82 |

cracked→half-open 一步上升 18 px，佔 cracked→open 總上升 28 px 的 64%；其後三步合計僅 10 px，half-open／opening-wide 幾乎重複。播放感受為「彈開後卡住」。v03 attempt-03 prompt 雖已要求 0/0/0/10/40/60/75/90°，生成結果未遵守，因此 v04 必須以量測驗收而非只靠 prompt。

### 問題 2 — 開蓋後扣鎖位置違反機構

扣鎖鉸接於蓋子**外側正面下緣**。蓋子繞後鉸鏈向後翻開後，外側面朝後／朝上，扣鎖應隨蓋緣移到開啟蓋的**自由上緣**，觀者主要看到蓋子內側。v03 frames 5–8 把扣鎖畫在**蓋內側正中央**，屬機構錯誤。

### 問題 3 — 唯一修補處在實際尺寸不可讀

規格要求「修復只留一處」以承載「被小隊修好」的故事，但 v03 在 1×（104×120）與場景中無法辨識修補位置。

## v04 目標

### 1. 開蓋角度（目標與量測驗收）

目標蓋角：closed／latch-release／unlatched 0°，cracked 約 12°，half-open 約 35°，opening-wide 約 58°，near-open 約 80°，open 約 100°（靜止、略過垂直、由後鉸鏈支撐）。

量測驗收（2× sprite alpha bbox 頂端，cracked→open 五格）：

- 單調不下降：每一步上升 ≥ 0。
- 任一步上升不得超過 cracked→open 總上升的 **40%**。
- half-open、opening-wide、near-open 三格兩兩至少相差 **3 px（2×）**，不得近似重複。
- cracked 仍是「窄縫」：cracked 相對 unlatched 上升 ≤ 總上升的 25%，且可見內部縫隙。

註：蓋角超過約 90° 後頂端高度可能趨平，因此 open 相對 near-open 的差異以「蓋面明顯後傾、可見更多蓋內側」做人工視覺確認，量測只要求不下降。

### 2. 扣鎖機構

- frame 1：扣鎖垂下扣在箱身 staple 上。
- frame 2：蓋未動，扣鎖向外掀起一半。
- frame 3：蓋未動，扣鎖完全向上翻離 staple。
- frame 4（cracked）：扣鎖仍連在蓋外側下緣，隨蓋微抬並離開箱身。
- frames 5–8：扣鎖位於**蓋子外側面**、隨蓋緣移動；在 open 狀態只能以小段剪影露出於開啟蓋的**自由上緣**（或因被蓋體遮擋而不可見）。**禁止**出現在蓋內側面中央。
- staple 固定於箱身正面，八格位置與像素完全相同（沿用既有 lower-body 重用規則）。
- 關蓋時序維持：蓋閉合後扣鎖才落回。

### 3. 修補可讀性

修補維持「只有一處、整合不突兀」，位置固定為**左下角**（左側端板與正面交會處），八格相同：

- 一塊較新、明度略高、木紋較少的補換木板（同色相胡桃木，稍淺、較不磨損），與老木板形成可辨的明度差。
- 一片形狀與原鐵件不同的小補強鐵片，使用不同的固定方式（例如兩顆方釘，對比原本的圓鉚釘）；暗鐵色，**不可**亮銀、金色或新增裝飾。
- 可讀性驗收：在 1× sprite 與真實灰階中，修補範圍至少約 8×6 邏輯像素，可辨識出與周圍老木的明度或結構差；於桌機場景實際大小肉眼可指認位置。

## 不變更（凍結範圍）

沿用 2026-10-20 古老珍藏寶箱規格的全部凍結條件：

- 材質、色板、像素語法、朝向、四主狀態／四過渡幀、金幣與寶石內容與數量級。
- 桌機 960×540；共同 104×120 包絡、origin(92,230)、ground(52,120)、world ground(144,350)。
- 桌機標題 (376,100,288,84)、手機標題 (130,59,148,98)；手機所有圖、其餘人物、背景、篝火、地圖木箱、陷阱、UI 完全不動。
- 播放節奏：開 750 ms／關 660 ms 總長不變；逐段時間先沿用 v03 config，若均勻化後觀感需要再調，必須在 review 頁明列並由使用者決定。
- 不修改 web/public、runtime、asset registry、PWA manifest、service worker、產品頁或帳務；不標示 approved；不做 production exports／Phase 2。

## 執行調整（沿用既有計畫）

依 `docs/superpowers/plans/2026-10-20-landing-restored-treasure-chest.md` 與 2026-10-20 古老寶箱規格的交付／驗證流程，另存 **v04**；v01–v03 的來源、輸出、管線、規格、計畫與測試全部唯讀保留。

- [ ] 唯讀基線：記錄所有既有 scoped 檔案 hash 與 staged binary diff hash；devlog 原位元組為 exact prefix。
- [ ] ImageGen：以 v03 `family-source.png` 為**編修目標**，戰士 master 與場景戰士為風格參照，使用下方 prompt。每次嘗試原檔不改動地存於 `samples/derivations/treasure-chest-states-v04/attempt-NN.png`，`prompt.md` 與 `lineage.json` 記錄真實 generate／edit 關係；選定者複製為 `family-source.png`。若需逐列或逐格修訂，最終仍須是單一規則 lattice、單一共同 transform，不允許逐格 crop-fit、位移或縮放。
- [ ] 先寫失敗測試（RED）：新 manifest／HTML 缺失；**新增開蓋進度 contract**（上述四條量測規則），並以 v03 sprites 作為對照驗證 v03 會失敗（證明量測有效）。
- [ ] 新增 `compose-ancient-treasure-chest-v04.mjs`（或以版本參數化的新入口，不改寫 v03 檔），產出 `samples/treasure-chest-states-v04/` 下 49 張 PNG、獨立 manifest／review HTML／verification receipt；v03 overwrite guard 規則照舊。
- [ ] review 頁：v04 八格實際大小／2×／真實灰階、**v03 對照列**、開蓋進度量測表、修補位置的 1× 與 4× 局部放大、戰士參照、原場景與未改手機。
- [ ] 驗證：focused Vitest、ESLint、typecheck、四 viewport（320/390/768/1440）Playwright、兩次直接 Node rebuild byte-identical、尺寸／透明 RGB／共同尺度／包絡外零差異。
- [ ] 人工視覺檢查：逐格確認扣鎖不在蓋內側、open 蓋明顯後傾、修補在場景中可指認。
- [ ] self-review 後追加 devlog；停在整組視覺審核，不自動 approved、不升 runtime。

不使用 worktree／subagent；不 stage／commit 實作與產物（規格可依慣例獨立 commit）；不觸碰 attachments/reference。

## ImageGen prompt（v04 attempt-01，編修 v03 family-source）

```text
Use case: precise-object-edit. Image1 is the approved-direction treasure-chest animation sheet to refine (4 columns x 2 rows, row-major, transparent). Image2 and Image3 are warrior pixel-style references only; do not draw the warrior. Preserve Image1's antique dark walnut wood, quiet broad planes, two narrow warm charcoal iron hoops, arched lid, slim elongated hasp, small dull gold coins and one small blue-teal gem cluster, front-left perspective, pixel grammar, colors and exact lattice. Keep the RIGID LOWER BODY, feet, staple, width, height, horizontal center and bottom baseline IDENTICAL in all eight cells. Never rescale or recenter any cell. Genuine transparent background. No room, characters, text, glow, ground, shadow platform or extra props.

Make exactly THREE corrections to the whole coordinated family:

1. EVEN LID MOTION. Lid rotates about the connected rear hinge. Lid angles must be: frame1 0, frame2 0, frame3 0, frame4 about 12 degrees (narrow slit, dark gap visible), frame5 about 35 degrees, frame6 about 58 degrees, frame7 about 80 degrees, frame8 about 100 degrees (resting slightly past vertical). The lid's highest point must rise in roughly EQUAL steps from frame4 to frame8. Frame5 must NOT already look mostly open; frames 5, 6 and 7 must be clearly different angles, never near-duplicates. Lid stays the same size and shape, only rotated; it never slides or floats.

2. CORRECT HASP MECHANICS. The hasp is hinged to the OUTER FRONT lower edge of the lid. Frame1 hasp down on the staple; frame2 lid shut, hasp swung out halfway; frame3 lid shut, hasp flipped up clear; frame4 hasp still on the lid's outer front edge, lifted with the lid. In frames 5-8 the hasp stays on the lid's OUTER face and travels with the lid's free edge: as the lid swings back, the outer face turns away from the viewer, so in frames 7-8 only a small tip of the hasp may peek above the open lid's free top edge, or it is hidden. NEVER draw the hasp on the lid's INNER face. The small staple remains fixed on the box front in every frame.

3. READABLE SINGLE REPAIR. At the lower-left corner where the left end panel meets the front, show ONE integrated repair, identical in all eight frames: one replacement plank section in the same walnut hue but slightly lighter and less worn, plus one small reinforcing dark-iron corner plate of a different shape fastened with two square nails (the original ironwork uses round rivets). It must be readable at the final 104x120 sprite size, about 8x6 final pixels, yet restrained: no bright silver, no gold, no ornaments, no added damage elsewhere.

Fine deliberate stepped pixel clusters like the warrior's shield wood, selective brown-black outlines, 2-3 tones per material, broken restrained firelight highlights. No blur, antialiasing, gradients, noise, photoreal texture or glossy icon rendering.
```

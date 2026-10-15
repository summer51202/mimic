# Landing 普通寶箱 — 材質與像素表現校準

**日期：** 2026-10-15

**狀態：** 使用者已同意設計方向；本文待核對。新素材尚未製作或視覺核准。

**範圍：** Phase 1 / Scenes / Landing，review-only；普通寶箱素材，不是位置調整。

## 1. 已確認決策

使用者原話：「同意，保留圓拱蓋造型，先以戰士為基準重做材質和像素表現，位置先不動。」

- 保留普通、閉合、圓拱蓋木製寶箱的身份、現有朝向及透視。
- 戰士是像素顆粒、輪廓與材質分區的主要參照，不是裝甲配色或裝飾模板。
- 先做一個校準版本，與原稿比較；不展開新造型或位置候選。
- 手機完整維持現狀，不把普通寶箱移入手機畫面。
- 兩版標題的位置、尺寸、來源與亮度固定；地圖木箱、陷阱、人物、火光和 UI 不變。
- 本輪新圖稿仍待視覺審核，既有標題位置核准保留；不推定完整 Landing / Scenes family 核准。

本規格僅修訂普通寶箱的材質／像素表現；其他要求沿用
[減員與字標規格](2026-10-09-landing-a-party-staggered-wordmark-design.md)、
[暖火構圖規格](2026-10-08-landing-warm-rest-composition-design.md)，
以及 review 目錄的 `landing-title-placement-approval-2026-10-15.md`。

## 2. 造型與材質規則

保留圓拱蓋、木板箱身、鐵帶、鉸鏈及鎖孔。維持原有視角與整體比例，
不改成方蓋箱、打開的寶箱、角色或巨型獎勵展示。

- 以深棕黑階梯輪廓、清楚的刻意像素群與輕微手作不對稱呈現。
- 木板與金屬分別採約二至三階主要材質明暗；局部點綴不變成密集抖色。
- 木紋以少量能在實際大小辨認的塊狀紋理表現，避免滿面細絲、鏽點或隨機雜訊。
- 鐵帶採低彩度、偏暖的深灰鐵質；縮減連續白亮邊，保留節制的破碎高光。
- 有輕微使用痕跡但完整可用；不強調腐蝕、破敗、塑膠光澤或寫實渲染。
- 不用模糊、平滑漸層或單純降低飽和度掩蓋原有細節密度。
- 配合房間既有暖光，但不改整體場景照明；寶箱仍是次要探索物件。
- 不加入眼睛、嘴巴、牙齒、愛心、金幣、珠寶、文字、光暈、UI 外框或場景底座。
- 不複製 Mimiku 的金色角色特徵；與地圖木箱同畫風，但仍可辨為普通寶箱。

像素顆粒以實際場景大小目視比對戰士，不要求不同尺寸物件共享
固定來源解析度。放大圖的細節不得以犧牲實際小圖可讀性換取。

## 3. 固定的比較基準

以下路徑除註明外，均相對於
`docs/design/assets/reviews/2026-09-18-page-visual-phase-1/`。

| 項目 | 固定內容 |
| --- | --- |
| 桌機畫布 | 960 × 540 logical pixels |
| 寶箱圖層 | x=105、y=284；78 × 66 logical pixels |
| 桌機標題 | x=376、y=100；288 × 84，單行 |
| 手機畫布 | 390 × 600；沿用既有完整 PNG |
| 手機標題 | x=130、y=59；148 × 98，交錯 MI / MIC |

新稿在同一 78 × 66 透明圖層邊界內以等比例整理，保持相近的可見占幅
與接地點；不拉伸、不裁掉箱蓋或箱腳，也不藉透明留白偷偷縮小寶箱。
若無法維持此限制，回報衝突，不自行改尺寸或位置。

| 輸入 | SHA-256 |
| --- | --- |
| `samples/derivations/landing-war-room/sources/ordinary-chest-v01-source.png` | `8308b9bf28f164f3b6f37b190eb6330345d6787794f9e8e1b20af899c2f96011` |
| `samples/avatar-classes/masters/warrior.png` | `cad8b04c066a149a081095ea7507091fd92fa65fdfd95ca9a40366cfcdbb9447` |
| `samples/landing-warm-rest/layers/A-desktop/warrior.png` | `fa155d31d7668e7d3660f89f4a90de865ca978abd725aa8bc5f591342eb252e1` |
| `samples/landing-warm-rest/layers/A-desktop/chest.png` | `c3026375ca3821478a822030dda1c8463e8750d09048f791e40449b7dda12753` |
| `samples/landing-title-placement-v01/desktop-single-logical.png` | `08dca5cb9f13c0a4ede1322f4e8f93295cae7b39a36438509a1286f12f87643f` |
| `samples/landing-title-placement-v01/phone-staggered-logical.png` | `dae2872edddfa14d68b37c7b5475c4680381db0826dc417cb8a07ee370385ecf` |

## 4. 製作與審核交付

新創意來源使用 ImageGen 編修普通寶箱原稿，附戰士 master、
實際戰士圖層及當前桌機場景為參照。製作前檢視本地參照，
要求透明來源，保存實際提示、來源關係與 exact hashes。
不使用 SVG、canvas 或程序繪圖替代創意來源。

來源、整理圖層、合成 PNG、manifest 與 review page 均另存，
保留舊稿及歷史管線；程序僅負責 deterministic 整理與合成。
移除舊寶箱應使用原有背景／圖層重組，不塗抹場景、不留下舊箱殘影。

同頁比較原稿與新稿：

1. 寶箱實際 78 × 66 小圖、整數倍 nearest-neighbor 放大及灰階。
2. 戰士實際 132 × 149 圖層參照及其完整 master；不縮成寶箱尺寸或拉伸角色。
3. 原桌機與替換後桌機，保留相同 live UI；只變寶箱素材。
4. 未變動的手機構圖，明示手機本輪不調整。
5. 可讀來源紀錄、尺寸、固定座標與 exact SHA-256。

不得用較大新稿、不同背景色、不同整體亮度或改位置讓比較失真。
完成後停在視覺 checkpoint，等待素材核准；寶箱位置之後另行討論。

## 5. 驗證與接受條件

後續實作計畫需明列 TDD、focused Vitest、ESLint、型別檢查、
320／390／768／1440 Playwright、determinism、尺寸／alpha／
transparent RGB 與 `git diff --check`；使用 self-review 修正重要問題，
並依 verification-before-completion 提供實際命令證據。

- 新素材參照與實際輸出 hash 一致；透明像素 RGB 清理且無背景／光暈殘留。
- 寶箱座標與圖層大小固定；手機與所有非寶箱來源保留原 bytes。
- 桌機圖層邊界外的 logical pixels 與已核准標題位置的基準圖完全一致。
- 寶箱無舊稿殘影、裁切或比例拉伸，保持普通圓拱寶箱辨識。
- review 頁無水平溢位，彩色／灰階比較是真實輸出，UI 可讀。
- 暖火與伙伴仍是焦點；像素材質是否一致由使用者目視判斷，
  測試通過不等於素材或整個 Scenes family 核准。

## 6. 工作與產品邊界

Inline Execution；不建立 worktree、不使用 subagent。
既有 dirty／staged／untracked 工作完整保留；不碰、暫存或提交
`.codex-remote-attachments/`、`reference/`，不使用 `git add .`。
本新規格可獨立以明確路徑提交，不混入既有暫存內容。

不修改 `web/public`、runtime source、asset registry、PWA manifest、
service worker、產品頁面、Home、帳務或角色／道具互動。
不做最終 production exports，不推進 Phase 2，不提升素材至 runtime。
新審核 artifacts 保持 `awaiting-calibration`、
`reviewOnly: true`、`runtimePromotion: false`。

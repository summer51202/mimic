# Props 壁畫 v03 驗證

2026-11-05 · 2R · 待使用者視覺審核

## 交付與選擇

- 入口為 props-calibration-v03-review.html，含 v02／v03、hidden／revealed 實景對照、量測表、四張已核准插圖及 v03 擺位工具。
- 桌機採 (718,128)、72×48，選在中央天然岩面右上部，增加與右側岩縫的距離。此為實作時對建議位置的調整。
- 手機採 (948,136)、54×36，依斜向岩面偏移刻線。
- 同一 ImageGen 構圖取 alpha ≥200 的輪廓，重建暗槽及朝下方火光的暖色槽緣。來源、完整 prompt 與雜湊記錄在 derivations/props-calibration-v03 及專項 manifest。
- 四張插圖及全部場景、原有道具皆引用 v02 的原始路徑與雜湊，合成時逐一核對。

## 紋理相對量測

BT.709 亮度。刻線包含暗槽及受光槽緣。每個有色像素與四鄰接透明像素形成一組有方向的刻線／岩壁配對，以兩組平均亮度差的絕對值作分子。相同範圍原岩壁所有水平、垂直相鄰像素的亮度差絕對值中位數作分母。不使用百分比平均亮度法。透明像素採原岩壁亮度。無有效配對、零紋理或出界顯示無法量測。

| 場景 | 版本 | Hidden | Revealed | 原岩壁中位差 |
| --- | --- | ---: | ---: | ---: |
| 桌機 | v02 | 1.6203 | 4.7883 | 2.9278 |
| 桌機 | v03 | 2.1983 | 6.8948 | 1.3622 |
| 手機 | v02 | 1.1637 | 2.4034 | 3.9238 |
| 手機 | v03 | 2.1148 | 5.5287 | 3.5616 |

v03 hidden 均在 1.4–2.2，revealed 均 ≥3.5。手機 v02 hidden 負向對照 <1.4。所有版本使用相同公式，以各自原始落點量測。分子先求配對組的平均值再取差，避免將紋理本身的每組絕對差計入可發現性。

## 自動驗證

- 專項 browser verifier 於 Chromium、320／390／768／1440 px 通過。驗證全部圖片載入、8 組版本狀態對照、頁寬、雙場景狀態切換、即時重算、重設、座標 JSON。
- 1440 px 額外以真實 pointer 拖曳驗證，其餘尺寸用微調按鈕。比值隨位置改變，重設後恢復。
- 把壁畫移到桌機 (240,220)，確認同時產生寶箱開蓋與砌磚灰縫警示。寶箱禁止區隨當前寶箱位置更新，使用 open 素材的非透明外框，預設桌機為 (236,218)–(355,340)。
- 初始壁畫通過所有禁止區檢查。砌磚提示使用保守矩形區域，單一天然岩面仍以目視確認。
- 共用模型與 Props v02 的 Vitest 共 2 檔、7 項通過。使用工作區暫存目錄及 node 環境。
- 新增／修改的 JS 模組通過 Node 語法檢查。
- 四張壁畫 PNG、兩份 HTML、一份專項 manifest 重建後 SHA-256 全數一致。
- review-manifest.json 執行前後 SHA-256 一致，8d4ea9b8dcd8aeb8591ae50a951c848097f4a08bd6937e4a7de24d474cf82f4e。

重跑方式（repository root）

```powershell
node docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-props-calibration-v03.mjs
$env:PLAYWRIGHT_BROWSERS_PATH='C:/Users/Edward1_Lee/AppData/Local/ms-playwright'
node docs/design/assets/reviews/2026-09-18-page-visual-phase-1/verify-props-calibration-v03.mjs
```

## 人工目視與待審核

已檢視 samples/props-calibration-v03 下桌機與手機 hidden／revealed 的實際 1× Chromium 截圖。Revealed 可辨識寶箱怪、眼睛、牙與兩名小人，Hidden 仍偏含蓄。桌機遠離寶箱 open 蓋頂，手機位於右段岩面。原始候選帶暖色暈光，輸出只取實心刻線並用岩壁取色重建，移除候選的暈光。

目前停在視覺審核。凹槽深度感、hidden 在一般觀看距離的可發現性，以及單岩面貼合感需使用者確認。擺位工具移位後沿用素材像素並重算比值，重新選定位置後需以合成器重新取色。嵌入工具的 data PNG 供本機 file URL 安全量測，座標 JSON 仍保留原始素材路徑及雜湊。

Web TypeScript typecheck（npm run typecheck）通過。


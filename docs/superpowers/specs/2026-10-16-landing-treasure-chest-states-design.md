# Landing 藏寶箱 — 互動型態素材家族

**日期：** 2026-10-16

**狀態：** 使用者已同意藏寶內容與四態方向；本文待核對，整組新素材尚未製作或核准。

**範圍：** Phase 1 / Scenes / Landing，review-only 素材與動作比較，不實作產品互動。

## 1. 已確認決策與修訂關係

使用者要求：「因為這是互動物件，請把互動可能會需要的不同型態素材一併完成再做評判」，
並明確選擇藏寶箱，而非旅行用品收納箱或空箱。使用者隨後同意
「金幣為主、少量寶石、財寶不外溢」的方向。

- 保留圓拱木蓋、鐵帶、鎖扣、原朝向與既有透視；不是 Mimiku，沒有臉部或生命特徵。
- 材質與像素顆粒繼續以戰士為準，完成同一設計的四種型態後再一起審核。
- 現有閉合材質稿只是候選，不因本次 OK 而視為已核准。
- 箱身接地位置、兩版標題、手機、其餘角色與道具固定。
- 寶箱放置位置、地圖木箱、陷阱及產品互動皆不在本輪一起調整。

合併閱讀 [材質校準規格](2026-10-15-landing-ordinary-chest-material-design.md)、
[原作戰會議室規格](2026-10-05-landing-war-room-visual-design.md) 及既有標題位置核准紀錄。
本文僅新增以下例外：

1. 開蓋狀態可在箱內看見金幣與少量寶石，取代上一輪素材的完全不含財寶限制。
2. 箱蓋活動可超出原閉合圖層的上緣；不再把開蓋型態強制塞入 78×66。
   原閉合材質比較、歷史輸出與其 78×66 差異範圍 contract 不修改或放寬。
3. 新比較頁提供 review-only 的狀態切換及開關預覽；不代表產品互動設計已全面核准。

## 2. 四個素材型態

| ID | 型態 | 視覺內容 |
| --- | --- | --- |
| closed | 閉合／待機 | 完整閉合圓拱蓋，內容物不可見，維持普通木製藏寶箱辨識 |
| cracked | 微開 | 箱蓋剛離開箱沿，縫隙只露少量暖金反射；不是箱蓋或箱身發光 |
| half-open | 半開 | 鉸鏈轉動連接清楚，部分金幣與寶石開始可見；檢查前後遮擋 |
| open | 全開／停留 | 箱蓋穩定打開，內蓋、木製箱內與財寶清楚，仍是同一只箱子 |

微開與半開是動作過渡用型態，不是可取得不同獎勵的選項。
關閉使用同組型態逆序，不另畫一套互不一致的素材。
不加入跳躍、呼吸、表情、受傷、破損、上鎖失敗、戰鬥或掉落物型態。

金幣是主要財寶，以重疊的簡潔像素群表現；少量寶石作次要點綴，
不要求每枚幣可數、不畫金額、幣別或金融符號。
內容物維持在箱沿內，隨開蓋露出，不噴出、不飛散、不新增地面財寶。
不加入巨大光柱、獨立照明、連續閃爍、滿屏粒子或手機遊戲式獎勵特效。
金屬與寶石以既有火光下的節制反光呈現，不蓋過篝火與伙伴的主焦點。

## 3. 同一物件與共用定位

閉合比較基準是 960×540 桌機場景中的 x=105、y=284、78×66 圖層；
下緣中心 anchor 為 (144,350)，以圖層邊界 logical pixels 計算。

- 四態固定箱身、箱腳、接地點、朝向、材質身份與鉸鏈位置；只改箱蓋轉動、
  可見內蓋／箱內面及被箱蓋遮擋的內容範圍。
- 不藉縮放整只箱子、平移箱身或重新改透視來容納打開的箱蓋。
- 統一透明畫布以四態所需的共同包絡範圍安排，向上保留開蓋空間。
  所有狀態共用尺度及 anchor；不得各自裁緊後再獨立 fit，造成箱身呼吸或漂移。
- manifest 明列每態畫布、箱身定位／鉸鏈參考點與場景合成原點，讓接地位置可驗證。
  包絡尺寸在實作計畫依來源規劃，不影響已確認的場景接地座標。
- 四態的場景合成必須保留所有其他 pixels；只允許藏寶箱本體、箱蓋及箱內內容
  在藏寶箱活動包絡內產生差異，不接受四態之間箱身漂移或抖動。若包絡會遮住其他道具、通道必要辨識或 UI，
  回報具體衝突，不自行搬移周邊元素。
- 兩版標題仍是桌機 376/100、288×84；手機 130/59、148×98。
  手機沿用原 390×600 PNG bytes，不新增寶箱或水平探索功能。

材質規則沿用前規格：深棕黑階梯輪廓、刻意像素群、二至三階主要材質明暗、
精簡木紋、低彩度偏暖深灰鐵帶、破碎高光及輕微使用痕跡。
不以平滑旋轉、模糊、雜訊或整體調色掩蓋來源不一致。
四態必須放在實際場景大小與戰士旁比較，不能只憑放大圖判定一致。

## 4. 來源及候選保護

review 根目錄為
`docs/design/assets/reviews/2026-09-18-page-visual-phase-1/`。
以下為本次核對的既有候選，供新素材延伸，不代表視覺核准：

| 基準 | SHA-256 |
| --- | --- |
| `landing-chest-material.manifest.json` | `c1e905b78299a1ae9f3c8d86b477a8ed368edc2ae9fce8eff6949abaf5946b18` |
| `samples/derivations/landing-chest-material-v01/ordinary-chest-source.png` | `b82139f77cb2cd10426caa1831f374eb9b65f85c0c5bb59deecdf9dd41ae1de9` |
| `samples/landing-chest-material-v01/ordinary-chest.png` | `fc2a8eb5b6337658e3056cc4cfc014328a4ec0c2920d800f9daa37451aef729b` |
| `samples/landing-chest-material-v01/desktop-logical.png` | `458e28654b436179472110fa97b904703e9dfa73cefc4cccd8bc077fa05a8c19` |
| `samples/landing-title-placement-v01/phone-staggered-logical.png` | `dae2872edddfa14d68b37c7b5475c4680381db0826dc417cb8a07ee370385ecf` |

所有創意 raster 由 ImageGen 生成或修訂。可直接重用現有 ImageGen 閉合稿作為一個候選，
不必為相同內容重複生成；新開蓋型態參照它、戰士 master、實際戰士圖層及當前桌機場景。
製作前逐張 view_image；保留每次實際提示、edit target、參照、來源關係及 exact hashes。
若四態整合需要修訂閉合候選，另存版本，不覆寫原稿。
程序僅作透明整理、共用定位、nearest-neighbor 輸出及合成，不畫出新的箱蓋或財寶，
也不以 CSS 旋轉閉合圖冒充新的開蓋像素稿。

## 5. 同頁審核與預覽行為

新建獨立 review page、manifest、來源與輸出目錄，保留舊材質頁及歷史管線。

- 並列四態實際大小、相同整數倍率放大、真實灰階 PNG；皆採相同背景與縮放規則。
- 保留原閉合候選與戰士顆粒參照，標明本輪是整組素材比較，不要求先核准閉合圖。
- 桌機可逐態放回同一場景；手機顯示未變動版本。標題與 live UI 不動。
- 狀態選擇與播放／開關控制為有名稱的 native buttons，可滑鼠、觸控與鍵盤操作。
- 桌機場景中以固定箱身區域的透明 native button 作為開關點擊目標；
  外部狀態控制仍保留。鍵盤聚焦有清楚的 live 提示，不改 raster 或造成版面位移。
- 不自動循環播放。主動開啟時依 closed → cracked → half-open → open；
  每段過渡暫用 140ms，共 420ms；關閉逆序。這只是素材連續性預覽，不是最終產品動畫時序。
- 播放途中重複點擊不疊加計時器，先完成本次動作；逐態選擇可停止預覽並固定該態。
- reduced-motion 下直接切到目標終態，仍能手動查看四態，不強迫動畫。
- 圖片缺失或無法解碼時明示錯誤，停止播放並停用該態，不用舊圖假裝新態載入成功。
- hover／focus 提示使用 live review 控制提示，不另外烘焙光圈進素材或新增第五個物理型態。
- 四態、來源、尺寸、anchors、actual hashes 與 current state 有可讀標籤。
  不產生金錢、成就、帳務異動或解鎖產品功能。

## 6. 實作驗證與停止點

後續實作計畫採 TDD；執行 focused Vitest、ESLint、型別檢查、
320／390／768／1440 Playwright、determinism、透明 RGB、尺寸／alpha、
共用 anchor、狀態切換、重複操作、reduced-motion、載入失敗與 whitespace 驗證。
四態主來源及真實輸出皆記錄 SHA-256；既有手機、標題與其他場景來源 bytes 保持不變。
新 contract 驗證活動包絡及箱身穩定，不刪除或修改舊的材質／標題 contracts。

依 repository self-review 反覆修正重要問題，完成前使用
verification-before-completion 的實際命令證據；非 trivial 實作後 append devlog。
整組四態、場景預覽與動作檢視完成後才停下，等待使用者一起判斷素材，
不以測試通過或先前 OK 自動標記圖稿／Scenes family approved。

Inline Execution，不建 worktree、不使用 subagent，不再詢問執行模式。
保留所有既有 dirty／staged／untracked 工作；不觸碰、暫存或提交
`.codex-remote-attachments/`、`reference/`，不使用 `git add .`。
此新規格可獨立以明確路徑提交，不混入既有修改。
不改 runtime、`web/public`、asset registry、PWA manifest、service worker、
產品頁面、Home 或帳務，不做 production exports、不推進 Phase 2。
新 artifacts 保持 `awaiting-calibration`、`reviewOnly: true`、`runtimePromotion: false`。

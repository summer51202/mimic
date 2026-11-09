# Gate B：完整家族產出與 QA

日期：2026-11-09。狀態：Gate A 八個家族已全部核准（decision-log 2026-11-06）。使用者決定：Gate B 拆成 B1／B2；Mimiku 未畫的四個動作在 Gate B 內補齊，並先做校準審閱。

依據：`docs/superpowers/plans/2026-09-18-page-visual-phase-1-asset-style-gate.md` Task 12–13，以及 Gate A 期間修訂的 Scenes／Props／Frames 正式檔案清單（各家族 spec §1）。本文件以修訂後清單為準，原計畫中與 decision-log 衝突之處以 decision-log 為準。

## 共同規則

- 所有正式檔案放在 `docs/design/assets/approved/page-visual-v1/`，**不得**寫入 `web/public/`、不得修改 runtime（`web/src/app`、`features`、`shared/ui`、`shared/navigation`、`styles`）或 `icon.png`。
- 正式檔案只能由**已核准的審閱產物**以確定性方式匯出（複製、裁切、無損轉換、整數倍縮放、依 manifest 組 sprite sheet）；不得重新生成或修改核准像素。B2 的新圖例外，需另行核准。
- 建立 `production-asset-manifest.json`：每個正式檔案一筆，欄位依原計畫 Task 12 Step 1——相對路徑、來源審閱檔路徑與 SHA-256、匯出方式、寬高、格數（含每格尺寸）、alpha 預期、預定 CSS 尺寸、使用者（consumer）、載入策略、無障礙角色、fallback、減少動態處理、`runtime_target: null`、`disposition: "staged-only-until-consumer-plan"`。
- 不得有重複路徑；任何目的地不得與現有 `web/public` 路徑相同。
- Codex 不 stage／commit；完成後由審閱者依家族分批 commit。
- 職業命名以核准為準：**physician**（取代原計畫的 cleric）。

## B1：匯出已核准素材

### 範圍

| 家族 | 正式檔案 | 來源 |
|---|---|---|
| Wordmark | `wordmark/mimic-wordmark-display.png`（1536×512）、`wordmark/mimic-wordmark-compact.png`（768×256） | 已核准 wordmark calibration（decision-log 2026-09-23）；眨眼 sheet 屬 B2 |
| Icons | `icons/install/icon-{192,512}.png`、`icon-maskable-{192,512}.png`、`favicon-{16,32}.png`；`icons/ui/` 下 18 個 48×48（依原計畫清單） | Icons 各子家族核准 manifest；48 px 檔取自已核准 optical evidence，不重新縮放 |
| Mimiku 靜態 | `mimiku/state-{idle,working,happy,reminder,serious,concerned}.png`（512×512） | decision-log 2026-10-02 核准 master |
| Scenes | 依 `2026-11-04-scenes-staged-set-and-home-base-design.md` §1／§3：Landing 桌機 architecture、手機 1170×600 探索條（3R3）、地面光、actors、`landing/layout.json`；Home v02 桌機／手機 architecture、地面光、Mimiku、`home/layout.json`（頭像 slot 引用 avatars 家族 id，不內嵌圖） | decision-log 2026-11-04／05 |
| Props | 依 `2026-11-05-props-family-calibration-design.md` §1：寶箱八格（桌機 156×180、手機 110×126）、火把、蝙蝠、地圖木箱、木牌、共用篝火、壁畫 v04 兩狀態（桌機、手機）、`feature/{personal,shared,pooled,tasks}.png` | decision-log 2026-11-05／06 |
| Frames | `frames/frame-{parchment,wood,stone,dialogue,notebook}.png`、`frames/frames.json` | Frames 2R |
| Motion | `motion/` 下：標題眨眼（桌機、手機，各 3 格 sheet）、Mimiku 待機（2 格循環＋眨眼格）、記帳 5 格、完成慶祝 6 格、篝火 4 格的場景尺寸 sprite sheet；`motion/motion-timing.json`（每段格數、每格 ms、觸發、循環／一次、跳過、減少動態最終格、主要動畫互斥規則） | Motion 2R |

Sprite sheet 一律水平排列、每格同尺寸、格數寫入 manifest；寬 = 單格寬 × 格數。

### 驗證

- 先寫失敗測試（`asset-style-gate.test.ts` 延伸）：manifest 不存在 → 缺檔 → 全部通過。
- 每個 PNG：簽章、精確尺寸、alpha 規則、非空不透明範圍、透明像素 RGB 為 0、SHA-256 唯一；sprite sheet 寬度 = 單格 × 格數；匯出檔逐像素等於來源（或等於來源的確定性組合）。
- `git diff a157a83 -- web/public web/src/app web/src/features web/src/shared/ui web/src/shared/navigation web/src/styles icon.png` 無差異。
- focused Vitest、ESLint、typecheck、byte-identical 重建；產出 `docs/design/assets/approved/page-visual-v1/b1-verification.md` 與 devlog。
- 停在 B1 審閱（審閱者核對清單與檔案後分家族 commit）。

## B2：補齊新圖與最終 QA

### B2-1 新圖校準（先審後產）

1. **Wordmark 眨眼 sheet**（`wordmark/mimic-wordmark-motion-sheet.png`，4608×512，3 格）：以核准 wordmark 1536 display 為底，ImageGen 只編修「M」的眼睛，對應 Motion 2R 已核准的張眼／半閉／閉眼三格；其餘像素必須等於 display。
2. **Avatar**：8 職業 × `{class}-portrait.png`（96×96）＋ `{class}-full.png`（192×192）。
   - full：由 512 master 縮至 192（非整數倍），需以面積平均或等效方法縮放後**重新對色板吸附**並人工檢查邊緣；若品質不足，改以 ImageGen 在 192 尺寸重繪並保持輪廓，於審閱頁並列 512 master。
   - portrait：頭部至胸口的取景，8 職業取景一致（同一頭頂留白、同一臉部大小），透明背景；ImageGen 編修允許，但臉部與服裝識別必須與 master 一致。
3. **Mimiku 動作 512 sheets**：
   - 已核准動作的 512 版本：`action-record-ledger.png`（5 格）、`action-adventure-complete.png`（6 格，依 Motion 2R 最終版：開心姿勢＋整數位移＋星光）。由 Motion 2R 使用的 512 對位直接產生。
   - **新動作**：`action-invitation.png`（5 格）、`action-settlement.png`（6 格）、`action-pooled-funds.png`（5 格）、`action-guide.png`（4 格），每格 512×512。ImageGen 編修已核准 Mimiku master；同一身體比例與落地點，只改動作所需部位。動作語意：
     - 邀請：遞出一張空白邀請卡／揮手招呼，卡片上無文字。
     - 結算：攤開帳本後闔上、點頭確認（不出現金額、不出現金幣湧出）。
     - 共用基金：把一枚愛心錢幣放進共用錢箱（錢箱造型與 Props `feature/pooled` 一致，與 Mimiku 本體區分）。
     - 導覽：用小手勢指向一側（左右各可鏡像使用），表示「往這邊」。
   - 一律不得出現文字、數字、獎勵／成就意象。
4. 校準審閱頁：每組逐格 1× 與 4×、播放預覽（依 Motion 規則的節奏）、與 master 並排、真實灰階；新動作附場景尺寸（Home）預覽。
5. 驗證後**停下**等使用者核准 B2-1；核准前不得寫入正式目錄。

### B2-2 正式匯出與最終 QA（B2-1 核准後）

- 將 B2-1 核准檔案寫入正式目錄並補 manifest。
- 原計畫 Task 13：對比合成（各透明家族在海軍藍、洞窟炭色、羊皮紙、暖色表面上，以 live token 色計算 WCAG 2.2 AA 並寫入 `qa-report.md`）；每個圖片家族在 Playwright 中模擬載入失敗，確認版面與 live 文字 fallback（320／390／768／1440）；Motion 在 `reducedMotion: no-preference` 與 `reduce` 各跑一次。
- 更新 `docs/design/visual-assets.md`「Page visual v1 complete-family review」章節，狀態 `review-ready-staged`；不得加入 `pixelUiFiles` 或 service worker 快取。
- 最終驗證：`npm run lint`、`npm run typecheck`、原計畫列出的 focused Vitest 與 e2e、`npm run build`（`MIMIC_API_BASE_URL=http://127.0.0.1:3101/api/v1`），以及原計畫 Step 5b 的本機真實後端財務回歸（只用 loopback 環境，不碰 Staging／Production，不停止非本任務啟動的程序）。
- 產出 `qa-report.md` 與 devlog，停在 **Gate B 最終審核**。通過後才能開始 Phase 2 的 consumer plan。

## B1R. Wordmark 畫布修訂（2026-11-09）

B1 將核准 wordmark 以原尺寸置中於原計畫畫布，留白過多：display 1536×512 中可見 900×265（約 59% 寬），compact 768×256 中可見僅 240×70（約 31% 寬）；compact 在預定 96–220 CSS px 顯示時，實際字標只剩約 30–69 px。

使用者同意修訂已接受的畫布尺寸（取代 2026-09-23 的 1536×512／768×256）：

- display 與 compact 都**裁到可見內容外框，四周各留 8 px 透明邊距**（預期約 916×281 與 256×86，以實際 alpha 外框計算並記錄）。核准像素完全不動，只移除多餘透明區。
- 眨眼 sheet（B2）以新的 display 畫布為單格尺寸，3 格水平排列。
- 更新 export 腳本、production manifest（尺寸、裁切矩形、`intended CSS size` 維持 display 240–640、compact 96–220）、`asset-style-gate.test.ts` 與 b1-verification.md；重跑 B1 全部驗證。
- 其他家族已 commit，不得改動。

## B2-1R. 新動作修訂：Mimiku 維持沒有手（2026-11-09）

### 審閱結果

使用者審閱 B2-1 候選（`gate-b2-1/`）後：

- **核准**（待 B2-2 匯出）：Wordmark 眨眼 sheet、8 職業 96 頭像與 192 全身、記帳 512 sheet、完成慶祝 512 sheet、**結算** 6 格。hash 記錄於 decision-log。
- **需修訂**：邀請、共用基金、導覽。

### 原因

所有已核准 Mimiku master 都**沒有手**（記帳的羽毛筆也是飄在旁邊）。候選中導覽與共用基金加入白手套卡通手，邀請則讓卡片懸空出現，三個動作做法互相矛盾，其中兩個改變了角色設定。共用基金去背後另有少量淺色邊緣。

### 使用者決定

Mimiku **維持沒有手**。動作只能用箱蓋開合、嘴巴、眼神、身體傾斜／跳動，以及「飄浮物件」（比照記帳羽毛筆的既有語彙）表現。

### 修訂方向

- **邀請（5 格）**：箱蓋微開 → 一張空白邀請卡從嘴裡升起／被輕輕吐出 → 卡片飄到身前停住 → 眨眼示意 → 收回或停留（最後一格定案時說明）。卡片無文字、無符號。
- **共用基金（5 格）**：身旁有與 Props `feature/pooled` 同造型的小鐵皮錢箱。Mimiku 側身、用嘴輕叼一枚小愛心錢幣（非胸前的大愛心幣）→ 前傾 → 錢幣落入錢箱 → 錢箱輕微彈動 → 回正。錢箱與 Mimiku 不重疊混淆，清除所有淺色邊緣（透明像素 RGB 為 0、無半透明白邊）。
- **導覽（4 格）**：眼睛轉向一側 → 身體與箱蓋一起往同側傾斜（不改輪廓比例）→ 輕跳一下 → 回正。可鏡像使用；不加箭頭、手勢或符號。
- 共同要求：沿用核准 master 的身體比例、落地點、牙齒與木紋（ImageGen 僅編修動作所需區域，其餘像素對齊核准 master，記錄變動範圍）；不得出現手、手套、文字、數字或獎勵意象；每格 512×512。
- 新增 contract：與核准 master 比對，「非動作區」像素差異低於門檻；自動偵測候選中不得出現白色手套色塊（以核准 master 不存在的高亮白色連通區面積為指標，門檻寫入 manifest）。

### 交付

更新 B2-1 審閱頁（只重做三個動作，其餘候選唯讀不變），附 Home 尺寸預覽與並排的既有版本，驗證、verification.md、devlog 後停下等審核。

## B2-1R2. 邀請與共用基金再修（2026-11-09）

導覽已核准（hash 見 decision-log）。邀請與共用基金的「無手」要求已達成，但道具在 Home 尺寸不可讀。導覽與其他 20 張核准候選唯讀。

### 邀請（5 格）

- **卡片放大**：卡片寬約為 Mimiku 身寬的 30–35%（接近記帳帳本的尺寸），高寬比約 3:4 或 4:3，正面朝觀者、略傾 10–15°，看得到淺羊皮紙色紙面、1 px 深色邊框與一個小封蠟點（無文字、無符號、無愛心以外的圖案；封蠟可為素色圓點）。
- 序列：箱蓋微開 → 卡片從嘴中升起一半 → 卡片完整飄出、停在身前右側（不遮臉、不遮胸前大愛心幣）→ 眨眼示意 → 卡片停留（最後一格）。
- 卡片在 Home 桌機尺寸（Mimiku 約 118 px 寬）下至少約 35×28 px，可一眼辨識為卡片。

### 共用基金（5 格）

- **錢箱放大**：鐵皮錢箱高度約為 Mimiku 可見高度的 40%，造型與 Props `feature/pooled`（鐵皮帶鎖扣保險箱）一致，置於 Mimiku 身側前方地面、落地點與 Mimiku 同一基線，不與本體重疊。
- **動作**：小愛心錢幣（直徑約為胸前大幣的 30–40%）出現在 Mimiku **嘴邊／牙齒間**（表示叼著）→ Mimiku 整體**明顯前傾**朝向錢箱（以箱底前緣為支點旋轉或位移，不變形，至少 4–6 px／512 單位傾斜感）→ 錢幣沿弧線落向錢箱開口 → 錢幣進入、錢箱蓋輕彈 1–2 px → Mimiku 回正、滿足表情（可用核准 happy 眼）。
- 維持現有去邊品質（alpha 只有 0／255、透明 RGB 為 0、無淺色邊）。

### 驗收

- 沿用 B2-1R 的非動作區比對、手套色塊檢查與去邊檢查。
- 新增可讀性量測：Home 桌機尺寸下卡片外框 ≥ 35×28 px；錢箱可見高度為 Mimiku 可見高度的 35–45%；共用基金第 2–3 格 Mimiku 重心水平位移 ≥ 3 px（Home 尺寸）。
- 審閱頁加入 B2-1R 與 B2-1R2 並排、Home 實際尺寸預覽；驗證、verification.md、devlog 後停下等審核，不寫入正式目錄、不 commit。

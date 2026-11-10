# Phase 2A：RPG 對話框＋Landing 靜態分層場景（第一份 consumer plan）

日期：2026-11-09。狀態：待 Codex 實作，停在視覺審核。

依據：頁面視覺 Phase 1 已完成（decision-log 2026-11-09）；正式素材 `docs/design/assets/approved/page-visual-v1/`（`production-asset-manifest.json`，全部 `staged-only-until-consumer-plan`）。

## 0. Ed 已定的範圍決策（2026-11-09）

1. **Token**：不改 `--mimic-color-hud-dark`（web 內 10 個檔約 47 處當邊框／文字色使用）。新增對話框專用 token；hud-dark 全站改色留到後續各頁面 consumer plan 逐頁決定。
2. **對話框**：新建 RPG 對話框元件 `PixelDialogue`（Mimiku 說話用）。現有確認彈窗 `PixelDialog`（`shared/ui/pixel-dialog.tsx`，10 個功能在用）**不動**。
3. **Landing 分兩步**：本文件 = **2A 靜態**；寶箱狀態、壁畫顯現、火把／蝙蝠互動、所有動態與減少動態分支屬 **2B**（另寫 spec）。

## 1. 範圍

### 1.1 做

- `web/src/styles/tokens.css` 新增 dialogue token（§3）。
- 新元件 `web/src/shared/ui/pixel-dialogue.tsx`（＋ CSS module、單元測試）。
- Landing（`web/src/app/(public)/page.tsx` 使用的 `Hero`）改為分層像素場景＋wordmark＋PixelDialogue；桌機 960×540、手機 1170×600 水平探索條。
- 素材推廣（promotion）到 `web/public/pixel-ui/v1/`，並更新 manifest 對應條目（§2）。
- Service worker 新增 `/pixel-ui/v1/` 執行期快取規則（§6）。
- 測試、審閱截圖、`verification.md`、devlog。

### 1.2 不做

- 不改 `PixelDialog`、`--mimic-color-hud-dark`、`--mimic-color-ink` 或任何非 Landing 頁面。
- 不做任何動畫（標題眨眼、篝火、Mimiku idle 都顯示**靜態第 0 格**）、不做互動道具、不做寶箱狀態切換、不顯示壁畫 revealed。
- 不在木牌 `signLabel` 區放文字（2B 決定木牌文字與是否可點）。
- 不刪 `web/public/brand/mimiku-hero.png`（停止引用即可，清理另案）。
- 不用 ImageGen、不修改任何核准像素；不重新縮放素材（runtime 只做整數倍 CSS 放大）。
- 下方 `#features` 功能摘要區塊維持現狀。

## 2. 素材推廣

### 2.1 目標路徑

`web/public/pixel-ui/v1/<與 approved 相同的相對路徑>`。例：`docs/design/assets/approved/page-visual-v1/scenes/landing/desktop-architecture.png` → `web/public/pixel-ui/v1/scenes/landing/desktop-architecture.png`。`v1/` 子目錄避免與現有 `pixel-ui/{avatars,characters,frames,scenes}` 衝突。

### 2.2 推廣清單（只推本輪真的有 consumer 的檔）

| 類別 | 檔案 |
|---|---|
| Frames | `frames/frame-dialogue.png` |
| Scenes | `scenes/landing/{desktop,phone}-architecture.png`、`scenes/landing/{desktop,phone}-ground-light.png`、`scenes/landing/actors/{mimiku,ranger,warrior}-{desktop,phone}.png` |
| Props | `props/landing/bats-{desktop,phone}.png`、`props/landing/wall-carving-hidden-{desktop,phone}.png`、`props/landing/torch-{high,low}-desktop.png`、`props/landing/torch-phone.png`、`props/landing/chest-closed-{desktop,phone}.png`、`props/landing/map-crate-{desktop,phone}.png`、`props/landing/sign-{desktop,phone}.png`、`props/shared/campfire-{desktop,phone}.png` |
| Motion（只用第 0 格） | `motion/title-blink-{desktop,phone}.png` |

`layout.json` 與 `frames.json` **不放進 public**：改由 build 時 import（見 §4.1），避免執行期 fetch。

### 2.3 方式

- 新增 `web/scripts/promote-page-visual-assets.mjs`（`package.json` 加 `assets:promote`）：讀 manifest，依 §2.2 清單 **byte-for-byte 複製**，複製後重算 SHA-256 必須等於 manifest `sha256`，不符即失敗。可重複執行（idempotent）。
- 更新 manifest 中這些條目：`runtime_target` = `web/public/pixel-ui/v1/...`，`disposition` = `"promoted-phase-2a"`。其他條目不動。
- 單元測試：清單內每個 runtime 檔的 SHA-256 = manifest 值；清單外不得出現在 `pixel-ui/v1/`。

## 3. Tokens（`tokens.css` 新增，不改既有值）

| Token | 值 | 來源／條件 |
|---|---|---|
| `--mimic-color-dialogue-field` | `#211a18` | frames.json `dialogue.centerColor` |
| `--mimic-color-dialogue-edge` | `#b79556` | decision-log 2026-11-06 黃銅邊（border-image 載入失敗時的實線邊框色） |
| `--mimic-color-dialogue-text` | Codex 提案（暖米白系） | 對 `#211a18` 對比 ≥ 7:1，寫入 verification |
| `--mimic-color-dialogue-speaker` | Codex 提案（低調黃銅系） | 對 `#211a18` 對比 ≥ 4.5:1；不得用亮金（亮金只給主要 CTA） |
| `--mimic-color-cave-backdrop` | 由桌機 architecture 外緣像素取樣 | 舞台 letterbox 填色；在 verification 記錄取樣座標與值 |

## 4. Landing 場景

### 4.1 資料

- 新增 `web/src/shared/brand/landing-scene.ts`：直接 `import` approved `scenes/landing/layout.json`（或由腳本產生等值 TS 常數，二擇一，需在 verification 說明）。座標、尺寸、depth **完全照 layout.json**，不得手調。
- 測試：TS 常數與 layout.json 深度相等；每個 layer 的 `asset_id` 都在 §2.2 清單內，`width/height` 與 manifest 一致。
- 2A 中 `chest` 用 `chest-closed`、`carving` 用 `hidden`、`wordmark`／`fire`／`mimiku` 用靜態圖或 sheet 第 0 格。Mimiku 用 `scenes/landing/actors/mimiku-*.png`，**不**用 motion sheet。

### 4.2 斷點與縮放

- `< 760px` 用 phone 版，`≥ 760px` 用 desktop 版（與現有 hero 斷點一致）。
- **桌機**：舞台 960×540 邏輯像素，CSS 縮放倍率 `s = max(1, floor(min(可用寬 / 960, 可用高 / 540)))`，可用高 = 視窗高 − site header 高。舞台水平置中，四周填 `--mimic-color-cave-backdrop`。
- **手機**：可視視窗 390×600 邏輯像素，`s = max(1, floor(視窗寬 / 390))`；可視寬不足 390×s 的部分（例如 360 寬裝置）允許水平捲動吸收，不得非整數縮放。
- 所有像素層 `image-rendering: pixelated`；位置與尺寸 = 邏輯值 × s，必須是整數 CSS px（layout 中有小數的只有 `signLabel` 與 safe zone，本輪不用 signLabel；safe zone 換算時 floor）。
- 倍率可用 CSS（`--scene-scale` 搭配 media／container query）或 client hook 實作；**SSR 首屏不得出現錯位閃動**——伺服器端先以 s=1 置中渲染、hydrate 後再調整亦可，但不能先出現非整數倍。

### 4.3 圖層渲染與載入

- 每個 layer 一個 `aria-hidden` 元素，用 **CSS `background-image`**（放在該斷點的 media query 內），讓 `display:none` 的另一斷點素材**不被下載**。不用 `next/image`（會重新取樣），也不經 Next 圖片最佳化。
- sprite sheet（title-blink）用 `background-size`＋`background-position` 顯示第 0 格。
- 疊放順序依 `depth`（同 depth 依 layout 陣列順序）。
- Architecture 加 `<link rel="preload" as="image">`，**只 preload 當前斷點**（用 `media` 屬性）。
- 圖片載入失敗：舞台保持尺寸與 backdrop 色，h1、對話框、CTA 仍完整可用（fallback 規則見 manifest）。

### 4.4 手機探索條

- 外層為水平捲動容器（可視 390×s，內容 1170×s），初始 `scrollLeft = 390 × s`（`initialViewportX`），首屏即在中段，不得看到捲動動畫。
- 容器 `tabindex="0"`、`role="region"`、`aria-label="洞窟場景，可左右捲動"`，鍵盤左右鍵可捲動；隱藏捲軸但保留可捲動性（不得 `overflow:hidden`）。
- 不加 scroll-snap、不加自動捲動、不加箭頭提示（2B 再議）。
- `explorationBats` 照 layout 顯示（靜態）。

### 4.5 語意與文字

- `h1` 保留 `brand.productName`：視覺上以 wordmark 第 0 格呈現（`aria-hidden` 圖層），文字以 visually-hidden 方式保留，**整頁只有一個可讀的 MIMIC 名稱**。
- 原 kicker「咪咪庫 / Mimiku」改為 PixelDialogue 的說話者名稱。
- 原 tagline 與「開始冒險」（`/register`）放進對話框；CTA 用亮金（`--mimic-color-coin-action`），≥ 44×44 CSS px。
- 場景內所有道具、角色在 2A 皆為裝飾，`aria-hidden`、不可聚焦。

## 5. PixelDialogue 元件

- API（建議）：`speaker: ReactNode`、`children`（內文）、`actions?: ReactNode`、`as?: "section" | "div"`、`className`。
- 外框：`border-image: url(/pixel-ui/v1/frames/frame-dialogue.png) 14 fill / 28px / 0 repeat`（slice 14、scale 2、repeat 依 frames.json）；中心底色 `--mimic-color-dialogue-field`；`image-rendering: pixelated`。內距 ≥ `minPadding`（手機 18、桌機 26 CSS px）＋ 外框寬。
- 失敗 fallback：`border: 2px solid var(--mimic-color-dialogue-edge)`，版面與內容順序不變。
- 語意：**不是** `role="dialog"`、不是 live region；`section` 時以說話者名稱 `aria-labelledby`。框線像素為裝飾。
- Landing 擺位：
  - 桌機：疊在 safe zone `dialogue`（y 421.2–540 邏輯 px，全寬）內，左右各留 ≥ 24 邏輯 px。
  - 手機：固定貼齊**可視視窗**底部（不隨探索條捲動），高度不超過 safe zone `dialogue`（168 邏輯 px）。
  - 文字溢出（含 200% 文字縮放、長語系）時，對話框改排在舞台**下方**正常流內，不得裁切或蓋住 CTA。
- 單元測試：render、`aria-labelledby`、actions 渲染、無 `role="dialog"`。

## 6. Service worker

`web/src/app/sw.ts` 新增 matcher：同源、`/^\/pixel-ui\/v1\/.+\.png$/`，`CacheFirst`，cacheName `mimic-page-visual-v1`，`maxEntries: 48`、30 天、`last-used`。不加入 precache。既有規則不動。

## 7. 驗證

### 7.1 指令

`npm run lint`、`npm run typecheck`、`npm run test`、`npm run build`、`npm run test:e2e`（現有 suite 全綠）。real-backend／loopback 財務回歸只能對 `127.0.0.1` 專用 DB，不得碰 Staging／Production；若環境不可用，於 verification 記錄未跑原因，**不得**改連其他 DB。

### 7.2 新 e2e：`web/e2e/landing-phase-2a.spec.ts`

視窗：桌機 1280×720、1440×900、1920×1080、2560×1440；手機 360×780、390×844、430×932。每個尺寸：

- 斷點正確；縮放倍率為整數，並在 verification 表列每個尺寸的 s。
- 每個 layer 的 CSS 位置／尺寸 = layout × s（容差 0）。
- 只下載當前斷點素材（以 network 記錄驗證另一斷點的 PNG 未被請求）。
- 手機初始 `scrollLeft = 390 × s`；鍵盤可捲動。
- 對話框無溢出、CTA 可 Tab 到且可見焦點；200% 文字縮放時改為舞台下方排版。
- 封鎖 `/pixel-ui/v1/` 請求時 h1、tagline、CTA 仍可用。
- 截圖存 `docs/design/assets/reviews/2026-11-09-phase-2a/screenshots/`（每尺寸一張全頁、一張舞台 1× 等比裁切）。

### 7.3 其他

- 更新 `hero.test.tsx`、`assets.test.ts` 等引用 `mimiku-hero` 的測試，使其符合新結構（不得只刪測試）。
- `verification.md` 放 `docs/design/assets/reviews/2026-11-09-phase-2a/`：token 提案值與對比度、backdrop 取樣、各尺寸倍率表、檔案 hash 對照、跑過的指令與結果、未完成事項。
- `.agents/devlog.md` 追加一筆。

## 8. 審閱時 Ed 要看的點

1. 1440×900 桌機 s=1（舞台 960 寬、四周 backdrop）是否可接受，或要在 2B 前另議非整數策略。
2. 對話框文字色、說話者色、與 CTA 亮金在暖深褐上的觀感。
3. 手機 360 寬的水平吸收是否可接受。
4. 木牌留白（2B 才放文字）是否在 2A 上線可接受。

## 2R：第一輪審閱修正（2026-11-10）

審閱者獨立量測：依 §4.2，1920×1080（可用高約 1010）與 1440×900 都只得 s=1，桌機場景 960×540 四周大片 backdrop。主流桌機都會落在這種情況，屬 spec 問題。審閱者以 1×／1.87× 最近鄰／2× 對照，非整數放大在此素材上幾乎看不出差異。Ed 決定如下，本節優先於 §4.2、§4.5 的對應條文。

### 2R.1 桌機縮放改為填滿可視區（取代 §4.2 桌機條）

- `fit = min(可用寬 / 960, 可用高 / 540)`，可用高 = `window.innerHeight − header 高`。
- `fit ≥ 1`：`s = fit`（允許非整數），像素層 `image-rendering: pixelated`（最近鄰）。
- `fit < 1`（760–959 寬或很矮的視窗）：`s = fit`，像素層改 `image-rendering: auto`（縮小時用平滑取樣，避免最近鄰掉像素）。
- **手機維持 §4.2 整數倍規則，不變。**
- 實作要求：場景圖層放在一個 960×540 邏輯 px 的容器內，以**單一** `transform: scale(s)`（origin 左上）整體縮放，外層包框尺寸 = `round(960s) × round(540s)`；不得逐層以 `邏輯值 × s` 各自四捨五入（會產生接縫與錯位）。
- **PixelDialogue、h1、CTA 等 HTML 文字不得放在被 transform 的容器內**；對話框以 CSS px 疊在 `safe zone dialogue × s` 的位置，字級不隨 s 縮放。
- 54／34 px 對話框內縮（Ed 確認）在 s=1 時沿用；s≠1 時以 `54 × s`、`34 × s` 換算（四捨五入到整數 CSS px），並在 verification 記錄各尺寸實際值。
- e2e：桌機改為驗證「包框尺寸 = round(960s)×round(540s)、舞台貼齊可用區的寬或高其中之一（容差 1px）、transform 值 = s」；layer 位置驗證改為在**未縮放座標**下比對 layout（容差 0）。手機驗證不變。
- verification 倍率表加上每個桌機尺寸的 `fit` 實值與 image-rendering 值；補 1366×768、1536×864（Windows 125%）兩個桌機尺寸。

### 2R.2 還原 header／footer 品牌

- 移除 `hero.module.css` 中 `.publicShell:has([data-landing-hero]) …` 隱藏 header／footer 產品名稱的規則，Landing 的 header、footer 與其他公開頁一致。
- §4.5「整頁只有一個可讀的 MIMIC 名稱」的原意僅限 **wordmark 圖與 h1 不重複朗讀**（wordmark 圖層 `aria-hidden`，h1 文字 visually-hidden），不涵蓋全站 header／footer。

### 2R.3 測試基準確認

- verification 中 Vitest 16 項、Playwright 8 項失敗：請在**未修改的 `HEAD`（4549d9c）乾淨 worktree**（放在 `.tmp/` 下）重跑同樣指令，逐項標示「HEAD 即失敗（既有）」或「本輪造成」。本輪造成者必須修正。
- `pixel-responsive.spec.ts`、`public-and-auth.spec.ts` 中 `toBeVisible → toBeAttached` 的 h1 改動可保留，但需另加斷言：h1 的 accessible name 為 `mimic`，且 wordmark 圖層 `aria-hidden="true"`。

### 2R.4 範圍外檔案

- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-prop-position-review.html` 在工作樹中出現整檔換行符號變動（內容無差異），本輪不得修改此檔；若是工具造成，請還原為與 HEAD 位元組一致。

### 2R.5 仍待 Ed 在下一輪審閱確認

對話框配色（`#f0dfc4`／`#bc9b65`／亮金 CTA）、360 寬手機初始畫面 Mimiku 右緣約 24px 出框（本輪不改）、木牌留白。

## 2R2：第二輪審閱修正（2026-11-10）

2R 審閱結果：桌機填滿縮放、品牌還原、測試基線（失敗皆為 HEAD 既有或 loopback 不穩，獨立重跑通過）均已確認。以下為 Ed 的決定，以及 Ed 授權審閱者代為決定的項目。

### 2R2.1 對話框字級與 CTA 隨 s 放大（僅桌機）

- 在 `fit ≥ 1` 時，對話框內文、說話者名稱、CTA 字級與 CTA 內距依 s 放大，上限 1.5 倍：`font-size = clamp(16px, 16px × s ÷ 1.2, 24px)`（說話者名稱與 CTA 同比例），CTA 最小 44×44 CSS px 不變。文字仍是 HTML，不放進 transform 容器。
- 內文與 CTA 在對話框內**垂直置中**。
- `fit < 1` 與手機維持 16px。
- 任何尺寸都不得溢出 safe zone；溢出時沿用 §5 改排到舞台下方的規則。verification 記錄各桌機尺寸的實際字級。

### 2R2.2 場景受寬度限制時不撐滿一屏

- 當 `可用寬 / 960 < 可用高 / 540`（寬度決定 s，例如 768×1024 平板直向），hero 高度 = 包框高度（加上排到下方的對話框高度，如果有），場景靠上，不再垂直置中，`#features` 直接接在下方。
- 受高度限制的桌機（如 1920×1080）維持現狀。

### 2R2.3 審閱者代為決定（Ed 授權）

1. **對話框配色核准**：文字 `#f0dfc4`（13.10:1）、說話者 `#bc9b65`（6.54:1）、CTA 亮金（9.61:1）。對比都超過 AA，說話者用低調黃銅，CTA 用亮金，符合 decision-log 2026-11-06「亮金只給主要互動」。
2. **360 寬手機改為置中裁切**：可視寬 `vw < 390` 時，初始 `scrollLeft = (390 + floor((390 − vw) ÷ 2)) × s`；`vw ≥ 390` 維持 `390 × s`。理由：360 寬 Android 在台灣很常見，Mimiku 是首屏主角，不該被切掉。這樣兩側各吸收 15px，木牌（x=405）與 Mimiku 都能幾乎完整入鏡，不必改 `layout.json`。e2e 需驗證 360 寬時 Mimiku 的可見寬度，並把實際被裁掉的 px 寫進 verification（若裁掉的只有透明邊，也要註明）。
3. **木牌留白核准，在 2A 上線**：木牌文字牽涉文案與是否可點，屬 2B 的互動決策；空白木牌是完整的道具，不會看起來像壞掉。

### 2R2.4 交付

- 截圖另存 `screenshots-2r2/`，舊版唯讀。尺寸同 2R（10 個）。
- 只需重跑 Landing 相關 Vitest、`landing-phase-2a`、`pixel-responsive`、`public-and-auth`，加上 lint、typecheck、build；2R 已有完整基線，本輪不需重跑全套與 real-backend。

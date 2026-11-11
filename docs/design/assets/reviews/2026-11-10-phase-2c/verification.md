# Phase 2C Home 秘密基地

## 審核入口

- [十尺寸 × 三種資料狀態](screenshots/)
- [QuickExpense 選擇寶箱彈窗](screenshots/quick-expense-dialog.png)
- [1920×1080 桌機動態](videos/1920x1080-idle-ledger.webm)與 [390×844 手機動態](videos/390x844-idle-ledger.webm)

## 素材

`npm run assets:promote` 核對 56 份來源與 runtime 的 SHA-256。本輪以下 10 份標為 `promoted-phase-2c`。Home 保留自己的地面光，篝火則沿用 Landing 已推廣的素材。

| 核准來源及 runtime 相對路徑 | 共用 SHA-256 |
| --- | --- |
| `motion/mimiku-idle-desktop.png` | `0b8b02f95ccb6ab14c62dff03cebb6c7723852599848314d112eef14d1760887` |
| `motion/mimiku-idle-phone.png` | `2dd09d8eb34f9f28055303c04a189ea9840c765ef919debfecb311b8b25cfd3f` |
| `motion/mimiku-record-ledger-desktop.png` | `45ae5b2d20baa2d0cedc7e33219c9600a5beb260af1d6e7cdaa3a26cbbde9083` |
| `motion/mimiku-record-ledger-phone.png` | `f5aecd67b8299d53598bde6ef971bf2c7400ab330322963b4ffff87ed84a39c2` |
| `scenes/home/actors/mimiku-desktop.png` | `804b4017687a1311d86b4ec18e512b2e5c6d3b6d0907c56f7dff44203575a6d0` |
| `scenes/home/actors/mimiku-phone.png` | `c5b4aefba8f0d94f862b9d1e256197f54c9ea42ce3cb8b6225d87e5f3fe742dc` |
| `scenes/home/desktop-architecture.png` | `2db9902425dfaff05cc38426c937acbef89113f8e30dd05635ca7ca8019c31cc` |
| `scenes/home/desktop-ground-light.png` | `99dbf37ce7a58662ec5c6643803cee682ccb19d375d0e342cf302c978d1742eb` |
| `scenes/home/phone-architecture.png` | `db69ee964a5fbc94a35518bf116f8aadc92b222306d39068d1baebf9b13a0567` |
| `scenes/home/phone-ground-light.png` | `bdb1df6d5b5bcc8f6ec383b314b60b7d5a51a362db1b63a3a53492c02ffce261` |

| Sheet | PNG 尺寸 | 格數 | 單格與 layout 的 Mimiku 圖層 |
| --- | ---: | ---: | ---: |
| Desktop idle | 354×123 | 3 | 118×123 |
| Desktop ledger | 590×123 | 5 | 118×123 |
| Phone idle | 288×100 | 3 | 96×100 |
| Phone ledger | 480×100 | 5 | 96×100 |

## 場景與動態

- `web/src/shared/scene/geometry.ts` 提供縮放、像素取樣規則、圖層邏輯座標及底圖組裝。兩個頁面各自保留版面定位，Home 的美術圖層透過單一 transform 縮放，live HTML 使用 CSS 像素定位。
- `sprite.ts` 以 rAF 與 `frame_ms` 選格，處理 sprite sheet 預載與顯示。 `use-scene-motion.ts` 監聽場景交集、頁面可見性與動態偏好，`scene-pause-button.tsx` 提供共用按鈕。暫停繼續使用 `mimic.landing.animation-paused`，保留已儲存的偏好。
- 最近冒險以日期、活動 UUID 由大到小選出，UUID 用於同日排序。 `mimic.home.latest-activity.personal` 或 `mimic.home.latest-activity.<groupId>` 保存 `occurred_on/UUID`。沒有活動時保存空字串，第一次成功寫入只記錄，之後只有排序更大的最新活動才觸發。進入時即寫入最新值，快速重載也只會觸發一次。這沿用現有讀模型的日期精度，當同日新增活動沒有成為最新一筆時，場景維持 idle。儲存內容包含日期及 ID。
- Ledger 逐格播放 5×100 ms 並停止 idle。減少動態顯示第 4 格 1.5 秒，再回到 idle 第 0 格。暫停或停用儲存時 Home 保留一般操作。QuickExpense 使用原有路由、選擇彈窗與排序，在儲存被瀏覽器封鎖時回到預設順序。

| 狀態 | 咪咪庫台詞 |
| --- | --- |
| 離線 | 現在離線，我先幫你看著最後的狀態。 |
| 沒有寶箱 | 這裡還空空的，先建立一個寶箱吧！ |
| 有待辦 | 有 N 件事等你確認喔。 |
| 其他 | 今天要記點什麼嗎？ |

最近冒險採用 `PixelPanel`。Home 區塊覆寫 `--mimic-color-hud-dark` 為 `#211a18`。依 WCAG 相對亮度公式，對 surface、surface-raised、coin-action 的對比分別為 **16.47:1、17.13:1、9.61:1**。

## 驗證環境

乾淨基線為 `.tmp/phase-2c-baseline` 的 82752e1。真實 API 只聽 `127.0.0.1:3323`，PostgreSQL 只聽 `127.0.0.1:55444`，資料庫為 `mimic_phase_2c`。截圖矩陣的三個帳號獨立，避免既有任務投影將群組待辦計入個人畫面。

## Home 實測

以下是有待辦與活動的情境。尺寸以 CSS px 計，倍率及包框由瀏覽器讀取。手機欄是裁切前的場景，外包框等於視窗寬。360 px 時兩側各裁 15 px，430 px 時兩側各留 20 px 洞窟底色。

| 視窗 | 倍率 | 場景 | 最近冒險 | 對話框 |
| --- | ---: | ---: | ---: | ---: |
| 768×1024 | 0.4354 | 418.00×235.12 | 130.62×129.69 | 418.00×54.44（流式） |
| 1280×720 | 0.9111 | 874.67×492.00 | 273.33×108.25 | 874.66×65.84 |
| 1366×768 | 0.9778 | 938.67×528.00 | 293.33×112.27 | 938.66×67.44 |
| 1440×900 | 1.1000 | 1056.00×594.00 | 330.00×119.55 | 1056.00×70.38 |
| 1536×864 | 1.1111 | 1066.67×600.00 | 333.33×120.20 | 1066.66×70.66 |
| 1920×1080 | 1.1458 | 1100.00×618.75 | 343.75×122.28 | 1100.00×71.50 |
| 2560×1440 | 1.1458 | 1100.00×618.75 | 343.75×122.28 | 1100.00×71.50 |
| 360×780 | 1.0000 | 390.00×600.00 | 336.00×113.59 | 336.00×76.00 |
| 390×844 | 1.0000 | 390.00×600.00 | 366.00×113.59 | 366.00×76.00 |
| 430×932 | 1.0000 | 390.00×600.00 | 366.00×113.59 | 366.00×76.00 |

矩陣檢查三種狀態的 h1、台詞、活動／待辦連結、場景未縮放座標、殼層與 Home 的計算 token、手機留白和全頁捲動寬度。430×932 另檢查多寶箱彈窗、Escape 焦點恢復、離線停用及原有狀態訊息，以及文字放大 200% 後的流式排版。QuickExpense 彈窗沿用既有原生 dialog 位置。

## 完整套件與基線

| 驗證 | 82752e1 基線 | 候選版完整首跑 |
| --- | --- | --- |
| Lint | 通過，2 個既有 ESLint 設定警告 | 通過，同樣 2 個警告 |
| Typecheck 與正式版 build | 通過 | 通過 |
| Vitest | 694 通過、42 失敗 | 720 通過、19 失敗 |
| Playwright | 464 通過、98 跳過、2 失敗 | 466 通過、110 跳過、4 失敗 |

- Vitest 有 17 個候選版失敗可在基線以同名測試重現，涵蓋舊素材重建、來源完整性和歷史 HTML。另兩項為 2C 推廣清單尚未納入測試，以及隔離目錄漏複製根目錄的 `icon.png`。更新精確清單後，在原工作目錄執行受影響的 7 個測試檔，66 項全數通過。
- Playwright 有兩個基線即失敗的 phone 測試，分別是 Avatar / Classes 與 Mimiku States / Actions 審閱頁，兩者皆在候選版重現。Home 導覽首跑另出現 320 px 橫向溢出和平板基金快捷記帳逾時，後續複驗結果列於下方。
- Landing 2A／2B 正式版功能回歸 30 項全數通過。採樣時遇到的開發版 320 px 火把逾時，在正式版同一測試通過。
- 完整套件的原始日誌位於 `.tmp/phase-2c-{baseline-unit,unit,baseline-e2e,full-e2e}.log`，受影響單元測試與 Landing 功能複驗位於 `.tmp/phase-2c-{focused-final,landing-prod-e2e}.log`。

### 最新正式版複驗

- Lint 通過，保留相同兩個警告。Typecheck 與正式版建置通過。
- Home 與既有導覽測試共 8 項通過。320 px 的本輪橫向溢出已修正，平板基金快捷記帳首跑逾時，基線與候選版的獨立複驗均通過。Home 四項涵蓋狀態矩陣、共用暫停、離線、減少動態、idle／眨眼和 ledger。
- 最新正式版已重拍 31 張 Home 截圖並錄製兩段 WebM。原始記錄為 `.tmp/phase-2c-final-home.log` 與 `.tmp/phase-2c-baseline-tablet.log`。
- 最新正式版的 Landing 2A／2B 回歸再次通過 30 項，記錄在 `.tmp/phase-2c-final-landing.log`。

## Landing 像素比較

`screenshots-2r/` 的 **25 張歷史截圖全部零像素差異**。比較解碼後的 RGBA，容差為 0。自動截圖的篝火格隨實際擷取時間而變，重拍時分別取樣四個原有格。768×1024 和 1920×1080 預設圖匹配篝火第 1 格。390×844 火把峰值在動畫 240 ms 匹配歷史圖。上述三張另在同一瀏覽器重拍 82752e1 與最新候選版，結果也完全一致。

兩個火把峰值均以正式版擷取。開發版的 Next.js 指示器曾出現在桌機峰值圖的右上角，手機首次錄得的峰值時間也造成局部色值差 1。正式版與指定動畫時間的重拍結果均已對齊。原始截圖保留在 `.tmp/phase-2c-landing-identical/`，逐張比較結果見 `.tmp/phase-2c-landing-parity-final.json`。

## 待視覺審閱

請檢視桌機場景 75% 高度限制下的第一屏、最近冒險的 PixelPanel 外框、四句台詞、回到 Home 播 ledger 的判斷及減少動態的末格停留，以及暖褐色在 Home 和快捷記帳彈窗中的呈現。

## 2R 首輪視覺修正（2026-11-11）

- Home 用內容欄的 CSS container query 在 640 px 切換場景。Phone 場景維持 390×600、1×。只有內容欄小於 390 px 才突破 padding。動態以 CSS 實際顯示的場景為準。
- 桌機對話框外框以安全區高為下限，左右與上下內縮分別為 54×s、34×s，內容垂直置中。窄桌機的安全區連最小 CTA 都放不下時，首屏即使用正常流。其餘內容溢出與放大文字仍由原有量測判斷。
- Phone 暫停鈕移到左側，底緣距對話框安全區上緣 8 px。360、390、430 及 768 px 視窗皆檢查與 Mimiku、篝火、冒險卡及對話框的矩形交集。
- 639→640→639 px 的即時調整檢查場景切換與 idle 圖檔就緒。SSR 測試保留 Next.js 串流 HTML 的揭露程式，只阻擋載入 hydration 的外部 JS，比較 768×1024、1024×768 與 1440×900 的場景和對話框座標。

2R 審閱證據另存 [截圖](screenshots-2r/)、[桌機錄影](videos-2r/1920x1080-idle-ledger.webm) 與 [手機錄影](videos-2r/390x844-idle-ledger.webm)。

有活動與待辦的實測如下，單位為 CSS px。

| 視窗 | Home 內容欄 | 版型 | 場景 | 對話框 |
| --- | ---: | --- | ---: | --- |
| 768×1024 | 417.94 | Phone | 390×600 | 366×76，場景內 |
| 1024×768 | 658.56 | Desktop | 658.56×370.44 | 658.56×90.63，正常流 |
| 1920×1080 | 1100 | Desktop | 1100×618.75 | 1100×136.34，填滿安全區 |

34 張新截圖涵蓋 11 種視窗 × 3 種狀態及快捷記帳彈窗。兩段新錄影涵蓋 idle、眨眼和 ledger。前後 SHA-256 比對確認舊版 Home 截圖與錄影及 2B Landing 基準共 58 份完全相同。

Landing 2A／2B 的 30 項 Playwright 均通過。正式版的 25 張畫面與 2B `screenshots-2r/` 解碼後 RGBA 零差異。以相同篝火格比對，並在動畫 240 ms 擷取桌機與手機火把峰值。逐張結果見 `.tmp/phase-2c-2r-landing-parity.json`。

2R 指定的 6 個 Vitest 測試檔共 29 項通過。Lint 通過並保留 2 個既有設定警告，typecheck 與 build 通過。Home 五項 Playwright 皆通過，涵蓋 33 個狀態畫面、版型切換、SSR、暫停與減少動態、idle／眨眼及 ledger。真實後端及 DB 皆位於專用 loopback 環境。

既有導覽測試在 320 px 已通過 Home 的溢出與快捷入口檢查，首跑在接下來的基金支出頁等待彈窗逾時。以相同正式版單獨重跑後通過，其他三種視窗首跑通過。記錄位於 `.tmp/phase-2c-2r-home.log` 與 `.tmp/phase-2c-2r-nav-retry.log`。2R 停在視覺審閱。


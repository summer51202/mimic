# Phase 2G 記帳完成動畫驗證

狀態：實作及 production 回歸已完成，待 Ed 視覺審核。基線為 `.tmp/phase-2g-baseline` 的乾淨 detached worktree，HEAD 為 `2a2cda84c1dfdc3ef3310fe958682f71808fdf86`。瀏覽器測試使用本機專用 PostgreSQL `mimic_phase_2g`，API 和 DB 的連線皆使用各自命名空間的 `127.0.0.1`。

## 成功點與去重

- 個人記帳：`web/src/features/personal-expenses/personal-page.tsx` （第 165 行附近）的 `PersonalExpenseForm.onSaved` 傳入當次表單是否為新增；`saved` 設定通知後只對未刪除的新增紀錄呼叫 `celebrate`。
- 共同支出：`web/src/features/shared-expenses/shared-workspace.tsx` （第 137 行附近）的 expense `onSaved` 以表單開啟時的 `editing` 判定；設定通知後使用群組 ID。
- 基金支出：`web/src/features/pooled-funds/pooled-workspace.tsx` （第 259 行附近）的 expense `onSubmit` 使用通過 `pooledExpenseMutationSchema` 且 refresh 成功的紀錄。
- 三頁都在新增表單開啟時預載當前變體。小夥伴實際顯示才寫 `mimic.home.latest-activity.<context>`，以與 Home 相同的字串排序保留較新值。已知同日 UUID v4 排序限制沿用現行 API 契約。
- 個人浮動鈕問題在乾淨基線實測重現。第一次開啟成功，關閉後第二次點擊沒有重開。候選在關閉新增表單時清除 `quick=1` 並保留其他參數；浮動鈕在同頁開表單也保留列表位置。

## 位置與播放

| 視窗 | 實測 bbox（x, y, w, h） |
| --- | --- |
| 360×780 | 16, 596, 96, 100 |
| 390×844 | 16, 660, 96, 100 |
| 768×1024 | 634, 817, 118, 123 |
| 1440×900 | 1306, 693, 118, 123 |

390×844 已實測 `(16,660,96,100)`；1440×900 已實測 `(1306,693,118,123)`，與浮動鈕垂直相隔 12 px。首輪桌機 personal 實測影格為 0、1、2、3、4，約 2005.9 ms 隱藏。減少動態直接停在第 4 格。手機兩尺寸與底部導覽垂直相隔 12 px，與浮動鈕水平相隔 74／104 px。768／1440 與浮動鈕垂直相隔 12 px。Production Chromium 量測第 4 格約 403–417 ms 出現，已完成樣本約 2000–2014 ms 隱藏。頁首通知與焦點還原可影響頁面既有的捲動錨定，動畫本身沒有焦點或捲動操作。

## SHA-256

| 檔案 | 基線 | 候選 |
| --- | --- | --- |
| 兩份 motion-timing.json | `939505ed9b3f3871587af5a076894a0c6c94077283a66a25649767766c674695` | `30020fedaac9b3d74f7b7e4ebfe0238a62cfed306d2c3490868a839b999c811a` |
| production-asset-manifest.json | `fd4a9f8b53fdcdc7e8afea3489bc757c866e100521072adae32d36549f6099f3` | `f5769fe019430c5bbf16cd37ba0ef64630d809e45b483017524119ad064108ec` |

保留 manifest 中退役圖片及衍生素材來源的原始 hash。既有 `npm run assets:promote -- --phase-2f` 驗證 13 份資產成功。

## 測試與失敗歸屬

- 新增 `record-confirmation-phase-2g.spec.ts`、`motion-timing.test.ts`。更新 `tokens.test.ts`、`settlement-panel.test.tsx` 、`shared-workspace.test.tsx` 與 `shared-expenses.runtime.spec.ts`。
- 既有：基線浮動鈕重現。新 timing 與字型測試在修正前分別抓到舊 hash 與未定義 token。原有 ESLint 兩個匿名預設匯出警告。
- 本輪造成並修正：首輪 TypeScript 的變體回傳型別過寬。Vitest 的 JSDOM 無 matchMedia，SharedWorkspace fixture 缺少 router mock。
- 環境／執行問題：早期瀏覽器測試碰到 localhost 連線和 Next.js 重複程序，修正後取得真正的基線重現。Windows 首輪 `web-build-context.test.ts` 的 5 秒逾時觸發 `--testTimeout=20000` 全套重跑。

## 實測與審核素材

- [錄影](videos/) 含三頁的一般播放（390×844、1440×900）、390×844 減少動態與回 Home 去重。手機一般錄影開始先捲到列表中段。動畫顯示時 personal、shared、pooled 的 `scrollY` 分別為 2153、816、2703。
- [截圖](screenshots/) 含三頁第 4 格、360×780 個人頁、兩種尺寸的減少動態、Mimic ID、結算與浮動鈕對照。個人浮動鈕第二次點擊在候選重新開啟，390×844 與 1440×900 均已擷取。Production Web 的三頁取消及新增成功後重開測試通過。
- Home 個人對照錄影使用新帳本。儲存後記錄 `2026-11-13/c5f4bff6-afa6-4f1f-996d-e213889f3aae`。共同與基金錄影的群組 key 分別寫入 `2026-11-13/2478ba5e-2c98-4941-b310-19b6b0bc8b35` 與 `2026-11-13/f30a696d-ab4e-4a6f-ba79-c38f980802f1`。
- 360×780 另實測 `(16,596,96,100)`。桌機 1440×900 個人及共同頁觀察到 0→4，約 2011.9 和 2008.6 ms 隱藏。

## 驗證狀態

| 檢查 | 觀察到的結果 |
| --- | --- |
| Active Mimic naming | Linux 通過 |
| Backend | Linux 安裝、Prisma、build、Jest 和 HTTP e2e 通過，Jest 322 項、HTTP 37 項 |
| Linux Web PWA | lint、typecheck、CI workflow contract 通過。首輪 5 秒逾時及已修正的瀏覽器 API mock 問題。候選全套用 `--testTimeout=20000 --maxWorkers=2` 重跑，127 個檔案、666 個測試通過，含 `web-build-context.test.ts`。Linux production build 通過 |
| Production containers | 首輪 CI 步驟通過。兩個 Web Dockerfile 都 build 成功、以 `node` 啟動且健康端點回傳 `{"data":{"ok":true}}`。最新候選的兩個 Web image 重建後亦通過 `node` 身分與 `/api/health/live`，見 `.tmp/phase-2g-railway-resume.log` |
| Windows lint、typecheck | 執行通過。Windows build 在候選 dev server 同時運作時發生 `.next` 輸出目錄存取錯誤，屬驗證環境問題 |
| 新舊 Playwright | 本機重跑曾發生熱編譯等待、導覽逾時及 `ERR_NETWORK_CHANGED`。改以 Linux production build 執行，2G 11/11 通過。最終四尺寸矩陣 4/4；2A–2F 55 項通過，2 項舊錄影擷取測試依既有設定跳過。共同支出 real-backend 1 項通過，涵蓋結算標籤及更正時不播放 |
| 逐像素 | 未觸發時的六組截圖有首次擷取差異，後續重跑。Home 1024×768 其中一組首次出現 6 像素差異，重跑為 0。2F 曾在相同尺寸記錄取樣波動。三頁 390／1440 的重跑六組均為 0 像素。Landing header 以下 11/11 為 0 像素。Home 1280×720 離線擷取由 917 像素降到 0。重拍等待離線台詞渲染及兩個 rAF，對照組使用相同擷取條件。Home 11 個尺寸 × 四種狀態，首輪 43/44、獨立重拍 1/1，合計 44/44 均取得 0 像素差異 |

原始記錄放在 `.tmp/phase-2g-*.log`。舊截圖及錄影在本輪唯讀。

## Home 去重實測

| Context | 新增前 | 顯示時 | 回 Home |
| --- | --- | --- | --- |
| personal | 空字串 | 2026-11-13/7d115d81-2b1d-4bc3-8501-5b16a9d66ee6 | 保持原值、無 data-ledger |
| shared | 空字串 | 2026-11-13/e68e7fab-b1db-45e6-8edd-9cf53c998612 | 保持原值、無 data-ledger |
| pooled | 空字串 | 2026-11-13/c554aef9-0dd4-4f17-b00b-caef23976d4e | 保持原值、無 data-ledger |

三組 API 對照均有觸發 Home ledger。

## 回歸失敗歸屬

- 本輪驗證執行問題：從 repo 根目錄啟動 2A 測試時，360×780 案例找不到相對路徑的素材。改從 web/ 執行後通過。WSL 背景服務停止時也曾產生連線重設、拒絕連線及 Prisma 連線關閉。持續執行本機服務後，2A–2F 與共同支出 real-backend 重跑通過。
- 既有瀏覽器擷取波動：Home 1024×768 場景曾出現 6 像素差異，2F 亦曾記錄相同尺寸的差異。獨立重拍同一組為 0，維持 0 像素容差。

## Home ledger 逐格對照

- 基線與候選皆使用 Linux production Web。以相同場景固定格號擷取 Mimiku，390×844、1440×900 各五格，10/10 的 RGBA 像素完全相同。自動播放實測 0→4，約每 100 ms 換格。
- 抽取 2F 舊 WebM 與本輪重錄 WebM 的角色區。390×844 兩支影片均辨識到 0→4，各格取樣連續幀數均為 3、2、3、2、3（25 fps）。1440×900 的候選影片辨識到 0→4。舊桌機影片的第 1 格無法由壓縮後的取樣獨立辨識，桌機舊影片的完整逐格時序仍無法確認。時序實測與基線逐格 PNG 結果見 .tmp/phase-2g-home-motion-probe.log、.tmp/phase-2g-video-paired.log 及 .tmp/phase-2g-exact-motion-pixels.log。

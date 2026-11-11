# Phase 2E-1 驗證紀錄

日期 2026-11-11。乾淨基線為 `4c28a8325de607cdd5de4f2a083e14bb27825a3f`，detached worktree 位於 `.tmp/phase-2e1-baseline/`。Linux 驗證在 WSL 原生檔案系統執行，從相同提交以 `core.autocrlf=false` checkout，並在乾淨快照套入本階段的 manifest、Web 程式和資產。這樣可驗證候選內容，也符合工作區維持未 stage、未 commit 的要求。

## 核准資產

在 `web/` 執行 `npm run assets:promote -- --phase-2e1`，輸出 `Verified SHA-256 for 4 Phase 2E-1 assets.`。四筆紀錄的 `disposition` 為 `promoted-phase-2e1`，`runtime_target` 為 `web/public/pixel-ui/v1/<下列路徑>`。每筆的核准原檔、推廣副本及 manifest 的資產 SHA-256 一致。

| 路徑 | SHA-256 |
| --- | --- |
| `frames/frames.json` | `51d1edf28c539c4a751b706dd0a435b6657345b69b828c81812d1387e2a07d6c` |
| `motion/motion-timing.json` | `674fd84b067217695e099df7025873ffb0855c194d035f81448f7f72f51f927f` |
| `scenes/home/layout.json` | `2fa53acff142375c18f9f7308062af69a808b97886cdea4ccd02af48f37ebb23` |
| `scenes/landing/layout.json` | `7e9ec5651326d2dcb5020c9615309bc913eb5709e82298ae8df7fe0e401cddd4` |

`production-asset-manifest.json` 更新後的 SHA-256 為 `05464be06d085de1f6eb1af3b0bda13d1d7e9156ad651094944a415316a5b74a`。Manifest 的 diff 只有上述四筆的 `runtime_target` 與 `disposition`。

## 五處 import

| 檔案與行號 | 修改前 | 修改後 |
| --- | --- | --- |
| `web/src/features/home/home-scene-motion.ts:1` | `../../../../docs/design/assets/approved/page-visual-v1/motion/motion-timing.json` | `../../../public/pixel-ui/v1/motion/motion-timing.json` |
| `web/src/features/home/home-scene.tsx:4` | `../../../../docs/design/assets/approved/page-visual-v1/scenes/home/layout.json` | `../../../public/pixel-ui/v1/scenes/home/layout.json` |
| `web/src/shared/brand/landing-motion.ts:1` | `../../../../docs/design/assets/approved/page-visual-v1/motion/motion-timing.json` | `../../../public/pixel-ui/v1/motion/motion-timing.json` |
| `web/src/shared/brand/landing-scene.ts:2` | `../../../../docs/design/assets/approved/page-visual-v1/scenes/landing/layout.json` | `../../../public/pixel-ui/v1/scenes/landing/layout.json` |
| `web/src/shared/ui/pixel-dialogue.tsx:2` | `../../../../docs/design/assets/approved/page-visual-v1/frames/frames.json` | `../../../public/pixel-ui/v1/frames/frames.json` |

## 防回歸測試

`web/src/test/web-build-context.test.ts` 解析 `web/src/`、`web/next.config.ts` 和 `web/scripts/` 的非測試 JS/TS 程式。它透過 TypeScript AST 辨識 import、re-export、`import()`、`require()` 等模組引用，以 TypeScript 設定和 Node 解析器找出目標，再用真實路徑檢查是否位於 `web/`。Node 內建模組直接通過，無法解析的引用或非字面值的模組路徑會報錯。資產測試繼續從 `docs/` 讀取核准資料。

用 Linux `node:22` 在獨立快照執行 `npm test -- src/test/web-build-context.test.ts`。每次只把表中一處 import 回退到基線，其餘四處維持候選路徑。五次各以 exit 1 結束，每次只列出被回退的那一行，訊息為 `resolves outside web/ (../docs/…)`。恢復全部候選 import 後重跑，exit 0。

## Linux Web PWA job

| 目錄 | 指令 | 結果 |
| --- | --- | --- |
| repo | `node --test scripts/verify-mimic-naming.test.mjs` | 6 通過 |
| repo | `node scripts/verify-mimic-naming.mjs` | 通過 |
| web | `npm ci` | 通過 |
| backend | `npm ci` | 通過 |
| backend | `npm run prisma:generate` | 通過 |
| web | `node --test ../scripts/verify-ci-workflow.test.mjs` | 32 通過 |
| web | `npm run lint` | 0 錯誤，兩項既有審閱設定警告 |
| web | `npm run typecheck` | 通過 |
| web | `npm test` | 126 檔、659 測試全數通過，exit 0 |
| web | `npm run build` | 通過，Next.js 產生 33 個靜態頁面並完成 standalone 產物 |

環境為 WSL Docker `node:22`，Node `v22.23.4`。Web CI 使用 `MIMIC_API_BASE_URL=http://localhost:3000/api/v1` 與 `MIMIC_COOKIE_SECURE=false`。第一輪 Windows 匯出的 Git 快照受 `core.autocrlf=true` 影響，歷史審閱檔的內容 hash 和定位標記出現差異。改用原生 Linux checkout 後，這些差異消失。期間 Docker 連線中斷一次，重跑後依上述結果記錄。

原生快照的兩次 Vitest 執行分別遇到 3 與 6 個 5 秒逾時，當時同時有容器、建置或另一組測試作業。待這些作業結束後，以 `VITEST_MAX_WORKERS=2` 執行原指令 `npm test`，保留 5 秒逾時設定，112.28 秒內完成全部測試。日誌為 `.tmp/phase-2e1-native-ci.log`、`.tmp/phase-2e1-native-idle-test.log` 和 `.tmp/phase-2e1-native-web-build.log`。

## Linux Web 映像

在同一原生 Linux 候選快照從 repo 根目錄執行。兩次 build 使用 `web` context 和 CI 的 `--build-arg MIMIC_API_BASE_URL=http://127.0.0.1:3000/api/v1`。

| 指令 | 結果 | 映像 manifest digest |
| --- | --- | --- |
| `docker build --build-arg MIMIC_API_BASE_URL=http://127.0.0.1:3000/api/v1 -f web/Dockerfile web -t mimic-web:phase-2e1` | exit 0 | `sha256:c3ff3bfcefb0f866a8655e5fa804ea62010c1f01f58558820fdc6fe78e148f4b` |
| `docker build --build-arg MIMIC_API_BASE_URL=http://127.0.0.1:3000/api/v1 -f web/Dockerfile.railway web -t mimic-web:phase-2e1-railway` | exit 0 | `sha256:7e490c3e90860d706e29e03e96a8867ea1a2efcde844b260f1c89d1038503f2e` |

兩個映像的 `Config.User` 均為 `node`，`Config.Cmd` 均為 `["node","server.js"]`，且 `docker run --rm --entrypoint node <image> --version` 均輸出 `v22.23.2`。各映像以 `--publish 127.0.0.1::3000` 啟動，`curl --fail` 呼叫 `/api/health/live` 均回傳 `{"data":{"ok":true}}`，容器隨後清除。

## 像素比對

以同一個 Chrome Headless `158.0.8127.18` 對兩個 WSL Linux 正式建置取樣。Landing 使用 2D 後的 `4c28a83`，從整頁 PNG 裁掉 header。Home 使用同一基線上的 2C 場景區，以同一帳號和空白狀態擷取可見的 `[data-home-viewport]`。兩邊均暫停動畫，等待字型、可見圖像和 Home 的三個動畫圖層載入，並等待兩個畫面更新週期後依序取樣。

| 區域 | 視窗尺寸 | 尺寸一致的 PNG 配對 | RGBA 相異像素 |
| --- | --- | ---: | ---: |
| Landing header 以下 | 360×780、390×844、430×932、768×1024、1024×768、1280×720、1366×768、1440×900、1536×864、1920×1080、2560×1440 | 11 | 0 |
| Home 場景區 | 同上 | 11 | 0 |

第一次平行取樣在三個 Home 尺寸得到非零差異。將兩邊的圖層載入狀態對齊後依序重跑，逐一比較所有 RGBA 值，容差仍為 0。取樣與比對證據位於 `.tmp/phase-2e1-pixels/` 和 `.tmp/phase-2e1-settled-pixels.log`。

## Playwright 行為驗證

四個既有 spec 都以 `--project=desktop` 執行，各 spec 依自己的視窗矩陣取樣。候選站台與 API 在 WSL Docker 執行，使用隔離的 PostgreSQL 18、12 個 migrations 與 31 筆系統分類種子資料。Playwright 從 Windows 使用 headless 瀏覽器連到 Linux 站台。

| Spec | 通過 | 執行環境 |
| --- | ---: | --- |
| `landing-phase-2a` | 10/10 | Playwright 配套 Chromium Headless Shell `149.0.7827.55` |
| `landing-phase-2b` | 22/22 | Chrome Headless `158.0.8127.18`，啟用 `MIMIC_PHASE_2B_SW=1` 和 `MIMIC_PHASE_2B_CAPTURE=1` |
| `home-phase-2c` | 5/5 | Playwright 配套 Chromium Headless Shell `149.0.7827.55`，完成 taxonomy seed 後執行 |
| `navigation-phase-2d` | 11/11 | Chrome Headless `158.0.8127.18` |

首輪 Home 的四個案例因資料庫缺少系統分類收到 `SYSTEM_TAXONOMY_MISSING`。首輪 Landing 2A 的請求清單另收到 Chrome 發出的 Phase 2D favicon 請求。完成種子資料並改用 Playwright 配套的 Headless Shell 後，這兩組重跑合計 15/15 通過。Phase 2B 和 Navigation 2D 的通過結果見 `.tmp/phase-2e1-e2e.log`，重跑結果見 `.tmp/phase-2e1-bundled-e2e.log`。

## 交付檢查

`.agents/devlog.md` 追加一筆，追加內容為 CRLF，原有 257,813 位元組逐位元組一致。基線 worktree 的 HEAD 為 `4c28a83`，狀態乾淨。候選變更保留在工作目錄，Git index 無差異。交付停在審閱者驗收。

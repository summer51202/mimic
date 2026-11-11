# Phase 2E-1：Web 映像建置不依賴 `web/` 以外的檔案

日期：2026-11-11。狀態：待 Codex 實作。不改畫面，不需要視覺審核；做完停在審閱者驗收。

## 0. 背景

2E-0 之後，CI 的 **Production containers** job 失敗（push 之後的第一次執行）：

```
docker build ... -f web/Dockerfile web
./src/features/home/home-scene-motion.ts
Module not found: Can't resolve '../../../../docs/design/assets/approved/page-visual-v1/motion/motion-timing.json'
```

原因：Docker 的建置 context 只有 `web/`，但從 Phase 2A 起，產品程式在 build 時直接 import repo 根目錄 `docs/` 底下的四個核准 JSON。以前 CI 早就在別的 job 失敗，所以沒有人發現。Railway 的 `mimic-web` 也是以 `/web` 為根目錄、用 `web/Dockerfile.railway` 建置，**同樣會失敗**，所以這個問題不修，staging 部署不了。

非測試程式中引用 `docs/` 的地方共五處（審閱者用 `git grep` 確認）：

| 檔案 | import |
|---|---|
| `web/src/features/home/home-scene-motion.ts` | `motion/motion-timing.json` |
| `web/src/features/home/home-scene.tsx` | `scenes/home/layout.json` |
| `web/src/shared/brand/landing-motion.ts` | `motion/motion-timing.json` |
| `web/src/shared/brand/landing-scene.ts` | `scenes/landing/layout.json` |
| `web/src/shared/ui/pixel-dialogue.tsx` | `frames/frames.json` |

這四個 JSON 正好是 `production-asset-manifest.json` 裡全部的 JSON 紀錄，目前都還是 `staged-only-until-consumer-plan`、`runtime_target: null`。

## 1. 審閱者的決定（附理由）

- **把四個 JSON 推廣進 `web/`，產品程式改從 `web/` 內 import**。不改 Docker context，也不改 Railway 的 rootDirectory。理由：基礎設施（`.railway/`、Dockerfile、CI）都假設 web 可以獨立建置；推廣模型（核准檔逐位元組複製、檢查 hash、寫 `runtime_target`）本來就是 PNG 在用的做法，JSON 照同一套最一致。
- **目的地是 `web/public/pixel-ui/v1/<同路徑>`**，`disposition: "promoted-phase-2e1"`。理由：沿用現有的 `runtime_target` 規則、推廣腳本和 `assets.test.ts` 的檢查，不必另外發明一套規則。這些 JSON 只是場景座標、框線與動畫時序，被公開讀取沒有影響。2A decision-log 寫的「build 時 import，不經網路提供」仍然成立：程式只在 build 時 import，不會在執行時 fetch。
- **加一個防回歸測試**：`web/src`、`web/next.config.ts`、`web/scripts` 底下的非測試程式，import 或 require 的路徑解析後都必須落在 `web/` 之內。測試檔不受這條限制（測試本來就會讀 `docs/` 來比對 hash）。

## 2. 範圍

### 2.1 做

1. 用 `npm run assets:promote` 推廣四個 JSON（腳本加上 phase 2e1 清單與 `-- --phase-2e1` 參數，作法比照 2D）。逐檔核對 SHA-256，寫入 `runtime_target` 和 `disposition`。
2. 五處 import 改指向 `web/public/pixel-ui/v1/…`，用相對路徑或既有的 alias 都可以，只要解析後在 `web/` 之內。
3. 防回歸測試（§1）。
4. `assets.test.ts`、`asset-style-gate.test.ts` 等推廣相關的檢查，納入 phase 2e1 這四筆。

### 2.2 不做

- 不改 JSON 內容、不改任何數值、不改畫面。
- 不改 Dockerfile、`.dockerignore`、`.github/workflows/ci.yml`、`.railway/`、`backend/`。
- 測試檔裡讀取 `docs/` 做 hash 比對的部分維持不動。

## 3. 驗證

- 基線：`4c28a83` 的乾淨 worktree（`.tmp/`）。
- 在 Linux（WSL Docker `node:22`），從候選 tree 的乾淨 checkout：
  - CI Web PWA job 的完整步驟：naming、`npm ci`（web 與 backend）、`prisma:generate`、workflow contract、lint、typecheck、`npm test`、build。
  - CI Production containers job 的關鍵步驟：`docker build -f web/Dockerfile web`、`docker build -f web/Dockerfile.railway web`（**兩個都要過**），以及 workflow 裡的 web 映像 smoke check 與 `/api/health/live` 健康檢查。
- `landing-phase-2a`、`landing-phase-2b`、`home-phase-2c`、`navigation-phase-2d` 跑一次，確認畫面行為不變。截圖逐像素比對：Landing 對 2D 之後的 header 以下區域，Home 對 2C 的場景區，容差 0。
- 產出 `docs/design/assets/reviews/2026-11-11-phase-2e1/verification.md`：推廣 hash、manifest 新的 SHA-256、五處 import 修改前後的路徑、防回歸測試的說明（並證明把任一 import 改回 `docs/` 時它會失敗）、Linux 指令結果、兩個 Docker build 的結果。
- `.agents/devlog.md` 追加一筆（CRLF）。

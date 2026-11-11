# Phase 2E-0：恢復 CI（命名檢查與歷史審閱測試）

日期：2026-11-11。狀態：待 Codex 實作。這輪不改產品程式，也不需要視覺審核；做完停在審閱者驗收。

## 0. 背景與 Ed 的決定

- Railway 的 `mimic-web`／`mimic-api` 開了「Wait for CI」。GitHub Actions 的 CI 從 2026-11-06 前後就一直失敗，所以 staging 一個多月沒有更新，2A–2D 都沒有上線。
- CI 最近一次執行（`cfc7ac6`，run #13）：Backend、Production containers 是綠的；**Active Mimic naming** 和 **Web PWA** 失敗。Web PWA 的 `npm test` 在 Linux 上有 11 個測試檔、18 個失敗，全部是 Phase 1 的歷史審閱工具測試，不是產品程式。
- Ed 決定（2026-11-11）：開一輪修 CI，照審閱者的建議：修命名檢查；逐一查被改過的輸入檔；把重建歷史審閱產物的測試搬出 CI；`npm test` 全綠。

## 1. 審閱者已查到的事實

| 失敗 | 原因 |
|---|---|
| Active Mimic naming | `docs/design/mimic-web-ui-v0.2.md` 第 117–230 行中有 20 行連結指向 `docs/design/assets/legacy/pairfund-v0.2/…`，命中舊品牌名檢查（`scripts/verify-mimic-naming.mjs`）。來源是 commit `913acbd`。其他提到這個路徑的檔案：`docs/design/pairfund-mobile-ui-round2-v0.2.md`、`docs/design/pairfund-mobile-ui-v0.2.md`、`docs/superpowers/plans/2026-09-14-visual-asset-hierarchy.md`、`docs/superpowers/specs/2026-09-14-visual-asset-hierarchy-design.md`（這幾個不在檢查範圍內，但連結也要跟著改）。程式碼和測試裡沒有引用這個路徑。 |
| pressure-plate attempt-04／05／06／v02（10 個） | 這些工具寫死了 `docs/superpowers/specs/2026-11-02-landing-prop-placement-and-pressure-plate-design.md` 的 hash 與其中的 prompt 片段。但這份 spec 在 git 裡**只有一個版本**（`0362db3`，2026-11-06），而且已經包含後來追加的「C 修訂 attempt-05」「決定：移除壓力板」等小節。也就是說，工具寫死的是 commit 之前的中間版本，從乾淨的 checkout 永遠無法通過。 |
| ancient-chest-v04（2 個）、restored-chest（1 個） | 寫死了 `samples/treasure-chest-states-v01/open-sprite.png`、`v02/open-sprite.png` 的 hash。這兩個檔在 git 裡同樣只有一個版本（`4acb2aa`，2026-11-06），推測是 commit 前被後續回合覆寫。 |
| home-base、home-base-v02、landing-prop-placement-application、landing-prop-positioning（各 1 個） | 重建後的輸出跟 manifest 或 receipt 的 hash 不一致（例如 `desktop-receipt` 實際 `67474daa…`，期待 `620802128…`）。 |
| asset-style-gate「defines the accessible motion and reduced-motion calibration contract」（1 個） | motion 樣本的 hash 是 `d4ce6c00…`，期待 `f85417e0…`。 |

本機 Windows 有 29 個失敗，Linux CI 只有 18 個。多出來的是 Windows 上的 5 秒逾時與環境差異。**本輪目標以 Linux 為準。**

## 2. 範圍

### 2.1 做

1. **命名檢查**（§3）。
2. **逐一查證被改過的輸入與輸出**（§4），寫進 verification。
3. **拆出歷史審閱測試套件**（§5）。
4. 讓 CI 的四個 job 在 Linux 上都會通過（§6）。

### 2.2 不做

- 不改 `web/src` 的產品程式、`backend/`、Dockerfile、`.github/workflows/ci.yml`、`.railway/`。如果你認為必須改到其中任何一個，先停下來回報。
- 不修改任何已核准素材（`docs/design/assets/approved/`）、`web/public/`，也不改 2A–2D 的審閱產物。
- 不重新生成、也不覆寫 Phase 1 的歷史樣本、review HTML 或 manifest，只能讀。唯一的例外是 §4 判定為「誤改且能從 git 還原」的檔案。
- 不用 ImageGen。

## 3. 命名檢查

- 用 `git mv` 把 `docs/design/assets/legacy/pairfund-v0.2/` 改名為 `docs/design/assets/legacy/v0.2-prototype/`，內容位元組不變（verification 列出改名前後的檔案數，以及每個檔案的 SHA-256 是否一致）。
- 更新 §1 列出的五個檔案裡指向舊路徑的連結。只改路徑，其他文字一律不動（這些是歷史文件）。
- 改完後再搜尋一次 `pairfund-v0.2`，確認沒有任何地方還連到舊路徑。
- 改完後，任何審閱工具或測試都不能因為「這些檔案的 hash 變了」而出現新的失敗。如果有工具寫死了這幾個檔案的 hash，先停下來回報。
- `node scripts/verify-mimic-naming.mjs` 和 `node --test scripts/verify-mimic-naming.test.mjs` 都要通過。

## 4. 逐一查證（先查，再決定怎麼處理）

對 §1 每一個被改過的輸入，以及每一個 hash 不符的輸出，用 `git log --follow`、manifest／receipt 紀錄、`.tmp/` 或其他副本，判斷屬於哪一種：

| 判定 | 處理 |
|---|---|
| A. 誤改，而且 git 裡有寫死 hash 那一版 | 還原那個檔案，讓測試恢復通過，並保留在 CI。 |
| B. 有意更新（後續回合刻意改的，有紀錄可查） | 更新寫死的 hash 或 prompt，並在 manifest 或 verification 註明原因與日期。只有在這個更新不會連帶改寫其他審閱產物時才這樣做，否則依 C 處理。 |
| C. commit 之前的中間版本，git 裡找不到（審閱者目前的推測，壓力板 spec 與 `open-sprite.png` 都屬於這類） | 不還原、不重新生成。把這個測試列入 §5 的封存套件，並在 verification 記錄為「已知的 lineage 缺口」：寫死的 hash、實際的 hash、無法還原的原因。 |

`asset-style-gate.test.ts` 這個檔案主要在保護已核准素材與推廣規則，必須留在 CI。只有 motion 樣本那一個 test 要依上表判定；判定為 C 時，把這一個 test 搬到封存套件，同檔案的其他 test 不能搬。

## 5. 歷史審閱測試套件

- 新增 `web/vitest.review-archive.config.ts` 和 script `npm run test:review-archive`。主設定 `web/vitest.config.ts` 用 `exclude` 排除封存套件，`npm test` 不再執行它們。
- **搬進封存的條件**（同時符合）：
  1. 測試的對象是 `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/` 下的歷史審閱產物；
  2. 測試會執行 `compose-*.mjs`、重建或寫入該資料夾的檔案，或者寫死了 §4 判定為 C 的輸入。
- **留在 CI**：保護已核准素材（`approved/page-visual-v1/`）、`web/public/`、推廣規則、產品元件的測試，以及歷史審閱裡只讀取、目前會通過的完整性檢查。
- 原則是整個測試檔一起搬，用檔名清單或 glob 管理，不要在測試檔裡加條件跳過。如果一個檔案裡同時有兩類測試（例如 `asset-style-gate.test.ts`），只把要封存的 test 拆到新檔案（例如 `asset-style-gate.review-archive.test.ts`），原檔保留其餘部分，並在 verification 列出拆分清單。
- verification 要有一張表：搬了哪些檔案、各自的理由（對應上面哪個條件）、在封存套件裡的目前結果（通過或已知失敗，以及原因）。封存套件裡允許有已知失敗，但每一個都要列出來。
- 在 `web/README.md` 加一段說明：`test:review-archive` 是什麼、為什麼不在 CI、何時該跑（例如修改歷史審閱工具時）。
- 搬完後，`npm test` 的測試數加上封存套件的測試數，要等於搬之前的總數（726），不能有測試消失。

## 6. 驗證

- 基線：`88173fa` 的乾淨 worktree（`.tmp/`）。
- **Linux 驗證**：在 Linux 環境（WSL 或 `node:22` Docker 容器）、從乾淨的 checkout 跑 CI 裡 naming 與 Web PWA 兩個 job 的完整步驟：`node --test scripts/verify-mimic-naming.test.mjs`、`node scripts/verify-mimic-naming.mjs`、web 的 `npm ci`、backend 的 `npm ci` 與 `prisma:generate`、`node --test ../scripts/verify-ci-workflow.test.mjs`、`npm run lint`、`npm run typecheck`、`npm test`、`npm run build`。全部要通過。如果沒辦法在 Linux 上跑，在 verification 說明原因，並在 Windows 上跑同一組步驟；最終的確認會在 Ed push 之後，看 GitHub Actions 的結果。
- 跑一次 `npm run test:review-archive`，記錄結果。
- `git diff --stat` 只能出現 §2.1 範圍內的檔案；改名的部分要顯示為 rename。
- 產出 `docs/design/assets/reviews/2026-11-11-phase-2e0/verification.md`，內容包括：§3 改名的 hash 對照、§4 每一項的判定與證據、§5 搬移清單與測試數守恆、§6 指令結果（以及在哪個環境跑的）、未完成事項。
- `.agents/devlog.md` 追加一筆（CRLF）。

## 7. 審閱者驗收時會看的點

1. §4 每一項判定都有 git 證據，沒有任何一項只是「直接更新 hash 讓它過」。
2. 從 CI 搬走的測試，沒有一個在保護產品或已核准素材。
3. 測試總數守恆。
4. 命名檢查通過，legacy 資料夾裡的檔案位元組不變。

## 2R：第一輪停止點的決定（2026-11-11，審閱者決定）

Codex 在 §3 停下：`samples/derivations/treasure-chest-states-v04/audit-baseline.cjs` 用 `baseline.json` 寫死了 876 個檔案的 hash，其中包括兩份 2026-09-14 visual-asset-hierarchy 文件。

### 2R.1 `audit-baseline.cjs` 不構成阻擋

- 這是 v04 那一輪的**時間點快照稽核**，只出現在 `ancient-treasure-chest-v04-verification.md` 的手動指令裡，不在任何測試或 CI 中。
- 審閱者在 2D 核准後的 HEAD 重算：撇開這兩份文件，`baseline.json` 已經有 18 個檔案不符（decision-log、review-index、`assets.test.ts`、`hero.*` 等等，都是 2A–2D 的正當修改）。它本來就會失敗，多兩份連結修改不改變它的意義。
- 決定：**保留**這兩份文件的連結路徑修改，`audit-baseline.cjs` 與 `baseline.json` 不動。在 verification 記錄它是時間點快照、目前不符的數量，以及不符的理由。

### 2R.2 換行差異另列一類「D」（補充 §4）

查證時發現 motion 的 HTML 與 controller，是 git blob（LF）跟核准時 Windows 工作樹的位元組（混合 CRLF）不同。這不是內容被改過，而是 `core.autocrlf` 造成的。

| 判定 | 處理 |
|---|---|
| D. 只差在換行，Ed 的工作樹位元組正好等於寫死的 hash | 在 `.gitattributes` 對**該檔案的精確路徑**加 `-text`（不要用萬用字元涵蓋整個資料夾），讓 git 原樣保存位元組，再把工作樹的檔案重新加入，使 blob 等於核准時的 hash。工作樹的位元組不能有任何改變。verification 要列出每個檔案：工作樹 hash、舊 blob hash、新 blob hash、寫死的 hash。 |

- **不允許**在測試裡於記憶體中重建或正規化換行再算 hash。第一輪 controller 的這種做法要撤回，改用 D。
- 其他還沒判定的項目（`open-sprite.png`、home-base／home-base-v02 manifest、landing-prop-placement receipt、landing-prop-position）也要先檢查是不是 D：比對工作樹位元組、git blob 與寫死的 hash。是 D 就照 D 處理，不是 D 再依 A／B／C 判定。
- 依 D 處理的測試可以留在 CI，但必須在 Linux 從乾淨 checkout 跑確實通過，才算數。

### 2R.3 接續

從第一輪停止點繼續完成 §4–§6。verification 要改寫成完整版本，保留「§3 暫停原因」這一節。

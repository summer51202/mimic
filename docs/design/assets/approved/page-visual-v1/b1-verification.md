# Gate B1 驗證紀錄

日期 2026-11-09。狀態為 B1R 待審閱。

## 匯出清單

| 家族 | 檔案數 | 核准來源 |
|---|---:|---|
| Wordmark | 2 | 2026-09-23 wordmark calibration |
| Icons | 24 | Install/Favicon、Maskable 與 48 px optical evidence |
| Mimiku 靜態 | 6 | 2026-10-02 的 512 × 512 狀態 master |
| Scenes | 18 | Landing 擺位、手機探索條 3R3、Home v02 |
| Props | 35 | Landing 核准圖層、v04 寶箱、v04 壁畫與四個章節提示 |
| Frames | 6 | Frames 2R 的五張圖與原始 nine-slice 資料 |
| Motion | 11 | Motion 2R 的桌機及手機各五張 sprite sheet，以及共用 timing |
| **合計** | **102** | **98 PNG + 4 JSON** |

[production-asset-manifest.json](production-asset-manifest.json) 逐檔記錄來源、輸出 SHA-256、尺寸、格數與預定消費方式。每筆 `runtime_target` 為 `null`，`disposition` 為 `staged-only-until-consumer-plan`。

## 匯出決策

- B1R 分別量測核准校準圖左側 display 與右側 compact 的 `alpha > 0` 外框，原尺寸裁切後四邊各留 8 px 透明邊。manifest 的裁切矩形採 `[x, y, width, height]`，放置位置皆為 `(8, 8)`。
  - Display 裁切 `[28, 67, 900, 265]`，輸出 916 × 281，預定 CSS 寬度 240–640 px。
  - Compact 裁切 `[936, 302, 240, 70]`，輸出 256 × 86，預定 CSS 寬度 96–220 px。
- Home 與 Landing 的兩組地面光共享同一批核准像素。依 Scenes 清單保留四個檔名，對 Home 的兩張 PNG 採不同的無損編碼，使檔案 SHA-256 各自唯一。
- Home layout 的頭像槽以 `avatars/{class}-full.png` 引用後續資產，包含 `physician`。槽位座標、尺寸和落地點沿用 Home v02。Landing layout 引用手機探索條和正式 Props，並將標題靜態顯示指向 Motion 2R 標題 sheet 的第一格。
- 可見範圍以 `alpha > 0` 判定。核准的 `event-contribution`、`event-expense`、`nav-adventure-log`、`nav-tasks` 及桌機／手機蝙蝠圖層沒有 `alpha = 255` 的像素，匯出保留原 alpha。

## 檢查結果

- 初次 B1 測試先因 manifest 缺失失敗，再因 `frames/frame-dialogue.png` 缺失失敗。B1R 的兩個新增測試先分別因舊畫布 1536 × 512 與 768 × 256 失敗。
- B1R 匯出後執行 `npm test -- --run src/shared/brand/asset-style-gate.test.ts`，19 項通過。檢查 manifest 與目錄清單、PNG 簽章、尺寸、alpha、透明 RGB、可見範圍、來源和輸出雜湊、橫向格數以及逐格 RGBA。兩張字標另檢查實際四邊透明邊距與預定 CSS 寬度。
- 在 `web/` 執行 `node node_modules/eslint/bin/eslint.js src/shared/brand/asset-style-gate.test.ts` 和 `npm run typecheck`，均通過。匯出腳本通過 `node --check`。
- 在 repo 根目錄執行 `node docs/design/assets/approved/export-page-visual-b1.mjs --check`，102 個檔案與 manifest 全部重建為相同位元組。移除 `--check` 可重新匯出。
- 另核對 layout 與 timing 的 66 筆資產引用，SHA-256 與適用的尺寸或格數均與 manifest 一致。
- 其他六個家族與 `c917a51` 的 Git diff 為空，其 100 筆 manifest 紀錄也與 B1R 前相同。
- `git diff a157a83 -- web/public web/src/app web/src/features web/src/shared/ui web/src/shared/navigation web/src/styles icon.png` 為空，這些路徑也沒有新出現在 Git 狀態中的未追蹤檔。工作目錄另有既存且受 Git 忽略的 `web/public/sw.js`，最後寫入日期為 2026-09-14。

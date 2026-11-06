# Landing 古老珍藏寶箱 — 風格修訂

日期：2026-10-20。狀態：使用者已確認設計並授權整組視覺稿；圖稿仍 awaiting-calibration。

## 已確認方向

寶箱是小隊找到、修好後繼續使用的古老珍藏，非 Mimiku。保留圓拱木蓋與原朝向。裝飾克制，珍藏感來自工藝與年代，不靠華麗金邊、符文或寶石鑲嵌。深暖棕木材、大面積安靜色塊，少量暗鐵結構與細長機械鎖扣；接觸處局部磨亮，修復只留一處，不能是突兀亮銀包角。像素表現以戰士 master 與實際圖層共同校準。

取代上一版 v02 的通用大方鎖、亮銀修復與過度等距亮面金屬表現；不推翻四主狀態、鎖扣先釋放、開蓋重量、金幣與少量寶石、整組審核的既定需求。

## 執行調整（沿用既有計畫）

依 2026-10-20-landing-restored-treasure-chest.md 的同一個交付／驗證流程，另存 v03，舊來源、輸出、管線、規格、計畫與測試唯讀保留。為避免重複整套已驗證播放模組，沿用 restored-chest.config/model/controller/raster 與舊 renderer wrapper；新增 compose-ancient-treasure-chest.mjs 負責新 provenance、共同 lattice、49 PNG 和 overwrite guard，render-ancient-treasure-chest.mjs 只改新頁文案與歷史比較。

- [x] 唯讀基線：保留 1025 原檔 hash 與 staged binary diff hash。
- [x] 先新增 ancient-treasure-chest.test.ts，觀察 7 tests 因缺新 manifest 而失敗；browser smoke 因缺新 HTML 失敗。初次環境錯誤不算 RED。
- [x] v03 整組、獨立 manifest／頁面，來源與實際 prompts 保存；不覆寫舊稿。
- [x] 四主狀態與四過渡幀、實際大小、2×、真實灰階、戰士參照、原場景與手機。
- [x] focused Vitest 80、ESLint、typecheck、四 viewport Playwright 188、兩次直接 Node rebuild、透明 RGB／尺寸／共同尺度／包絡外像素均通過。
- [x] self-review：無剩餘 critical／important 實作問題。驗證紀錄與 devlog 隨交付保存；停止在整組視覺審核，不自動 approved 或升 runtime。

## 凍結範圍

桌機 960×540，寶箱共同104×120包絡及 origin(92,230)、ground(144,350)不動。桌機標題(376,100,288,84)，手機標題(130,59,148,98)不動；手機所有圖與其餘人物、背景、篝火、地圖木箱、陷阱、UI完全保留。原檔只能 devlog 末尾增量。

不使用 worktree／subagent，不 stage／commit；不觸碰 attachments/reference。只做 Phase1 review，不修改 web/public、runtime、registry、PWA、service worker、產品頁或帳務，不標示 approved，不做 production exports／Phase2。

## 參照的界線

Mana Seed／Humble Pixel 的公開作品只用於討論材質分工、簡潔結構與像素造型，沒有下載、複製或輸入生成工具。創意來源全部由 built-in ImageGen 產生／修訂，實際輸入檔與每次生成／編修關係保存於 v03 lineage。

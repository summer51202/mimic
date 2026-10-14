# Landing — 手機標題獨立定位延伸

**日期：** 2026-10-14
**狀態：** 使用者要求桌機定位完成後換手機；沿用先前提議的桌機／手機獨立切換，本文待書面核對。
**範圍：** Phase 1 靜態 review-only 工具，不是素材或 Scenes family 核准。

## 1. 已確認方向

延伸 `2026-10-14-landing-title-positioning-tool-design.md`，只解除其「手機版不能定位」限制；保留其他 review-only 與 dirty 保護規則。

先前已提議並獲「桌機我已經調整好了，現在換手機」回覆的方式：同一審核頁提供桌機／手機切換，各自拖曳、還原、複製 JSON，互不影響。相較另開手機專用頁，此方式方便來回比對且不分散工具；相較依視窗寬度自動換圖，明確切換不會在 resize 時意外改變正在操作的構圖。

本輪不調大小、亮度、字形、像素顆粒或場景物件；手機仍使用等大、上排 MI 靠左／下排 MIC 靠右的既有透明字標，不重新 ImageGen。

## 2. 來源與座標

相對素材路徑以 `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/` 為根。

| 項目 | path | 尺寸 | SHA-256 |
| --- | --- | --- | --- |
| 無標題手機底圖 | `samples/landing-a-title/scene-phone-logical.png` | 390×600 | `7573dceb82c484c223164d26e4fc6514f65ee2149d65001bba0e9a2a824f693d` |
| 手機兩行字標 | `samples/landing-a-title/wordmarks/phone-staggered.png` | 148×98 | `8fd7d677df46cc77478518de2a9f68ff77b8ae4d28deb25e6b11ad5ba6ee8f1c` |

手機初始／還原位置為左上角 x=116、y=93 logical px。整顆字標移動，不分開拖 MI 與 MIC。尺寸固定 148×98；位置整數化，限制 x 在 0..242、y 在 0..502。輔助中心百分比使用手機自己的 390×600 分母。不能把桌機座標或 viewport 像素套到手機。

手機 payload 沿用 `mimic-landing-title-position/v1`，frame.id=`phone-staggered`、frame.width=390、frame.height=600；其 source paths/hashes 與固定字標尺寸必須對應手機。桌機 payload 形狀及 frame.id=`desktop-single` 保持相容。

## 3. 頁面與操作

現有 `landing-a-title-review.html` 的定位區加兩個清楚標示的切換按鈕。一般開啟預設仍為桌機，保留舊操作入口；以 `?position=phone` 開啟時預設選手機。未知 query 值回桌機，不解析任意素材或座標。

切換只顯示所選 frame；不因 viewport 改變而自動切換。桌機固定 960:540，手機固定 390:600、寬度上限 390px，兩者等比例縮放。手機亦呈現其獨立木牌、登入、對話與 CTA review overlays，不套用桌機 overlay 尺寸。

每個 frame 擁有獨立定位、mode、guide 偏好、JSON、還原與複製狀態。切換前終止舊 frame 拖曳；隱藏 frame 不可聚焦或繼續移動。切換往返保留本次頁面載入期間的座標，不重置另一側。還原只影響當前 frame。

沿用 pointer capture、觸控拖曳、方向鍵 1px／Shift 10px、四方向微調、乾淨預覽與 clipboard fallback。只在可拖字標上阻止觸控捲動；其他區域正常捲動。缺失或尺寸不符的素材只停用該 frame，不讓另一 frame 失去功能；所有必要 metadata 與 script 內嵌，可從 file URL 使用。

複製各自輸出當前 frame JSON。延遲／連續 clipboard 請求須維持全工具的寫入先後，避免切到手機複製後較舊的桌機請求覆蓋剪貼簿；成功訊息只能標示實際複製的 frame 與位置版本，不把隱藏 frame 的延遲成功當成當前 frame 成功。失敗顯示手動複製方式，不誤報成功。

## 4. 桌機已調整位置的保護

使用者說桌機已調整完成，不代表 repository 已收到或套用座標。現有工具沒有 localStorage；重新載入會回 manifest 初始位置。修改磁碟 HTML 也不會取得瀏覽器中的 transient state。

因此先請使用者複製／貼回桌機 JSON，在收到前不重新整理其現有 tab、不假設座標、不改 manifest/config 或重新合成桌機圖。工具實作與新 query 入口不等於桌機位置已保存。桌機 JSON 的驗證／套用另依使用者明確授權處理，不納入此次手機工具。

不新增自動持久化、匯入、輸入座標或儲存檔案功能。重整仍回各 frame 的 manifest 初始位置，UI 清楚提醒先複製；同次載入切換則保留兩側 state。

## 5. 分界與驗證

在原純 model、controller、tool renderer、HTML-only renderer CLI 做最小增量：model 使用明確 frame metadata，拒絕未知 frame 或錯配尺寸；controller 不硬編桌機分母；renderer 保留整個歷史比較頁。frame 切換與全工具 clipboard 排序有清楚責任邊界，不引入 framework 或遠端依賴。

TDD 先觀察 failing tests，再實作。focused Vitest 檢查兩種 frame、手機初始／clamp／比例／payload，以及既有桌機回歸。Playwright 在 320、390、768、1440 驗證兩側拖曳、切換保留、獨立還原、觸控、鍵盤、mode／guide、clipboard race／fallback、錯圖隔離及無水平溢位；保留歷史 scene contracts，實際 file URL 能用。

相關 ESLint、typecheck、HTML-only determinism、素材/config/manifest hashes 不變、git diff --check、增量 whitespace 檢查及真實截圖目視。repository self-review 修正重要問題；verification-before-completion 使用實際命令結果，不從 focused tests 推論 full production build 通過。完成非 trivial 實作後 append devlog。

## 6. 邊界與停止點

Inline，不派 subagent、不建 worktree。保留 main 所有既有 dirty/staged/untracked；不觸碰或暫存 `.codex-remote-attachments/`、`reference/`。新規格可以 exact path 獨立提交；既有重疊 implementation 留為未提交修改，不混合舊 index。

不改 PNG/source/master/gray、manifest/config 座標、runtime source、web/public、registry、PWA manifest、service worker、產品頁面、帳務、Home、互動素材、production exports 或 Phase 2。reviewOnly=true、runtimePromotion=false、awaiting-calibration 不變。

書面核對後寫增量實作計畫。實作完成與驗證後開手機定位入口，說明拖曳／複製方式，停止等使用者手機位置 JSON 或修改意見，不自動核准或套用。

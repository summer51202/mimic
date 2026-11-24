## 2R7 驗證總表

| 項目 | 目前結果 |
|---|---|
| 只有後端 CI | Naming、Backend、Backend DB、Web、Containers 均通過 |
| 全部 CI | Naming、Backend、Backend DB、Web、Containers 均通過 |
| Containers health／cookie runtime | 兩樹的標準與 Railway web Dockerfile health 均通過。16 個 locale cookie runtime 案例通過 |
| 2R7 RGBA | 313 組通過，276 組 RGBA 相同、22 組為 §8.4 預期差異。0 組觸發停止 |
| 全套 e2e | 549 通過／2 失敗／237 略過／0 不穩定 |
| 2R7 aa-noise 例外 | 15 組，詳見下表 |
| 後端相容性 | 專用 DB 只跑 migrate deploy、未 seed 的日文分類與 Home 驗證通過。新 Web 實接 7bca944 API 日文分類回退為 Food |
| 截圖及 SHA-256 | [截圖清單](screenshot-inventory.txt) · [配對雜湊](pixel-regression-sha256.txt) · [2R7 幾何結果](aa-noise/measurements-2r7.json) |

| 語言 | A 組 DOM／RGBA 已記錄 | B 組 DOM／RGBA 已記錄 |
|---|---:|---:|
| 中文 | 112／112 | 88／88 |
| 英文 | 99／99 | 88／88 |
| 日文 | 不適用（7bca944 Web 未提供日文） | 88／88 |

A 組用 7bca944 Web 對候選 Web，API 都用 7bca944。B 組兩端用同一候選 Web，對照 7bca944 API 與候選 API。以下保留前輪停止與恢復的歷史紀錄，最新狀態以本節為準。

七組既有非零差異依 2R7 重拍，五組 RGBA 相同、兩組符合 aa-noise。基金退回彈窗前後 scrollY 都是 1212，重拍逐像素相同。原 PNG 與雜湊已保留。

全套 e2e 自第 1 項執行，專用 PostgreSQL、API、production Web 分別為 `127.0.0.1:25434`、`127.0.0.1:3905`、`127.0.0.1:3904`。

依 §8.5 補齊 production 日文公開頁、登入／註冊驗證、外殼、設定、離線、更新通知及 route 狀態的 360×800、390×844、1440×900 證據。route 錯誤和載入以專用 localhost 代理分別注入 500 與延遲，沿用正式版 route 元件。global-error 與更新通知沿用實際元件的固定狀態擷取。

- A-login-390x844-zh，文字節點有差異。§8.4 授權的語言控制項前後圖：[before](screenshots/A-login-390x844-zh-2r7-review-before.png)、[after](screenshots/A-login-390x844-zh-2r7-review-after.png)。
- A-register-390x844-zh，文字節點有差異。§8.4 授權的語言控制項前後圖：[before](screenshots/A-register-390x844-zh-2r7-review-before.png)、[after](screenshots/A-register-390x844-zh-2r7-review-after.png)。
- A-settings-390x844-zh，文字節點有差異。§8.4 授權的語言控制項前後圖：[before](screenshots/A-settings-390x844-zh-2r7-review-before.png)、[after](screenshots/A-settings-390x844-zh-2r7-review-after.png)。
- A-login-390x844-en，文字節點有差異。§8.4 授權的語言控制項前後圖：[before](screenshots/A-login-390x844-en-2r7-review-before.png)、[after](screenshots/A-login-390x844-en-2r7-review-after.png)。

`phone` 的 Avatar / Classes 與 Mimiku states and actions 案例在 7bca944 重現同一斷言（預期 undefined，收到 390）。兩次紀錄位於 `.tmp/phase-2ib-2r7-e2e.log` 與 `.tmp/phase-2ib-2r7-baseline-e2e.log`。

| aa-noise 配對 | 差異像素 | 群集 bounding box | computed radius | c |
|---|---:|---|---|---|
| A-home-ready-430x932 (zh) | 2 | 87, 873, 88, 874 / 89, 873, 90, 874 | 0px/0px / 0px/0px | 4/4 / 4/4 |
| A-personal-add-390x844 (zh) | 6 | 44, 740, 45, 741 / 44, 742, 45, 743 / 46, 742, 47, 743 / 44, 856, 45, 857 / 44, 858, 45, 859 / 46, 858, 47, 859 | 4px/4px / 4px/4px / 4px/4px / 4px/4px / 4px/4px / 4px/4px | 4/4 / 4/4 / 4/4 / 4/4 / 4/4 / 4/4 |
| A-draft-recovery-390x844 (zh) | 2 | 44, 147, 45, 148 / 46, 147, 47, 148 | 4px/4px / 4px/4px | 4/4 / 4/4 |
| A-home-empty-390x844 (en) | 2 | 79, 785, 80, 786 / 81, 785, 82, 786 | 0px/0px / 0px/0px | 4/4 / 4/4 |
| A-home-empty-430x932 (en) | 2 | 87, 873, 88, 874 / 89, 873, 90, 874 | 0px/0px / 0px/0px | 4/4 / 4/4 |
| B-home-empty-360x780 (ja) | 2 | 73, 721, 74, 722 / 75, 721, 76, 722 | 0px/0px / 0px/0px | 4/4 / 4/4 |
| B-home-empty-390x844 (ja) | 2 | 79, 785, 80, 786 / 81, 785, 82, 786 | 0px/0px / 0px/0px | 4/4 / 4/4 |
| A-personal-430x932 (en) | 4 | 94, 873, 95, 874 / 96, 873, 97, 874 / 169, 873, 170, 874 / 171, 873, 172, 874 | 0px/0px / 0px/0px / 0px/0px / 0px/0px | 4/4 / 4/4 / 4/4 / 4/4 |
| B-home-offline-360x780 (ja) | 2 | 73, 721, 74, 722 / 75, 721, 76, 722 | 0px/0px / 0px/0px | 4/4 / 4/4 |
| B-personal-360x780 (ja) | 4 | 80, 721, 81, 722 / 82, 721, 83, 722 / 141, 721, 142, 722 / 143, 721, 144, 722 | 0px/0px / 0px/0px / 0px/0px / 0px/0px | 4/4 / 4/4 / 4/4 / 4/4 |
| B-home-ready-360x780 (en) | 2 | 73, 721, 74, 722 / 75, 721, 76, 722 | 0px/0px / 0px/0px | 4/4 / 4/4 |
| A-tasks-430x932 (en) | 4 | 258, 873, 259, 874 / 260, 873, 261, 874 / 333, 873, 334, 874 / 335, 873, 336, 874 | 0px/0px / 0px/0px / 0px/0px / 0px/0px | 4/4 / 4/4 / 4/4 / 4/4 |
| B-personal-430x932 (en) | 4 | 94, 873, 95, 874 / 96, 873, 97, 874 / 169, 873, 170, 874 / 171, 873, 172, 874 | 0px/0px / 0px/0px / 0px/0px / 0px/0px | 4/4 / 4/4 / 4/4 / 4/4 |
| B-tasks-390x844 (ja) | 4 | 234, 785, 235, 786 / 236, 785, 237, 786 / 301, 785, 302, 786 / 303, 785, 304, 786 | 0px/0px / 0px/0px / 0px/0px / 0px/0px | 4/4 / 4/4 / 4/4 / 4/4 |
| B-tasks-430x932 (ja) | 4 | 258, 873, 259, 874 / 260, 873, 261, 874 / 333, 873, 334, 874 / 335, 873, 336, 874 | 0px/0px / 0px/0px / 0px/0px / 0px/0px | 4/4 / 4/4 / 4/4 / 4/4 |

| 配對 | viewport | scroll 前／後 | DOM 一致 | 判定 |
|---|---|---|---|---|
| A-home-idle-360x780 (zh) | 360×780 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-idle-430x932 (zh) | 430×932 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-empty-360x780 (zh) | 360×780 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-ready-430x932 (zh) | 430×932 | 0,0／0,0 | 是 | aa-noise（2R4）、2R7 量法 |
| A-personal-add-390x844 (zh) | 390×844 | 0,427／0,427 | 是 | aa-noise（2R4）、2R7 量法 |
| A-fund-returns-390x844 (zh) | 390×844 | 0,1212／0,1212 | 是 | 2R7 重拍相同 |
| B-home-empty-2560x1440 (zh) | 2560×1440 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-draft-recovery-390x844 (zh) | 390×844 | 0,0／0,0 | 是 | aa-noise（2R4）、2R7 量法 |
| B-shared-1366x768 (zh) | 1366×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-shared-1440x900 (zh) | 1440×900 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-shared-1536x864 (zh) | 1536×864 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-shared-1920x1080 (zh) | 1920×1080 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-shared-2560x1440 (zh) | 2560×1440 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-shared-360x780 (zh) | 360×780 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-shared-390x844 (zh) | 390×844 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-shared-430x932 (zh) | 430×932 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-idle-768x1024 (en) | 768×1024 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-fund-768x1024 (zh) | 768×1024 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-idle-1024x768 (en) | 1024×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-fund-1024x768 (zh) | 1024×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-idle-1280x720 (en) | 1280×720 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-fund-1280x720 (zh) | 1280×720 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-idle-1366x768 (en) | 1366×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-fund-1366x768 (zh) | 1366×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-idle-1440x900 (en) | 1440×900 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-fund-1440x900 (zh) | 1440×900 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-idle-1536x864 (en) | 1536×864 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-fund-1536x864 (zh) | 1536×864 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-idle-1920x1080 (en) | 1920×1080 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-fund-1920x1080 (zh) | 1920×1080 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-idle-2560x1440 (en) | 2560×1440 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-fund-2560x1440 (zh) | 2560×1440 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-idle-360x780 (en) | 360×780 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-fund-360x780 (zh) | 360×780 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-idle-390x844 (en) | 390×844 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-fund-390x844 (zh) | 390×844 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-idle-430x932 (en) | 430×932 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-fund-430x932 (zh) | 430×932 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-empty-768x1024 (en) | 768×1024 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-tasks-768x1024 (zh) | 768×1024 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-empty-1024x768 (en) | 1024×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-tasks-1024x768 (zh) | 1024×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-empty-1280x720 (en) | 1280×720 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-tasks-1280x720 (zh) | 1280×720 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-tasks-1366x768 (zh) | 1366×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-empty-1366x768 (en) | 1366×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-tasks-1440x900 (zh) | 1440×900 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-empty-1440x900 (en) | 1440×900 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-tasks-1536x864 (zh) | 1536×864 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-empty-1536x864 (en) | 1536×864 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-tasks-1920x1080 (zh) | 1920×1080 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-empty-1920x1080 (en) | 1920×1080 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-tasks-2560x1440 (zh) | 2560×1440 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-tasks-360x780 (zh) | 360×780 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-empty-2560x1440 (en) | 2560×1440 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-tasks-390x844 (zh) | 390×844 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-empty-360x780 (en) | 360×780 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-tasks-430x932 (zh) | 430×932 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-empty-390x844 (en) | 390×844 | 0,0／0,0 | 是 | aa-noise（2R4）、2R7 量法 |
| A-home-empty-430x932 (en) | 430×932 | 0,0／0,0 | 是 | aa-noise（2R4）、2R7 量法 |
| A-home-ready-768x1024 (en) | 768×1024 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-ready-1024x768 (en) | 1024×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-ready-1280x720 (en) | 1280×720 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-ready-1366x768 (en) | 1366×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-ready-1440x900 (en) | 1440×900 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-ready-1536x864 (en) | 1536×864 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-ready-1920x1080 (en) | 1920×1080 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-ready-2560x1440 (en) | 2560×1440 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-ready-360x780 (en) | 360×780 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-ready-390x844 (en) | 390×844 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-idle-768x1024 (ja) | 768×1024 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-ready-430x932 (en) | 430×932 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-idle-1024x768 (ja) | 1024×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-offline-768x1024 (en) | 768×1024 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-idle-1280x720 (ja) | 1280×720 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-offline-1024x768 (en) | 1024×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-idle-1366x768 (ja) | 1366×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-idle-1440x900 (ja) | 1440×900 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-offline-1280x720 (en) | 1280×720 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-offline-1366x768 (en) | 1366×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-idle-1536x864 (ja) | 1536×864 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-offline-1440x900 (en) | 1440×900 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-idle-1920x1080 (ja) | 1920×1080 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-idle-2560x1440 (ja) | 2560×1440 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-offline-1536x864 (en) | 1536×864 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-idle-360x780 (ja) | 360×780 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-offline-1920x1080 (en) | 1920×1080 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-idle-390x844 (ja) | 390×844 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-idle-430x932 (ja) | 430×932 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-offline-2560x1440 (en) | 2560×1440 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-offline-360x780 (en) | 360×780 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-empty-768x1024 (ja) | 768×1024 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-offline-390x844 (en) | 390×844 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-empty-1024x768 (ja) | 1024×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-home-offline-430x932 (en) | 430×932 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-empty-1280x720 (ja) | 1280×720 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-personal-768x1024 (en) | 768×1024 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-fund-768x1024 (en) | 768×1024 | 0,0／0,0 | 否 | §8.4 已核准差異 |
| B-home-empty-1366x768 (ja) | 1366×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-personal-1024x768 (en) | 1024×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-fund-1024x768 (en) | 1024×768 | 0,0／0,0 | 否 | §8.4 已核准差異 |
| B-home-empty-1440x900 (ja) | 1440×900 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-personal-1280x720 (en) | 1280×720 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-empty-1536x864 (ja) | 1536×864 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-fund-1280x720 (en) | 1280×720 | 0,0／0,0 | 否 | §8.4 已核准差異 |
| A-personal-1366x768 (en) | 1366×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-personal-1440x900 (en) | 1440×900 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-empty-1920x1080 (ja) | 1920×1080 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-fund-1366x768 (en) | 1366×768 | 0,0／0,0 | 否 | §8.4 已核准差異 |
| A-personal-1536x864 (en) | 1536×864 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-empty-2560x1440 (ja) | 2560×1440 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-fund-1440x900 (en) | 1440×900 | 0,0／0,0 | 否 | §8.4 已核准差異 |
| A-personal-1920x1080 (en) | 1920×1080 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-empty-360x780 (ja) | 360×780 | 0,0／0,0 | 是 | aa-noise（2R4）、2R7 量法 |
| A-fund-1536x864 (en) | 1536×864 | 0,0／0,0 | 否 | §8.4 已核准差異 |
| A-personal-2560x1440 (en) | 2560×1440 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-empty-390x844 (ja) | 390×844 | 0,0／0,0 | 是 | aa-noise（2R4）、2R7 量法 |
| A-personal-360x780 (en) | 360×780 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-fund-1920x1080 (en) | 1920×1080 | 0,0／0,0 | 否 | §8.4 已核准差異 |
| B-home-empty-430x932 (ja) | 430×932 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-personal-390x844 (en) | 390×844 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-ready-768x1024 (ja) | 768×1024 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-fund-2560x1440 (en) | 2560×1440 | 0,0／0,0 | 否 | §8.4 已核准差異 |
| B-home-idle-768x1024 (en) | 768×1024 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-personal-430x932 (en) | 430×932 | 0,0／0,0 | 是 | aa-noise（2R4）、2R7 量法 |
| A-fund-360x780 (en) | 360×780 | 0,0／0,0 | 否 | §8.4 已核准差異 |
| B-home-ready-1024x768 (ja) | 1024×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-idle-1024x768 (en) | 1024×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-shared-768x1024 (en) | 768×1024 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-fund-390x844 (en) | 390×844 | 0,0／0,0 | 否 | §8.4 已核准差異 |
| B-home-ready-1280x720 (ja) | 1280×720 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-shared-1024x768 (en) | 1024×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-idle-1280x720 (en) | 1280×720 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-fund-430x932 (en) | 430×932 | 0,0／0,0 | 否 | §8.4 已核准差異 |
| B-home-ready-1366x768 (ja) | 1366×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-shared-1280x720 (en) | 1280×720 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-idle-1366x768 (en) | 1366×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-landing-768x1024 (en) | 768×1024 | 0,0／0,0 | 否 | §8.4 已核准差異 |
| B-home-ready-1440x900 (ja) | 1440×900 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-shared-1366x768 (en) | 1366×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-idle-1440x900 (en) | 1440×900 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-landing-1024x768 (en) | 1024×768 | 0,0／0,0 | 否 | §8.4 已核准差異 |
| B-home-offline-768x1024 (ja) | 768×1024 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-shared-1440x900 (en) | 1440×900 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-idle-1536x864 (en) | 1536×864 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-landing-1280x720 (en) | 1280×720 | 0,0／0,0 | 否 | §8.4 已核准差異 |
| A-shared-1536x864 (en) | 1536×864 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-offline-1024x768 (ja) | 1024×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-idle-1920x1080 (en) | 1920×1080 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-landing-1366x768 (en) | 1366×768 | 0,0／0,0 | 否 | §8.4 已核准差異 |
| A-shared-1920x1080 (en) | 1920×1080 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-idle-2560x1440 (en) | 2560×1440 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-offline-1280x720 (ja) | 1280×720 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-landing-1440x900 (en) | 1440×900 | 0,0／0,0 | 否 | §8.4 已核准差異 |
| B-home-idle-360x780 (en) | 360×780 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-offline-1366x768 (ja) | 1366×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-idle-390x844 (en) | 390×844 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-landing-1536x864 (en) | 1536×864 | 0,0／0,0 | 否 | §8.4 已核准差異 |
| B-home-idle-430x932 (en) | 430×932 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-offline-1440x900 (ja) | 1440×900 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-landing-1920x1080 (en) | 1920×1080 | 0,0／0,0 | 否 | §8.4 已核准差異 |
| B-home-empty-768x1024 (en) | 768×1024 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-offline-1536x864 (ja) | 1536×864 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-landing-2560x1440 (en) | 2560×1440 | 0,0／0,0 | 否 | §8.4 已核准差異 |
| B-home-empty-1024x768 (en) | 1024×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-landing-360x780 (en) | 360×780 | 0,0／0,0 | 否 | §8.4 已核准差異 |
| B-home-empty-1280x720 (en) | 1280×720 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-offline-1920x1080 (ja) | 1920×1080 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-landing-390x844 (en) | 390×844 | 0,0／0,0 | 否 | §8.4 已核准差異 |
| B-home-empty-1366x768 (en) | 1366×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-landing-430x932 (en) | 430×932 | 0,0／0,0 | 否 | §8.4 已核准差異 |
| B-home-offline-2560x1440 (ja) | 2560×1440 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-empty-1440x900 (en) | 1440×900 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-offline-360x780 (ja) | 360×780 | 0,0／0,0 | 是 | aa-noise（2R4）、2R7 量法 |
| B-home-empty-1536x864 (en) | 1536×864 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-offline-390x844 (ja) | 390×844 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-empty-1920x1080 (en) | 1920×1080 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-offline-430x932 (ja) | 430×932 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-empty-2560x1440 (en) | 2560×1440 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-personal-768x1024 (ja) | 768×1024 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-empty-360x780 (en) | 360×780 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-personal-1024x768 (ja) | 1024×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-empty-390x844 (en) | 390×844 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-personal-1280x720 (ja) | 1280×720 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-personal-1366x768 (ja) | 1366×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-empty-430x932 (en) | 430×932 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-personal-1440x900 (ja) | 1440×900 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-ready-768x1024 (en) | 768×1024 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-personal-1536x864 (ja) | 1536×864 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-ready-1024x768 (en) | 1024×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-personal-1920x1080 (ja) | 1920×1080 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-ready-1280x720 (en) | 1280×720 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-personal-2560x1440 (ja) | 2560×1440 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-ready-1366x768 (en) | 1366×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-personal-360x780 (ja) | 360×780 | 0,0／0,0 | 是 | aa-noise（2R4）、2R7 量法 |
| B-home-ready-1440x900 (en) | 1440×900 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-personal-390x844 (ja) | 390×844 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-shared-2560x1440 (en) | 2560×1440 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-ready-1536x864 (en) | 1536×864 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-personal-430x932 (ja) | 430×932 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-shared-360x780 (en) | 360×780 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-ready-1920x1080 (en) | 1920×1080 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-shared-390x844 (en) | 390×844 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-shared-768x1024 (ja) | 768×1024 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-ready-2560x1440 (en) | 2560×1440 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-shared-430x932 (en) | 430×932 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-shared-1024x768 (ja) | 1024×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-ready-360x780 (en) | 360×780 | 0,0／0,0 | 是 | aa-noise（2R4）、2R7 量法 |
| A-tasks-768x1024 (en) | 768×1024 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-shared-1280x720 (ja) | 1280×720 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-ready-390x844 (en) | 390×844 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-tasks-1024x768 (en) | 1024×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-ready-430x932 (en) | 430×932 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-tasks-1280x720 (en) | 1280×720 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-shared-1366x768 (ja) | 1366×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-offline-768x1024 (en) | 768×1024 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-tasks-1366x768 (en) | 1366×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-shared-1440x900 (ja) | 1440×900 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-tasks-1440x900 (en) | 1440×900 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-offline-1024x768 (en) | 1024×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-shared-1536x864 (ja) | 1536×864 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-tasks-1536x864 (en) | 1536×864 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-shared-1920x1080 (ja) | 1920×1080 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-offline-1280x720 (en) | 1280×720 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-tasks-1920x1080 (en) | 1920×1080 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-shared-2560x1440 (ja) | 2560×1440 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-tasks-2560x1440 (en) | 2560×1440 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-offline-1366x768 (en) | 1366×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-shared-360x780 (ja) | 360×780 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-tasks-360x780 (en) | 360×780 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-shared-390x844 (ja) | 390×844 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-offline-1440x900 (en) | 1440×900 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-tasks-390x844 (en) | 390×844 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-shared-430x932 (ja) | 430×932 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| A-tasks-430x932 (en) | 430×932 | 0,0／0,0 | 是 | aa-noise（2R4）、2R7 量法 |
| B-home-offline-1536x864 (en) | 1536×864 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-fund-768x1024 (ja) | 768×1024 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-offline-1920x1080 (en) | 1920×1080 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-fund-1024x768 (ja) | 1024×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-offline-2560x1440 (en) | 2560×1440 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-fund-1280x720 (ja) | 1280×720 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-offline-360x780 (en) | 360×780 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-fund-1366x768 (ja) | 1366×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-fund-1440x900 (ja) | 1440×900 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-ready-1536x864 (ja) | 1536×864 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-offline-390x844 (en) | 390×844 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-fund-1536x864 (ja) | 1536×864 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-ready-1920x1080 (ja) | 1920×1080 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-offline-430x932 (en) | 430×932 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-ready-2560x1440 (ja) | 2560×1440 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-fund-1920x1080 (ja) | 1920×1080 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-personal-768x1024 (en) | 768×1024 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-ready-360x780 (ja) | 360×780 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-personal-1024x768 (en) | 1024×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-fund-2560x1440 (ja) | 2560×1440 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-personal-1280x720 (en) | 1280×720 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-fund-360x780 (ja) | 360×780 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-ready-390x844 (ja) | 390×844 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-personal-1366x768 (en) | 1366×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-fund-390x844 (ja) | 390×844 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-home-ready-430x932 (ja) | 430×932 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-personal-1440x900 (en) | 1440×900 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-fund-430x932 (ja) | 430×932 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-personal-1536x864 (en) | 1536×864 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-tasks-768x1024 (ja) | 768×1024 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-personal-1920x1080 (en) | 1920×1080 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-tasks-1024x768 (ja) | 1024×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-personal-2560x1440 (en) | 2560×1440 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-tasks-1280x720 (ja) | 1280×720 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-personal-360x780 (en) | 360×780 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-tasks-1366x768 (ja) | 1366×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-personal-390x844 (en) | 390×844 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-tasks-1440x900 (ja) | 1440×900 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-personal-430x932 (en) | 430×932 | 0,0／0,0 | 是 | aa-noise（2R4）、2R7 量法 |
| B-tasks-1536x864 (ja) | 1536×864 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-shared-768x1024 (en) | 768×1024 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-tasks-1920x1080 (ja) | 1920×1080 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-shared-1024x768 (en) | 1024×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-tasks-2560x1440 (ja) | 2560×1440 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-shared-1280x720 (en) | 1280×720 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-tasks-360x780 (ja) | 360×780 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-shared-1366x768 (en) | 1366×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-tasks-390x844 (ja) | 390×844 | 0,0／0,0 | 是 | aa-noise（2R4）、2R7 量法 |
| B-shared-1440x900 (en) | 1440×900 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-tasks-430x932 (ja) | 430×932 | 0,0／0,0 | 是 | aa-noise（2R4）、2R7 量法 |
| B-shared-1536x864 (en) | 1536×864 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-shared-1920x1080 (en) | 1920×1080 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-shared-2560x1440 (en) | 2560×1440 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-shared-360x780 (en) | 360×780 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-shared-390x844 (en) | 390×844 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-shared-430x932 (en) | 430×932 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-fund-768x1024 (en) | 768×1024 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-fund-1024x768 (en) | 1024×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-fund-1280x720 (en) | 1280×720 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-fund-1366x768 (en) | 1366×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-fund-1440x900 (en) | 1440×900 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-fund-1536x864 (en) | 1536×864 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-fund-1920x1080 (en) | 1920×1080 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-fund-2560x1440 (en) | 2560×1440 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-fund-360x780 (en) | 360×780 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-fund-390x844 (en) | 390×844 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-fund-430x932 (en) | 430×932 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-tasks-768x1024 (en) | 768×1024 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-tasks-1024x768 (en) | 1024×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-tasks-1280x720 (en) | 1280×720 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-tasks-1366x768 (en) | 1366×768 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-tasks-1440x900 (en) | 1440×900 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-tasks-1536x864 (en) | 1536×864 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-tasks-1920x1080 (en) | 1920×1080 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-tasks-2560x1440 (en) | 2560×1440 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-tasks-360x780 (en) | 360×780 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-tasks-390x844 (en) | 390×844 | 0,0／0,0 | 是 | 2R7 重拍相同 |
| B-tasks-430x932 (en) | 430×932 | 0,0／0,0 | 是 | 2R7 重拍相同 |

擷取每張全頁 PNG 後立刻以 querySelectorAll 量頁面，保留原 viewport、scroll 和 dialog 狀態。各候選整頁 rect 為 viewport rect 加當下 scroll。原始 JSON gzip 另存 .tmp/phase-2ib-2r7-captures/。PNG 檔名新增 2r7，原配對不覆寫。零差異配對按規則放入 .tmp/phase-2ib-pixel-archive/ 或保留 390 px 範例。

- A-home-ready-430x932 [87, 873, 88, 874]，最大通道差 12，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(3) > nav:nth-child(1) > ul:nth-child(1) > li:nth-child(1)` rect 12, 870, 90, 924，radius 0px/0px，c 4/4。[8 倍對照](aa-noise/A-home-ready-430x932-zh-2r7-group-1-8x.png)
- A-home-ready-430x932 [89, 873, 90, 874]，最大通道差 5，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(3) > nav:nth-child(1) > ul:nth-child(1) > li:nth-child(1)` rect 12, 870, 90, 924，radius 0px/0px，c 4/4。[8 倍對照](aa-noise/A-home-ready-430x932-zh-2r7-group-2-8x.png)
- A-personal-add-390x844 [44, 740, 45, 741]，最大通道差 1，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(2) > main:nth-child(2) > div:nth-child(1) > dialog:nth-child(7) > div:nth-child(1) > div:nth-child(2) > form:nth-child(1) > div:nth-child(3) > input:nth-child(2)` rect 44, 739, 346, 783，radius 4px/4px，c 4/4。[8 倍對照](aa-noise/A-personal-add-390x844-zh-2r7-group-1-8x.png)
- A-personal-add-390x844 [44, 742, 45, 743]，最大通道差 7，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(2) > main:nth-child(2) > div:nth-child(1) > dialog:nth-child(7) > div:nth-child(1) > div:nth-child(2) > form:nth-child(1) > div:nth-child(3) > input:nth-child(2)` rect 44, 739, 346, 783，radius 4px/4px，c 4/4。[8 倍對照](aa-noise/A-personal-add-390x844-zh-2r7-group-2-8x.png)
- A-personal-add-390x844 [46, 742, 47, 743]，最大通道差 1，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(2) > main:nth-child(2) > div:nth-child(1) > dialog:nth-child(7) > div:nth-child(1) > div:nth-child(2) > form:nth-child(1) > div:nth-child(3) > input:nth-child(2)` rect 44, 739, 346, 783，radius 4px/4px，c 4/4。[8 倍對照](aa-noise/A-personal-add-390x844-zh-2r7-group-3-8x.png)
- A-personal-add-390x844 [44, 856, 45, 857]，最大通道差 1，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(2) > main:nth-child(2) > div:nth-child(1) > dialog:nth-child(7) > div:nth-child(1) > div:nth-child(2) > form:nth-child(1) > fieldset:nth-child(4) > div:nth-child(2) > input:nth-child(2)` rect 44, 855, 346, 899，radius 4px/4px，c 4/4。[8 倍對照](aa-noise/A-personal-add-390x844-zh-2r7-group-4-8x.png)
- A-personal-add-390x844 [44, 858, 45, 859]，最大通道差 7，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(2) > main:nth-child(2) > div:nth-child(1) > dialog:nth-child(7) > div:nth-child(1) > div:nth-child(2) > form:nth-child(1) > fieldset:nth-child(4) > div:nth-child(2) > input:nth-child(2)` rect 44, 855, 346, 899，radius 4px/4px，c 4/4。[8 倍對照](aa-noise/A-personal-add-390x844-zh-2r7-group-5-8x.png)
- A-personal-add-390x844 [46, 858, 47, 859]，最大通道差 1，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(2) > main:nth-child(2) > div:nth-child(1) > dialog:nth-child(7) > div:nth-child(1) > div:nth-child(2) > form:nth-child(1) > fieldset:nth-child(4) > div:nth-child(2) > input:nth-child(2)` rect 44, 855, 346, 899，radius 4px/4px，c 4/4。[8 倍對照](aa-noise/A-personal-add-390x844-zh-2r7-group-6-8x.png)
- A-draft-recovery-390x844 [44, 147, 45, 148]，最大通道差 7，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(2) > main:nth-child(2) > div:nth-child(1) > dialog:nth-child(7) > div:nth-child(1) > div:nth-child(2) > form:nth-child(1) > div:nth-child(1) > button:nth-child(2)` rect 44, 144, 144, 188，radius 4px/4px，c 4/4。[8 倍對照](aa-noise/A-draft-recovery-390x844-zh-2r7-group-1-8x.png)
- A-draft-recovery-390x844 [46, 147, 47, 148]，最大通道差 1，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(2) > main:nth-child(2) > div:nth-child(1) > dialog:nth-child(7) > div:nth-child(1) > div:nth-child(2) > form:nth-child(1) > div:nth-child(1) > button:nth-child(2)` rect 44, 144, 144, 188，radius 4px/4px，c 4/4。[8 倍對照](aa-noise/A-draft-recovery-390x844-zh-2r7-group-2-8x.png)
- A-home-empty-390x844 [79, 785, 80, 786]，最大通道差 12，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(3) > nav:nth-child(1) > ul:nth-child(1) > li:nth-child(1)` rect 12, 782, 82, 836，radius 0px/0px，c 4/4。[8 倍對照](aa-noise/A-home-empty-390x844-en-2r7-group-1-8x.png)
- A-home-empty-390x844 [81, 785, 82, 786]，最大通道差 5，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(3) > nav:nth-child(1) > ul:nth-child(1) > li:nth-child(1)` rect 12, 782, 82, 836，radius 0px/0px，c 4/4。[8 倍對照](aa-noise/A-home-empty-390x844-en-2r7-group-2-8x.png)
- A-home-empty-430x932 [87, 873, 88, 874]，最大通道差 12，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(3) > nav:nth-child(1) > ul:nth-child(1) > li:nth-child(1)` rect 12, 870, 90, 924，radius 0px/0px，c 4/4。[8 倍對照](aa-noise/A-home-empty-430x932-en-2r7-group-1-8x.png)
- A-home-empty-430x932 [89, 873, 90, 874]，最大通道差 5，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(3) > nav:nth-child(1) > ul:nth-child(1) > li:nth-child(1)` rect 12, 870, 90, 924，radius 0px/0px，c 4/4。[8 倍對照](aa-noise/A-home-empty-430x932-en-2r7-group-2-8x.png)
- B-home-empty-360x780 [73, 721, 74, 722]，最大通道差 12，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(3) > nav:nth-child(1) > ul:nth-child(1) > li:nth-child(1)` rect 12, 718, 76, 772，radius 0px/0px，c 4/4。[8 倍對照](aa-noise/B-home-empty-360x780-ja-2r7-group-1-8x.png)
- B-home-empty-360x780 [75, 721, 76, 722]，最大通道差 5，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(3) > nav:nth-child(1) > ul:nth-child(1) > li:nth-child(1)` rect 12, 718, 76, 772，radius 0px/0px，c 4/4。[8 倍對照](aa-noise/B-home-empty-360x780-ja-2r7-group-2-8x.png)
- B-home-empty-390x844 [79, 785, 80, 786]，最大通道差 12，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(3) > nav:nth-child(1) > ul:nth-child(1) > li:nth-child(1)` rect 12, 782, 82, 836，radius 0px/0px，c 4/4。[8 倍對照](aa-noise/B-home-empty-390x844-ja-2r7-group-1-8x.png)
- B-home-empty-390x844 [81, 785, 82, 786]，最大通道差 5，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(3) > nav:nth-child(1) > ul:nth-child(1) > li:nth-child(1)` rect 12, 782, 82, 836，radius 0px/0px，c 4/4。[8 倍對照](aa-noise/B-home-empty-390x844-ja-2r7-group-2-8x.png)
- A-personal-430x932 [94, 873, 95, 874]，最大通道差 8，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(4) > nav:nth-child(1) > ul:nth-child(1) > li:nth-child(2)` rect 94, 870, 172, 924，radius 0px/0px，c 4/4。[8 倍對照](aa-noise/A-personal-430x932-en-2r7-group-1-8x.png)
- A-personal-430x932 [96, 873, 97, 874]，最大通道差 14，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(4) > nav:nth-child(1) > ul:nth-child(1) > li:nth-child(2)` rect 94, 870, 172, 924，radius 0px/0px，c 4/4。[8 倍對照](aa-noise/A-personal-430x932-en-2r7-group-2-8x.png)
- A-personal-430x932 [169, 873, 170, 874]，最大通道差 12，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(4) > nav:nth-child(1) > ul:nth-child(1) > li:nth-child(2)` rect 94, 870, 172, 924，radius 0px/0px，c 4/4。[8 倍對照](aa-noise/A-personal-430x932-en-2r7-group-3-8x.png)
- A-personal-430x932 [171, 873, 172, 874]，最大通道差 5，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(4) > nav:nth-child(1) > ul:nth-child(1) > li:nth-child(2)` rect 94, 870, 172, 924，radius 0px/0px，c 4/4。[8 倍對照](aa-noise/A-personal-430x932-en-2r7-group-4-8x.png)
- B-home-offline-360x780 [73, 721, 74, 722]，最大通道差 12，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(3) > nav:nth-child(1) > ul:nth-child(1) > li:nth-child(1)` rect 12, 718, 76, 772，radius 0px/0px，c 4/4。[8 倍對照](aa-noise/B-home-offline-360x780-ja-2r7-group-1-8x.png)
- B-home-offline-360x780 [75, 721, 76, 722]，最大通道差 5，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(3) > nav:nth-child(1) > ul:nth-child(1) > li:nth-child(1)` rect 12, 718, 76, 772，radius 0px/0px，c 4/4。[8 倍對照](aa-noise/B-home-offline-360x780-ja-2r7-group-2-8x.png)
- B-personal-360x780 [80, 721, 81, 722]，最大通道差 8，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(4) > nav:nth-child(1) > ul:nth-child(1) > li:nth-child(2)` rect 80, 718, 144, 772，radius 0px/0px，c 4/4。[8 倍對照](aa-noise/B-personal-360x780-ja-2r7-group-1-8x.png)
- B-personal-360x780 [82, 721, 83, 722]，最大通道差 14，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(4) > nav:nth-child(1) > ul:nth-child(1) > li:nth-child(2)` rect 80, 718, 144, 772，radius 0px/0px，c 4/4。[8 倍對照](aa-noise/B-personal-360x780-ja-2r7-group-2-8x.png)
- B-personal-360x780 [141, 721, 142, 722]，最大通道差 12，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(4) > nav:nth-child(1) > ul:nth-child(1) > li:nth-child(2)` rect 80, 718, 144, 772，radius 0px/0px，c 4/4。[8 倍對照](aa-noise/B-personal-360x780-ja-2r7-group-3-8x.png)
- B-personal-360x780 [143, 721, 144, 722]，最大通道差 5，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(4) > nav:nth-child(1) > ul:nth-child(1) > li:nth-child(2)` rect 80, 718, 144, 772，radius 0px/0px，c 4/4。[8 倍對照](aa-noise/B-personal-360x780-ja-2r7-group-4-8x.png)
- B-home-ready-360x780 [73, 721, 74, 722]，最大通道差 12，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(3) > nav:nth-child(1) > ul:nth-child(1) > li:nth-child(1)` rect 12, 718, 76, 772，radius 0px/0px，c 4/4。[8 倍對照](aa-noise/B-home-ready-360x780-en-2r7-group-1-8x.png)
- B-home-ready-360x780 [75, 721, 76, 722]，最大通道差 5，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(3) > nav:nth-child(1) > ul:nth-child(1) > li:nth-child(1)` rect 12, 718, 76, 772，radius 0px/0px，c 4/4。[8 倍對照](aa-noise/B-home-ready-360x780-en-2r7-group-2-8x.png)
- A-tasks-430x932 [258, 873, 259, 874]，最大通道差 8，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(4) > nav:nth-child(1) > ul:nth-child(1) > li:nth-child(4)` rect 258, 870, 336, 924，radius 0px/0px，c 4/4。[8 倍對照](aa-noise/A-tasks-430x932-en-2r7-group-1-8x.png)
- A-tasks-430x932 [260, 873, 261, 874]，最大通道差 14，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(4) > nav:nth-child(1) > ul:nth-child(1) > li:nth-child(4)` rect 258, 870, 336, 924，radius 0px/0px，c 4/4。[8 倍對照](aa-noise/A-tasks-430x932-en-2r7-group-2-8x.png)
- A-tasks-430x932 [333, 873, 334, 874]，最大通道差 12，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(4) > nav:nth-child(1) > ul:nth-child(1) > li:nth-child(4)` rect 258, 870, 336, 924，radius 0px/0px，c 4/4。[8 倍對照](aa-noise/A-tasks-430x932-en-2r7-group-3-8x.png)
- A-tasks-430x932 [335, 873, 336, 874]，最大通道差 5，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(4) > nav:nth-child(1) > ul:nth-child(1) > li:nth-child(4)` rect 258, 870, 336, 924，radius 0px/0px，c 4/4。[8 倍對照](aa-noise/A-tasks-430x932-en-2r7-group-4-8x.png)
- B-personal-430x932 [94, 873, 95, 874]，最大通道差 8，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(4) > nav:nth-child(1) > ul:nth-child(1) > li:nth-child(2)` rect 94, 870, 172, 924，radius 0px/0px，c 4/4。[8 倍對照](aa-noise/B-personal-430x932-en-2r7-group-1-8x.png)
- B-personal-430x932 [96, 873, 97, 874]，最大通道差 14，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(4) > nav:nth-child(1) > ul:nth-child(1) > li:nth-child(2)` rect 94, 870, 172, 924，radius 0px/0px，c 4/4。[8 倍對照](aa-noise/B-personal-430x932-en-2r7-group-2-8x.png)
- B-personal-430x932 [169, 873, 170, 874]，最大通道差 12，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(4) > nav:nth-child(1) > ul:nth-child(1) > li:nth-child(2)` rect 94, 870, 172, 924，radius 0px/0px，c 4/4。[8 倍對照](aa-noise/B-personal-430x932-en-2r7-group-3-8x.png)
- B-personal-430x932 [171, 873, 172, 874]，最大通道差 5，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(4) > nav:nth-child(1) > ul:nth-child(1) > li:nth-child(2)` rect 94, 870, 172, 924，radius 0px/0px，c 4/4。[8 倍對照](aa-noise/B-personal-430x932-en-2r7-group-4-8x.png)
- B-tasks-390x844 [234, 785, 235, 786]，最大通道差 8，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(4) > nav:nth-child(1) > ul:nth-child(1) > li:nth-child(4)` rect 234, 782, 304, 836，radius 0px/0px，c 4/4。[8 倍對照](aa-noise/B-tasks-390x844-ja-2r7-group-1-8x.png)
- B-tasks-390x844 [236, 785, 237, 786]，最大通道差 14，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(4) > nav:nth-child(1) > ul:nth-child(1) > li:nth-child(4)` rect 234, 782, 304, 836，radius 0px/0px，c 4/4。[8 倍對照](aa-noise/B-tasks-390x844-ja-2r7-group-2-8x.png)
- B-tasks-390x844 [301, 785, 302, 786]，最大通道差 12，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(4) > nav:nth-child(1) > ul:nth-child(1) > li:nth-child(4)` rect 234, 782, 304, 836，radius 0px/0px，c 4/4。[8 倍對照](aa-noise/B-tasks-390x844-ja-2r7-group-3-8x.png)
- B-tasks-390x844 [303, 785, 304, 786]，最大通道差 5，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(4) > nav:nth-child(1) > ul:nth-child(1) > li:nth-child(4)` rect 234, 782, 304, 836，radius 0px/0px，c 4/4。[8 倍對照](aa-noise/B-tasks-390x844-ja-2r7-group-4-8x.png)
- B-tasks-430x932 [258, 873, 259, 874]，最大通道差 8，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(4) > nav:nth-child(1) > ul:nth-child(1) > li:nth-child(4)` rect 258, 870, 336, 924，radius 0px/0px，c 4/4。[8 倍對照](aa-noise/B-tasks-430x932-ja-2r7-group-1-8x.png)
- B-tasks-430x932 [260, 873, 261, 874]，最大通道差 14，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(4) > nav:nth-child(1) > ul:nth-child(1) > li:nth-child(4)` rect 258, 870, 336, 924，radius 0px/0px，c 4/4。[8 倍對照](aa-noise/B-tasks-430x932-ja-2r7-group-2-8x.png)
- B-tasks-430x932 [333, 873, 334, 874]，最大通道差 12，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(4) > nav:nth-child(1) > ul:nth-child(1) > li:nth-child(4)` rect 258, 870, 336, 924，radius 0px/0px，c 4/4。[8 倍對照](aa-noise/B-tasks-430x932-ja-2r7-group-3-8x.png)
- B-tasks-430x932 [335, 873, 336, 874]，最大通道差 5，`html > body:nth-child(2) > div:nth-child(2) > div:nth-child(4) > nav:nth-child(1) > ul:nth-child(1) > li:nth-child(4)` rect 258, 870, 336, 924，radius 0px/0px，c 4/4。[8 倍對照](aa-noise/B-tasks-430x932-ja-2r7-group-4-8x.png)

---

<!-- phase-2ib-2r7-end -->

## 2R6 驗證總表

| 項目 | 目前證據 |
|---|---|
| CI 五個 job | 沿用兩樹已完成的 Naming、Backend、Backend DB、Web 及 Containers 結果 |
| Containers health／cookie runtime | 沿用兩樹 API／Web health 通過及標準、Railway 映像 16 個 locale cookie 案例通過 |
| 全套 e2e | 2R6 未重啟。前次中止於 204／788，無完整通過／失敗／略過數，也無本輪可歸類為基線既有的失敗 |
| A／B DOM、RGBA 已記錄組數 | 沿用下方 2R5 統計。本輪只重驗 1 個既有配對，未增加新的 RGBA 回歸配對 |
| 2R6 例外 | 首組不符，0 組通過 2R6。原六組 2R5 判定保留為歷史紀錄，未加註 2R6 |

**停止點為 A-home-idle-360x780。** 原 PNG 尺寸為 360×1195。重新比對原始 RGBA 與 SHA-256，TreeWalker 文字前後一致，兩個差異像素分落於以下兩群。

| bounding box | 最大通道差 | 對照（左 before、右 after） |
|---|---:|---|
| [73, 721, 74, 722] | 12 | [8 倍圖](aa-noise/A-home-idle-360x780-2r6-stop-group-1-8x.png) |
| [75, 721, 76, 722] | 5 | [8 倍圖](aa-noise/A-home-idle-360x780-2r6-stop-group-2-8x.png) |

依 2R6 用 querySelectorAll 列舉元素。將前後 viewport 設為 360×1195 並等待兩個 rAF 後，均查到同一個 active selector `nav[data-variant="mobile"] [data-current="true"]`，rect [12,1133,76,1187]，computed 上方左右 radius 均為 4px，c=4。第一群差異中心在 (73.5,721.5)，導覽 rect 未涵蓋，列舉結果也沒有任何其他前後同 selector、同 rect 的合格角落，故不符合第 5 條。

同一 replay 在原 360×780 viewport 下，前後 active rect 都是 [12,718,76,772]，computed radius 同為 4px。兩種 rect 的 y 位移為 415 px，等於 viewport 高度差。這組既有全頁 PNG 的導覽留在原 viewport 的位置。以全 PNG 高度重建 viewport 會移動 fixed 導覽，無法重現這組 PNG 的座標。保留 [2R6 原始量測](aa-noise/2r6-stop.json)，原圖和 SHA-256 未改。

依 2R6 第一個不符即停止。剩餘六組重判、三語回歸、全套 e2e 和最終歸檔未執行。若要恢復，需先決定原截圖使用不同 fixed 定位座標時，如何取得與 PNG 一致的量測 viewport。

---

## 2R5 驗證總表

| 項目 | 只有後端／A 組 | 全部／B 組 |
|---|---|---|
| CI 5 job | Naming、Backend、Backend DB、Web、Containers 通過 | Naming、Backend、Backend DB、Web、Containers 通過 |
| Containers health／locale cookie runtime | API／Web health 通過。標準、Railway 各四案通過，ja 回退 zh-Hant | API／Web health 通過。標準、Railway 各四案通過，ja 顯示 ja |
| 全套 e2e | 7bca944 未重跑 | 專用 127.0.0.1:25434／3905／3904 環境就緒。全套因停止點中止，最後進度 204/788，沒有最終通過／失敗／略過數。未將任何失敗列為既有問題。 |
| 中文 DOM／RGBA 已記錄組數 | 112／111（含下方失敗） | 88／58 |
| 英文 DOM／RGBA 已記錄組數 | 99／0 | 45／0 |
| 日文 DOM／RGBA 已記錄組數 | 0／0 | 33／0 |
| 重驗的 aa-noise（2R4）2R5 角落 | 5 組 | 1 組 |

| 配對 | 像素總數／群 | 全頁 bounding box | 最大通道差 | computed radius 前／後 | c 前／後 | 左 before／右 after |
|---|---:|---|---:|---|---|---|
| A-home-idle-360x780 | 2／1 | 73, 721, 74, 722 | 12 | 4px／4px | 4／4 | [8 倍圖](aa-noise/A-home-idle-360x780-group-1-2r5-8x.png) |
| A-home-idle-360x780 | 2／2 | 75, 721, 76, 722 | 5 | 4px／4px | 4／4 | [8 倍圖](aa-noise/A-home-idle-360x780-group-2-2r5-8x.png) |
| A-home-idle-430x932 | 2／1 | 87, 873, 88, 874 | 12 | 4px／4px | 4／4 | [8 倍圖](aa-noise/A-home-idle-430x932-group-1-2r5-8x.png) |
| A-home-idle-430x932 | 2／2 | 89, 873, 90, 874 | 5 | 4px／4px | 4／4 | [8 倍圖](aa-noise/A-home-idle-430x932-group-2-2r5-8x.png) |
| A-home-empty-360x780 | 2／1 | 73, 721, 74, 722 | 12 | 4px／4px | 4／4 | [8 倍圖](aa-noise/A-home-empty-360x780-group-1-2r5-8x.png) |
| A-home-empty-360x780 | 2／2 | 75, 721, 76, 722 | 5 | 4px／4px | 4／4 | [8 倍圖](aa-noise/A-home-empty-360x780-group-2-2r5-8x.png) |
| A-home-ready-430x932 | 2／1 | 87, 873, 88, 874 | 12 | 4px／4px | 4／4 | [8 倍圖](aa-noise/A-home-ready-430x932-group-1-2r5-8x.png) |
| A-home-ready-430x932 | 2／2 | 89, 873, 90, 874 | 5 | 4px／4px | 4／4 | [8 倍圖](aa-noise/A-home-ready-430x932-group-2-2r5-8x.png) |
| A-personal-add-390x844 | 5／1 | 373, 444, 374, 446 | 17 | 0px／0px | 4／4 | [8 倍圖](aa-noise/A-personal-add-390x844-group-1-2r5-8x.png) |
| A-personal-add-390x844 | 5／2 | 44, 944, 45, 945 | 1 | 4px／4px | 4／4 | [8 倍圖](aa-noise/A-personal-add-390x844-group-2-2r5-8x.png) |
| A-personal-add-390x844 | 5／3 | 44, 946, 45, 947 | 7 | 4px／4px | 4／4 | [8 倍圖](aa-noise/A-personal-add-390x844-group-3-2r5-8x.png) |
| A-personal-add-390x844 | 5／4 | 46, 946, 47, 947 | 1 | 4px／4px | 4／4 | [8 倍圖](aa-noise/A-personal-add-390x844-group-4-2r5-8x.png) |
| B-home-empty-2560x1440 | 1／1 | 850, 852, 851, 853 | 2 | 8px／8px | 8／8 | [8 倍圖](aa-noise/B-home-empty-2560x1440-group-1-2r5-8x.png) |

依 elementsFromPoint 指定的像素中心座標，判定角落歸屬。表中仍列全像素格的半開 bounding box。B-home-empty-2560x1440 使用前後完全相同的 selector，rect [850,844.75,1950,970.75]，像素中心 (850.5,852.5) 距頂 7.75 px，在實測 8 px 圓角內。格子下緣 853 超出角落底界 0.25 px。完整 selector、rect、radius、c 也寫入清單與 aa-noise/measurements-2r5.json。保留零容差及原始配對。

**2R5 新停止點。** `A-fund-returns-390x844` 有 4 個差異像素，分成四群。TreeWalker 文字完全相同，最大通道差為 4。第一群 bounding box [160,1997,161,1998] 的像素中心 (160.5,1997.5)，前後命中同一彈窗節點，但其整頁 rect 為 [8,1400.796875,382,1867.1875]，像素中心在彈窗 rect 外。命中的其他元素也無共同合格角落。第 5 條失敗，其餘三群只記原始 RGBA 和放大圖，不列為例外。

| 群 | bounding box | 最大通道差 | 對照 |
|---:|---|---:|---|
| 1 | 160, 1997, 161, 1998 | 2 | [8 倍圖](aa-noise/A-fund-returns-390x844-stop-group-1-8x.png) |
| 2 | 162, 1997, 163, 1998 | 4 | [8 倍圖](aa-noise/A-fund-returns-390x844-stop-group-2-8x.png) |
| 3 | 227, 1997, 228, 1998 | 3 | [8 倍圖](aa-noise/A-fund-returns-390x844-stop-group-3-8x.png) |
| 4 | 229, 1997, 230, 1998 | 2 | [8 倍圖](aa-noise/A-fund-returns-390x844-stop-group-4-8x.png) |

已中止後續 RGBA、日文 DOM 與全套 e2e。未新增遮罩、未放寬門檻。原配對、SHA-256 與 elementsFromPoint 證據留存，最終歸檔尚未完成。見 aa-noise/2r5-stop.json。

以下保留前次停止紀錄。

<!-- phase-2ib-2r5-end -->

## 2R4 驗證總表

| 項目 | 只有後端樹 | 全部樹 |
|---|---|---|
| CI Active Mimic naming | 通過 | 通過 |
| CI Backend | 通過 | 通過 |
| CI Backend database | 通過 | 通過 |
| CI Web PWA | 通過，Vitest 702 項 | 通過，Vitest 724 項 |
| CI Production containers | API／Web health 與 runtime smoke 通過。標準及 Railway 映像各 4 個 cookie 案例通過，ja 回退 zh-Hant | API／Web health 與 runtime smoke 通過。標準及 Railway 映像各 4 個 cookie 案例通過，ja 顯示 ja |
| 全套 e2e 最新有效通過／失敗／略過 | 7bca944 未重跑 | 專用環境健康檢查通過，因 2R4 停止未啟動測試。通過／失敗／略過無有效總數 |

| 語言 | A 組 DOM／RGBA 已記錄 | B 組 DOM／RGBA 已記錄 |
|---|---:|---:|
| 中文 | 112／106 | 88／19（18 組 RGBA 相同，1 組觸發停止） |
| 英文 | 99／0 | 45／0 |
| 日文 | 0／0 | 0／0 |

既有全套 e2e 紀錄為 492 通過、59 失敗、236 略過、1 未執行。當時依賴環境未就緒，未將任何失敗列為 7bca944 既有問題。2R4 建立的 PostgreSQL 18、API、production Web 對 Windows 只發佈到 127.0.0.1，埠分別是 25434、3905、3904。候選資料庫已執行 migrate deploy，兩個健康端點成功。

| 2R4 例外 | 總像素 | 群 | bounding box | 最大通道差 | 元素 selector | 前／後 rect | 8 倍對照 |
|---|---:|---:|---|---:|---|---|---|
| A-home-idle-360x780 | 2 | 1 | 73, 721, 74, 722 | 12 | `nav[data-variant="mobile"] [data-current="true"]` | 12, 718, 76, 772／12, 718, 76, 772 | [PNG](aa-noise/A-home-idle-360x780-group-1-8x.png) |
| A-home-idle-360x780 | 2 | 2 | 75, 721, 76, 722 | 5 | `nav[data-variant="mobile"] [data-current="true"]` | 12, 718, 76, 772／12, 718, 76, 772 | [PNG](aa-noise/A-home-idle-360x780-group-2-8x.png) |
| A-home-idle-430x932 | 2 | 1 | 87, 873, 88, 874 | 12 | `nav[data-variant="mobile"] [data-current="true"]` | 12, 870, 90, 924／12, 870, 90, 924 | [PNG](aa-noise/A-home-idle-430x932-group-1-8x.png) |
| A-home-idle-430x932 | 2 | 2 | 89, 873, 90, 874 | 5 | `nav[data-variant="mobile"] [data-current="true"]` | 12, 870, 90, 924／12, 870, 90, 924 | [PNG](aa-noise/A-home-idle-430x932-group-2-8x.png) |
| A-home-empty-360x780 | 2 | 1 | 73, 721, 74, 722 | 12 | `nav[data-variant="mobile"] [data-current="true"]` | 12, 718, 76, 772／12, 718, 76, 772 | [PNG](aa-noise/A-home-empty-360x780-group-1-8x.png) |
| A-home-empty-360x780 | 2 | 2 | 75, 721, 76, 722 | 5 | `nav[data-variant="mobile"] [data-current="true"]` | 12, 718, 76, 772／12, 718, 76, 772 | [PNG](aa-noise/A-home-empty-360x780-group-2-8x.png) |
| A-home-ready-430x932 | 2 | 1 | 87, 873, 88, 874 | 12 | `nav[data-variant="mobile"] [data-current="true"]` | 12, 870, 90, 924／12, 870, 90, 924 | [PNG](aa-noise/A-home-ready-430x932-group-1-8x.png) |
| A-home-ready-430x932 | 2 | 2 | 89, 873, 90, 874 | 5 | `nav[data-variant="mobile"] [data-current="true"]` | 12, 870, 90, 924／12, 870, 90, 924 | [PNG](aa-noise/A-home-ready-430x932-group-2-8x.png) |
| A-personal-add-390x844 | 5 | 1 | 373, 444, 374, 446 | 17 | `dialog[open]` | 16, 443, 374, 1255／16, 443, 374, 1255 | [PNG](aa-noise/A-personal-add-390x844-group-1-8x.png) |
| A-personal-add-390x844 | 5 | 2 | 44, 944, 45, 945 | 1 | `dialog[open] > div:nth-child(1) > div:nth-child(2) > form:nth-child(1) > fieldset:nth-child(4) > label:nth-child(3) > select:nth-child(1)` | 44, 943, 346, 987／44, 943, 346, 987 | [PNG](aa-noise/A-personal-add-390x844-group-2-8x.png) |
| A-personal-add-390x844 | 5 | 3 | 44, 946, 45, 947 | 7 | `dialog[open] > div:nth-child(1) > div:nth-child(2) > form:nth-child(1) > fieldset:nth-child(4) > label:nth-child(3) > select:nth-child(1)` | 44, 943, 346, 987／44, 943, 346, 987 | [PNG](aa-noise/A-personal-add-390x844-group-3-8x.png) |
| A-personal-add-390x844 | 5 | 4 | 46, 946, 47, 947 | 1 | `dialog[open] > div:nth-child(1) > div:nth-child(2) > form:nth-child(1) > fieldset:nth-child(4) > label:nth-child(3) > select:nth-child(1)` | 44, 943, 346, 987／44, 943, 346, 987 | [PNG](aa-noise/A-personal-add-390x844-group-4-8x.png) |

對照圖左為 before、右為 after，使用最近鄰 8 倍放大。座標為整頁 CSS px，依 left、top、right、bottom 排列，right 與 bottom 為半開區間。五組原圖均重新核對 SHA-256，TreeWalker 文字相同。分群按實際解碼像素的 8 連通結果，不把相距兩像素的點合併。

**2R4 停止。** `B-home-empty-2560x1440` 的 1 個差異像素，bounding box [850, 852, 851, 853]。before RGBA 為 [218,201,172,255]，after 為 [219,203,173,255]，最大通道差 2。在比對當下擷取的前後 DOM border-box 未找到同一元素的 4×4 角落完整涵蓋該群，因此未通過第 5 條。原配對及清單已留存，未加遮罩或放寬門檻。見 [停止點 8 倍對照](B-home-empty-2560x1440-2r4-stop-8x.png)。本輪三語回歸及最終歸檔在此中止。

容器 cookie runtime 的完整 16 筆結果保存在 .tmp/phase-2ib-2r4-cookies.log。兩樹的 no cookie、zh-TW、en 均為 zh-Hant、zh-Hant、en。既有 SHA-256 清單已寫入五筆 aa-noise（2R4）與新完成配對，尚非完整交付。

---

## 2R3 驗證總表

| 項目 | 只有後端樹／A 組 | 全部樹／B 組 |
|---|---|---|
| CI Active Mimic naming | 通過 | 通過 |
| CI Backend | 通過 | 通過 |
| CI Backend database | 通過 | 通過 |
| CI Web PWA | 通過 | 通過，Vitest 724 項 |
| CI Production containers | 建置、runtime smoke、API／Web health 通過。獨立 cookie runtime 步驟未確認 | 建置、runtime smoke、API／Web health 通過。獨立 cookie runtime 步驟未確認 |
| 全套 e2e | 7bca944 未重跑 | 2R3 未重跑。舊紀錄 492 通過、59 失敗、236 略過、1 未執行，環境未就緒，不作產品判定 |
| 中文 DOM／RGBA 已記錄組數 | 112／106 | 88／0 |
| 英文 DOM／RGBA 已記錄組數 | 99／0 | 45／0 |
| 日文 DOM／RGBA 已記錄組數 | 0／0 | 0／0 |
| 2R3 例外 | 下表四組，已附 SHA-256 與 rect | 無已確認例外 |

| 配對 | 差異像素 | bounding box | active 導覽 rect |
|---|---:|---|---|
| A-home-idle-360x780 | 2 | 73, 721, 76, 722 | 12, 718, 76, 772（前後相同） |
| A-home-idle-430x932 | 2 | 87, 873, 90, 874 | 12, 870, 90, 924（前後相同） |
| A-home-empty-360x780 | 2 | 73, 721, 76, 722 | 12, 718, 76, 772（前後相同） |
| A-home-ready-430x932 | 2 | 87, 873, 90, 874 | 12, 870, 90, 924（前後相同） |

座標為全頁 CSS px，順序為 left、top、right、bottom，right 與 bottom 為半開區間。四組均重新解碼原 PNG 並核對檔案 SHA-256、TreeWalker 全文，以及兩邊 active 導覽 rect。

**2R3 停止。** 原 RGBA 配對 A-personal-add-390x844 有 5 個差異像素，bounding box 為 [44, 444, 374, 947]，超過 2R3 的 4 像素上限。原 PNG、差異圖和清單均保留。未加遮罩或放寬門檻。依要求停止剩餘回歸及 e2e 重跑，當前清單與歸檔仍為部分結果。

---

## 2026-11-23 — RGBA 回歸診斷

中文 A／B TreeWalker 矩陣的尾段已補跑。整頁 RGBA 比對保留零容差。執行中已發現以下未核准差異：

- OUTSIDE MASK A-home-idle-360x780
- OUTSIDE MASK A-home-idle-430x932
- OUTSIDE MASK A-home-empty-360x780
- OUTSIDE MASK A-home-ready-430x932

用同一 7bca944 基線做 A/A 對照也重現相同座標的 2 像素差異。循序擷取在 360 px 對照為 0，430 px 仍重現：viewport 430×932，位置 (87,873) 為 423327ff／4e3d2cff，(89,873) 為 b19052ff／ac8b50ff。證據保留在 .tmp/phase-2ib-raster-control/ 與 .tmp/phase-2ib-raster-control-sequential/。判定目前擷取環境不穩定。原失敗仍保留，未加遮罩、未放寬門檻。

生產環境重拍與 2R2 驗證完成。兩樹最終 CI、完整三語 RGBA 回歸、各輪 e2e 及最終 SHA-256 清單尚未證實通過。現有清單包含本次已完成配對，仍屬部分結果。

---

## Next.js 開發環境 2 Issues

360 px 日文登入頁展開選單時，React 回報下列兩則 console error。兩則來自同一個無效巢狀結構，並非兩項獨立缺陷。選單是使用者展開後才掛載，因此此紀錄顯示 DOM nesting 警告，未觀察到 SSR hydration 失敗。

Issue 1

~~~text
In HTML, %s cannot be a descendant of <%s>.
This will cause a hydration error.%s <div> p 

  ...
    <InnerScrollAndFocusHandlerOld focusAndScrollRef={{scrollRef:null, ...}} cacheNode={{rsc:{...}, ...}}>
      <ErrorBoundary errorComponent={undefined} errorStyles={undefined} errorScripts={undefined}>
        <LoadingBoundary name="login/" loading={null}>
          <HTTPAccessFallbackBoundary notFound={undefined} forbidden={undefined} unauthorized={undefined}>
            <RedirectBoundary>
              <RedirectErrorBoundary router={{...}}>
                <InnerLayoutRouter url="/login" tree={[...]} params={{}} cacheNode={{rsc:{...}, ...}} segmentPath={[...]} ...>
                  <SegmentViewNode type="page" pagePath="(auth)/log...">
                    <SegmentTrieNode>
                    <LoginPage>
                      <AuthForm mode="login">
                        <section className="auth-form_..." aria-labelledby="_R_2atpesn...">
                          <PixelPanel className="auth-form_...">
                            <div className="pixel-pane...">
                              <div>
                              <div className="auth-form_...">
                                <p>
                                <h1>
                                <p>
                                <form>
>                               <p className="auth-form_switchPrompt__Y3kR8">
                                  <LinkComponent>
                                  <LanguageSwitch className="auth-form_...">
                                    <span className="language-s..." ref={{...}} onBlur={function onBlur}>
                                      <button>
>                                     <div
>                                       className="language-switch_menu__KZxXw"
>                                       data-align="end"
>                                       id="_R_1ematpesndlb_"
>                                       ref={{current:null}}
>                                       role="menu"
>                                       onKeyDown={function onKeyDown}
>                                     >
                  ...
                ...
      ...

~~~

Issue 2

~~~text
<%s> cannot contain a nested %s.
See this log for the ancestor stack trace. p <div>
~~~

相同瀏覽器與 viewport 的 7bca944 dev 登入基線記錄 0 則 console 警告或錯誤。基線未提供日文或展開式選單，使用英文登入頁對照。缺陷由本輪 Phase 2I-b 選單結構引入。

修正把選單 div 改為 span，保留 role、絕對定位及樣式。目前候選 dev 擷取的 console 診斷數為 0。

---

## 2026-11-23 — 2R2 選單定位複驗

以 next build --webpack 與 next start 啟動 production，再用 Chrome 重量並覆蓋全部 54 張 2R2 展開截圖及 menu-measurements.json。所有頁面皆檢查沒有 nextjs-portal，54/54 格通過，最小留白 10.11 px。原日文登入 360 px 的 left／right 為 42.00／182.00 px，data-align=start。開啟時於 useLayoutEffect 量測，resize 重新對齊。Next start 對 output: standalone 顯示部署入口提示，但本機 production 服務啟動、健康檢查及測試均成功。修正後 Vitest 7/7，production 定位 e2e 2/2。

Vitest 7/7 與 2R2 e2e 2/2 通過。以下是展開量測，閉合狀態的 A／B 三語 DOM 與 RGBA 驗證另計。

| 路徑 | 語言 | viewport | left | right | width | data-align |
|---|---|---:|---:|---:|---:|---|
| / | zh-TW | 320 | 69.63 | 209.63 | 140.00 | end |
| /login | zh-TW | 320 | 42.00 | 182.00 | 140.00 | start |
| /register | zh-TW | 320 | 42.00 | 182.00 | 140.00 | start |
| / | en | 320 | 10.11 | 150.11 | 140.00 | end |
| /login | en | 320 | 136.41 | 276.41 | 140.00 | end |
| /register | en | 320 | 62.45 | 202.45 | 140.00 | start |
| / | ja | 320 | 55.75 | 195.75 | 140.00 | end |
| /login | ja | 320 | 42.00 | 182.00 | 140.00 | start |
| /register | ja | 320 | 25.17 | 165.17 | 140.00 | end |
| / | zh-TW | 359 | 108.63 | 248.63 | 140.00 | end |
| /login | zh-TW | 359 | 152.36 | 292.36 | 140.00 | end |
| /register | zh-TW | 359 | 152.36 | 292.36 | 140.00 | end |
| / | en | 359 | 49.11 | 189.11 | 140.00 | end |
| /login | en | 359 | 136.41 | 276.41 | 140.00 | end |
| /register | en | 359 | 42.00 | 182.00 | 140.00 | start |
| / | ja | 359 | 94.75 | 234.75 | 140.00 | end |
| /login | ja | 359 | 42.00 | 182.00 | 140.00 | start |
| /register | ja | 359 | 42.00 | 182.00 | 140.00 | start |
| / | zh-TW | 360 | 109.63 | 249.63 | 140.00 | end |
| /login | zh-TW | 360 | 152.36 | 292.36 | 140.00 | end |
| /register | zh-TW | 360 | 152.36 | 292.36 | 140.00 | end |
| / | en | 360 | 50.11 | 190.11 | 140.00 | end |
| /login | en | 360 | 166.66 | 306.66 | 140.00 | end |
| /register | en | 360 | 42.00 | 182.00 | 140.00 | start |
| / | ja | 360 | 95.75 | 235.75 | 140.00 | end |
| /login | ja | 360 | 42.00 | 182.00 | 140.00 | start |
| /register | ja | 360 | 42.00 | 182.00 | 140.00 | start |
| / | zh-TW | 390 | 139.63 | 279.63 | 140.00 | end |
| /login | zh-TW | 390 | 152.36 | 292.36 | 140.00 | end |
| /register | zh-TW | 390 | 152.36 | 292.36 | 140.00 | end |
| / | en | 390 | 80.11 | 220.11 | 140.00 | end |
| /login | en | 390 | 166.66 | 306.66 | 140.00 | end |
| /register | en | 390 | 42.00 | 182.00 | 140.00 | start |
| / | ja | 390 | 125.75 | 265.75 | 140.00 | end |
| /login | ja | 390 | 42.00 | 182.00 | 140.00 | start |
| /register | ja | 390 | 42.00 | 182.00 | 140.00 | start |
| / | zh-TW | 544 | 293.63 | 433.63 | 140.00 | end |
| /login | zh-TW | 544 | 152.36 | 292.36 | 140.00 | end |
| /register | zh-TW | 544 | 152.36 | 292.36 | 140.00 | end |
| / | en | 544 | 234.11 | 374.11 | 140.00 | end |
| /login | en | 544 | 166.66 | 306.66 | 140.00 | end |
| /register | en | 544 | 235.22 | 375.22 | 140.00 | end |
| / | ja | 544 | 279.75 | 419.75 | 140.00 | end |
| /login | ja | 544 | 212.19 | 352.19 | 140.00 | end |
| /register | ja | 544 | 257.39 | 397.39 | 140.00 | end |
| / | zh-TW | 1440 | 1020.00 | 1160.00 | 140.00 | end |
| /login | zh-TW | 1440 | 728.36 | 868.36 | 140.00 | end |
| /register | zh-TW | 1440 | 728.36 | 868.36 | 140.00 | end |
| / | en | 1440 | 953.86 | 1093.86 | 140.00 | end |
| /login | en | 1440 | 742.66 | 882.66 | 140.00 | end |
| /register | en | 1440 | 811.22 | 951.22 | 140.00 | end |
| / | ja | 1440 | 1004.56 | 1144.56 | 140.00 | end |
| /login | ja | 1440 | 788.19 | 928.19 | 140.00 | end |
| /register | ja | 1440 | 833.39 | 973.39 | 140.00 | end |

下方保留先前停止紀錄。專用 127.0.0.1 舊 API 驗證通過。7bca944 API 下 Home 保持日文，分類名稱回退為 Food。已同步兩樹並重新啟動 WSL CI。DOM 首次因舊測試憑證過期未進入 Home，更新專用帳號登入後重新啟動比對。最終 CI、各輪 e2e、完整 A／B 回歸與 SHA-256 歸檔仍待確認。

---

# Phase 2I-b 日文實作／驗證：選單溢出停止

日期：2026-11-19（Asia/Taipei）。**狀態：依 spec §4／§8.6 停止，尚未完成 Phase 2I-b，也尚未完成全套視覺驗收；不可部署。**

## 本次停止證據

在 production Web、360×800、日文登入頁，以實際 LanguageSwitch 展開選單：

| 項目 | 實測 px |
|---|---:|
| viewport | 360 |
| menu left | -16.546875 |
| menu right | 123.453125 |
| menu width | 140 |
| 超出左邊界 | 16.546875 |

截圖：[login-language-menu-ja-360x800.png](screenshots/login-language-menu-ja-360x800.png)。JSON：[menu-measurements.json](menu-measurements.json)。登入卡片內的語言按鈕靠左，選單一律 right:0 相對按鈕定位，日文按鈕右緣不足以容納 140 px 選單，左緣超出 viewport **16.55 px**。這是本輪實作的定位問題，不能宣稱選單已完成驗收。

依使用者指示停止，不改定位、不縮短文案、不縮字級／間距。已停止正在執行的公開頁補拍、DOM 比對與 CI 程序，僅整理既有證據和追加紀錄。下一輪需由 Ed 決定選單定位方式，再繼續驗證。建議評估登入／註冊選單向右展開、header 選單維持靠右；這只是建議，尚未實作或量測。

## 已實作範圍

- backend：31 筆日文 catalog 取自 review-result.taxonomy；新增 20261119000200_system_taxonomy_ja migration，以 system_key 定位、IS DISTINCT FROM 有差異才 UPDATE translations 與 updated_at，不修改 name／status／version。已部署 migration 原檔未改。
- migration contract 依序摺疊舊 INSERT 與本輪 UPDATE 的結果，比對 catalog；migration-only suite 加入 ja 分類與 Home 食費；既有拒絕 ja 的 DB 測試改以 fr 作拒絕案例，另驗 ja 食費。
- Web：啟用 ja、request 載入 ja.json、加入 language.japanese／menuLabel／currentShort 並移除 target；共用三語選單、設定頁日本語；2R 的兩個 aria-hidden span 與 359.98 px media query、完整 accessible name。
- 字型：限定 :lang(ja) 的指定系統字型鏈與 line-break:strict，未下載產品 web font，未修改像素字型變數。既有 hyphens:auto 仍限英文。
- scheduleSummary：frequency select 月／週；中文使用所有分支為空的 select，保留原文字及 cadence／interval 標籤；英文 month(s)／week(s)、日文 か月ごと／週間ごと。
- sw offline fallback 與 global-error 加 ja 段落，html lang=zh-Hant 保留；manifest 原本已用 htmlLang 與翻譯 description，ja.json 的 manifestDescription 為授權的 speaker - tagline，無需改 manifest.ts。
- docs/i18n/glossary.md 合併兩份上層 spec §6 與審閱 glossary；未提供日文的舊術語留白，不自行翻譯。
- 產品新增 import 均在 web/ 內；.tmp/ 來源與工具僅用於產生／驗證，不被產品 import。

## 文案完整性

ja.json 除規格授權的 language keys 與 scheduleSummary 外，與 .tmp/2ib-ja-final.json 的內容逐值一致：**true**。

| 原檔 | SHA-256 |
|---|---|
| .tmp/2ib-ja-final.json | f7869b371563e8b6deb56ed9b91fa5e0332a0767fcea9ef21f3c1ef1a302af6f |
| .tmp/2ib-ja-review-result.json | 74157fb47a6c06f493267ddef7212e5dc138d6fd7c9960c972fc518804ef4da4 |

原檔均未刪除、搬移或改寫。沒有發現需自行改寫的審閱日文；本次停止由選單定位造成。

## 2R 與日文字形

- 既有 header-2r.json 的實際元件 **126／126 格**皆單行、餘裕 ≥8 px；320 最小 10.328125 px。359 為 EN、360 為 English，accessible name 都是 Language: English。詳見下方保留的前輪量測節。
- 新增的選單展開量測在第 6 格觸發停止，剩餘選單狀態未量測；header 關閉狀態通過，不代表選單展開通過。
- 漢字對照「直角骨」：ja 實際 Yu Gothic UI、zh-Hant 實際微軟正黑體，RGBA channel 差異 11229，該組未觸發中文字形停止點。見 kanji-font-probe.json 與 japanese-kanji-font-probe-390x844.png。未因此聲稱所有頁面、字重及 Linux 環境字形已驗證。

## 測試與 WSL CI

使用者已明確授權 WSL／Docker 提升權限。本輪提升後成功執行 Docker node:22（v22.23.4）；原 E_ACCESSDENIED 是沙箱限制，不是目前阻礙。

WSL 兩樹：/var/tmp/mimic-phase-2ib/backend-only 與 all；皆由 7bca944 checkout、core.autocrlf=false 開始，套入 backend-only 或 backend＋web 候選變更。另保留 Windows .tmp/phase-2ib-baseline 乾淨 worktree。沒有 commit 或 stage。

| CI job | 只有後端 | 全部 |
|---|---|---|
| Active Mimic naming | 通過 | 通過 |
| Backend | unit 38 suites／346 tests、HTTP 5 suites／37 tests 通過 | 同樣通過 |
| Backend database | migration-only 1 suite／8 tests、financial-spaces 20 suites／156 tests 通過 | 尚未執行完成 |
| Web PWA | 135 files／702 tests、lint、typecheck、build 通過 | lint／typecheck 通過；全套 Vitest 執行中因停止點中止，build 尚未完成該 job |
| Production containers | job 通過；另 Dockerfile.railway build 通過 | API／標準 Web image build 完成；完整 job 與 Railway build 尚未完成 |

詳細 log 在 .tmp/phase-2ib-logs/；只有後端 DB 初次 155／156 的失敗是舊測試預期 ja=400，修正後全套 156／156。API 基線 image 曾因 npm／Prisma 下載 ECONNRESET 失敗，後以同 WSL Docker host network build 成功；沒有改用其他驗證環境。執行連線中斷與本機 port 3873 衝突的失敗不列為通過，production 驗收改用 3883。

本機新增局部測試：scheduleSummary 12 案＋money 3 案通過；三語訊息一致性通過；LanguageSwitch 3 案通過（選單／鍵盤／pending），typecheck 曾通過。完整最終版本仍需重跑規格要求的兩樹五 job 與所有必要檢查。

## 真實 API、DB 與日文頁面驗收

- 所有本輪 DB 只在 127.0.0.1，PostgreSQL 18；visual／legacy／pixel 使用本輪專用 DB。新 migration 在 fresh migrate-deploy-only DB 驗證，未 seed。
- 新 backend ja 使用者分類列表與 Home 食費的 migration-only 測試通過。
- 固定 3883 production Web 上，中英既有語言 e2e＋新增 ja e2e **10／10 通過**：切換／刷新保留、manifest ja、真實登入同步 users.locale=ja、新 context 登入設定 ja cookie、設定切回中文、EN accessible name，及既有 production 離線 fallback 中英驗證。
- 日文 App 完整頁面／彈窗矩陣 production 驗收：360×800、390×844、1440×900 **三項通過**，涵蓋 personal／shared／pooled／settlements／groups／invitations／tasks 及既有完整 capture spec 的面板與彈窗。當時導覽、按鈕、金額、ISO nowrap 的指定量測通過；不包含本次才展開驗出的 auth 語言選單。
- 另有分類切換 capture 案因 MIMIC_I18N_CANDIDATE_API 開關未開而跳過，尚待補跑，不列為通過。
- 日文首輪 8 routes ×3 widths 的 smoke 完成；public 2I-1 範圍正在補拍時因本次停止中止，尚未全部完成。截圖清單見 screenshot-inventory.txt，當下共 229 張 PNG，其中日文檔名 200 張。舊 header-preflight.* 與原 18 張圖未改。
- 已實際啟動新 Web 接 7bca944 API 的環境（3884→3870），但尚未完成 ja fallback-to-term.name 的功能斷言，不列為相容性通過。

## DOM 與像素回歸：尚未完成

- A：7bca944 Web＋舊 API（3882）對候選 Web＋舊 API（3884）。
- B：候選 Web＋舊 API（3884）對候選 Web＋新 API（3885）；在另一個本輪專用 DB 複製相同 fixtures 後只套新 migration，維持對照資料相同。
- 先 TreeWalker DOM，再拍像素：停止前 A **112** 組 DOM MATCH、B **13** 組 DOM MATCH，mismatch **0**。A 已涵蓋 88 個主要頁面矩陣、Landing 11 與額外 390 彈窗；Landing 僅排除授權變更的 header 節點。完整 .tmp/phase-2ib-dom.log 與 .tmp/phase-2ib-dom-text/ 可追查。
- B 尚未跑完，英文 DOM／像素回歸尚未跑；**尚未開始整頁 RGBA 像素比較**，不可稱為像素相同。
- 尚無本輪已驗證逐像素相同的回歸成對截圖，因此尚未產生 pixel-regression-sha256.txt、歸檔配對或每類 390×844 範例。不得用現有 smoke 截圖冒充回歸成果；恢復後仍需容差 0、完整 RGBA、SHA-256 與指定歸檔流程。

## 待完成／恢復順序

1. Ed 決定登入／註冊選單定位方式；實作後重測本次失敗及三語展開矩陣，必要時重測 header。
2. 兩樹最終 CI 五 job、兩個 web Dockerfile 的 node 使用者／health／cookie language runtime 驗證全部補齊；只有後端樹的 Web 尚未啟用 ja，需如實區分舊 Web 的 ja cookie fallback 與全部樹的 ja。
3. 7bca944 舊 API 日文 fallback 功能斷言、分類切換未跑案例、所有既有 2A–2I-2 e2e、public／狀態／離線／更新通知與三語選單截圖補齊。
4. 完成 A／B 三語 DOM 與整頁 RGBA 容差 0 回歸、英文頁面比對、所有必要 before／after、SHA-256 清單與 .tmp/phase-2ib-pixel-archive/ 歸檔；最後完整自審。

本次只交付停止點與現有進度供審閱，不宣稱整輪完成。沒有 stage、commit、push 或部署。舊截圖／錄影唯讀；本輪只在新審閱資料夾寫圖。

---

## 前置量測與前輪 2R 紀錄（保留原文；當時狀態已由上文更新）

# Phase 2I-b 日文驗證紀錄（2R）

日期：2026-11-19（Asia/Taipei）。**狀態：2R header 通過；WSL E_ACCESSDENIED 停止。Phase 2I-b 尚未完成，尚未到全產品視覺驗收，不可部署此部分實作。**

## 本輪停止原因

2R 實際元件量測 126／126 組通過（全部單行、餘裕 ≥8 px）。其後執行必要環境檢查：

~~~text
wsl --exec sh -lc 'docker version'
exit 1
存取被拒。 
錯誤碼: Wsl/E_ACCESSDENIED
~~~

原生 Windows 捕捉的 WSL exit code 為 4294967295（-1）；前述 shell 工具呈現為 exit 1。原始解碼結果見 [wsl-2r-error.txt](wsl-2r-error.txt)。WSL 未啟動 Docker 指令；依使用者本輪第 3 項要求停止，不提升 WSL 權限繞過、不改用原生 Windows 或其他環境替代 CI。僅讀取／整理停止證據與交付紀錄。

## 目前部分實作

- LanguageSwitch 改為目前語言＋選單；兩個 aria-hidden 自稱 span，359.98 px 以下顯示 currentShort；英文 320／359 為 EN、360 為 English；三者 accessible name 均為 Language: English。
- 三語選單完整自稱、目前語言 aria-checked 與可見底色；Escape 返回焦點、上下／Home／End 移動、Enter／Space 使用原生 button、點外關閉、處理中拒絕重複 change；設定頁加入日本語。上述全部互動仍須完整測試，不以已寫入程式表示已完成驗收。
- 為量測實際三語元件，已啟用 ja、request 載入 ja.json，加入 spec 字型鏈與 line-break:strict。ja.json 由原始定稿複製，只刪 language.target，加入授權的 japanese／menuLabel／currentShort；其餘審閱日文逐值比對一致（true）。排程摘要尚未修改。
- zh-TW／en 訊息只改本輪 language keys；沒有修改 header 字級、間距、Features 文字、字標或其他版面規則。
- 新增 2R e2e 斷言（EN／English 與 accessible name），因環境停止尚未執行。

## 2R 實際元件量測

使用 158.0.8127.37／Windows Chrome／DPR 1，候選 Web 在 127.0.0.1:3269，實際 server locale cookie 與 hydration。登入組只使用 JWT-shaped fixture cookie 觸發既有 hasSession 的 header 分支，**不是**真實登入驗收，沒有接觸 DB。

沿用前置量測的三字族資源，以 CSS 指定 Latin 字族，CDP CSS.getPlatformFontsForNode 記錄實際字型；Arial weight 800 實際仍為 Arial Black、Roboto 使用 Roboto Black、Liberation Sans 使用 Liberation Sans Bold。JSON 保留各格平台字型與 TreeWalker／Range 文字矩形。全頁 DOM before／after 與 RGBA 回歸尚未執行。

required = 品牌＋語言按鈕＋兩個連結的 max-content 自然寬度＋nav gap＋兩個 action gap；margin = nav 可用內寬 − required。每格確認個別項目無文字換行且自然寬度不超出實際框；320 的可用內寬均為 288 px。

| 語言 | 狀態 | 指定字族 | required px | margin px | 結果 |
|---|---|---|---:|---:|---|
| zh-TW | 未登入 | Arial | 224.56 | 63.44 | 通過 |
| zh-TW | 已登入 | Arial | 253.36 | 34.64 | 通過 |
| en | 未登入 | Arial | 277.67 | 10.33 | 通過 |
| en | 已登入 | Arial | 268.86 | 19.14 | 通過 |
| ja | 未登入 | Arial | 252.83 | 35.17 | 通過 |
| ja | 已登入 | Arial | 250.98 | 37.02 | 通過 |
| zh-TW | 未登入 | Roboto | 213.73 | 74.27 | 通過 |
| zh-TW | 已登入 | Roboto | 242.53 | 45.47 | 通過 |
| en | 未登入 | Roboto | 242.13 | 45.88 | 通過 |
| en | 已登入 | Roboto | 234.44 | 53.56 | 通過 |
| ja | 未登入 | Roboto | 242.00 | 46.00 | 通過 |
| ja | 已登入 | Roboto | 240.16 | 47.84 | 通過 |
| zh-TW | 未登入 | Liberation Sans | 215.70 | 72.30 | 通過 |
| zh-TW | 已登入 | Liberation Sans | 244.50 | 43.50 | 通過 |
| en | 未登入 | Liberation Sans | 252.50 | 35.50 | 通過 |
| en | 已登入 | Liberation Sans | 243.75 | 44.25 | 通過 |
| ja | 未登入 | Liberation Sans | 243.97 | 44.03 | 通過 |
| ja | 已登入 | Liberation Sans | 242.13 | 45.88 | 通過 |

為補足邊界證據，其他指定寬度也都量了三語 × 兩狀態 × 三字族，每個寬度 18 格（共 126 格）：

| viewport px | 格數 | 最小餘裕 px | 結果 |
|---:|---:|---:|---|
| 359 | 18 | 49.33 | 全部通過 |
| 360 | 18 | 14.98 | 全部通過 |
| 390 | 18 | 44.98 | 全部通過 |
| 543 | 18 | 197.98 | 全部通過 |
| 544 | 18 | 198.98 | 全部通過 |
| 545 | 18 | 72.39 | 全部通過 |

診斷截圖使用 dev server，部分圖有 Next.js 開發提示遮住 header；此非正式產品視覺驗收圖。測量時在瀏覽器注入壓力測試字型可能早於 hydration，dev console 因額外 inline style 報 hydration attribute mismatch；未將此視為產品通過或產品已壞的證據，恢復後正式驗證須等待 hydration 再套測試字型並隱藏開發提示。DOM 寬度與 CDP 實際字型以 JSON 為準。

證據：[header-2r.json](header-2r.json)、[重現腳本](header-2r.cjs)、screenshots/header-2r-* 共 18 張 320×720 圖。innerText 在 inline-flex span 間可能帶換行符，是否換行以 Range 實際矩形判斷；截圖中 EN 與箭頭維持同一行。

## 已執行的局部測試

- TDD：新增 language-switch.test.tsx 先失敗（舊按鈕沒有「語言：中文」），實作後通過。
- 本機 Vitest 使用預設設定選取六個檔：LanguageSwitch、messages、config、request、locale route、no-hardcoded-copy；**6 檔、23 項通過**。這不是全套 Vitest，也不是規格指定的 WSL Docker node:22 CI。
- 測試後僅修正 messages.test.ts 的命名／縮排並加入尚未執行的 e2e 檔；未聲稱全部測試或建置通過。
- 自審確認 reviewed ja 文字除授權 keys 外一致、字型規則只限 :lang(ja)、header 樣式沿用；完整自審、lint、typecheck、build、全套測試均待恢復。

## 尚未完成／未驗證清單

| 範圍 | 狀態 |
|---|---|
| 2R 響應式按鈕與 header 指定寬度矩陣 | 已實作，126 格量測通過 |
| 三語訊息載入、字型與語言選單 | 部分實作；僅上述局部測試，完整鍵盤／pending／切換流程待驗 |
| backend catalog、31 筆 migration、DTO、migration contract、migration-only DB 日文案例 | 未實作／未驗證 |
| scheduleSummary 三語頻率、fallback／manifest、glossary | 未實作／未驗證 |
| 只有後端與全部兩樹、WSL Docker node:22 五 job、兩個 web Dockerfile | 未執行；WSL E_ACCESSDENIED 阻擋 |
| 只 migrate deploy、不 seed 的 postgres:18 專用 DB | 未建立／未連線任何 DB |
| real-backend 日文登入、分類與 Home、新 web 接 7bca944 API | 未執行 |
| A／B 組、先 TreeWalker 全頁 DOM 比對、全頁 RGBA 容差 0 回歸 | 未執行 |
| 逐像素相同配對歸檔、像素 SHA-256 清單與每類 390×844 範例 | 尚無配對成果，未建立清單或宣稱通過 |
| 日文各頁／彈窗 360×800、390×844、1440×900 與 §8.6 | 未執行；現有圖只證明 header |
| 舊畫面／錄影、前置 header-preflight.* 與 18 張圖 | 原位保留，未覆寫／移動 |

產品程式新增 import 均位於 web/；本輪測量工具使用 .tmp/ 文案與字型僅供診斷，不被產品 import。ja 已在工作區啟用而後端尚未完成，這是停止狀態的部分實作，需整輪驗證完成後才能部署。未 stage、commit、push、部署。

## 來源完整性

| 原檔 | SHA-256 |
|---|---|
| .tmp/2ib-ja-final.json | f7869b371563e8b6deb56ed9b91fa5e0332a0767fcea9ef21f3c1ef1a302af6f |
| .tmp/2ib-ja-review-result.json | 74157fb47a6c06f493267ddef7212e5dc138d6fd7c9960c972fc518804ef4da4 |

兩份來源與上一輪紀錄 hash 一致，未刪除、搬移或改寫。7bca944 基線 worktree 保留於 .tmp/phase-2ib-baseline，未將候選變更覆蓋到基線。

## 恢復條件

需先解決 WSL 的 Wsl/E_ACCESSDENIED，並由使用者指示恢復；不以其他環境通過替代指定 CI。恢復後沿用目前 2R 與進度，依上表繼續，§8.6 停止點仍有效。

---

## 前置量測紀錄（保留原文；下文是 2R 之前狀態，已由上文更新）

# Phase 2I-b 驗證：§4 header 停止點

日期：2026-11-19（Asia/Taipei）。狀態：**前置量測觸發停止，未完成 Phase 2I-b 實作；等待 Ed 決定**。

## 結論

規格要求 320 px 公開 header 三語 × 兩種登入狀態均為單行，Arial／Roboto／Liberation Sans 的餘裕至少 8 px。基線 header 套入規格指定的「目前語言自稱＋文字箭頭」後，英文未登入在 Liberation Sans 的餘裕只有 **3.50 px**，未達門檻。Arial 指定字族在本機 weight 800 實際選到 Arial Black，英文未登入甚至將 Log in 換成兩行。

依 spec §4、§8.6 與使用者第 8 項要求，停止產品實作，未縮短文案、未調整既有版面。以下所有截圖是 **DOM 量測原型**，不是完成版日文 UI，也不是像素回歸成果。

## 方法與基線

- 乾淨 detached worktree：D:/Project/mimic/.tmp/phase-2ib-baseline，HEAD 7bca944dc8f47e956d9379a11b8f7246b99f3f05；以 git -c core.autocrlf=false worktree add 建立。未修改全域／共用 Git 設定（因此一般 config 查詢仍可能回傳 true）。
- 從該 worktree 啟動 Next.js dev，127.0.0.1:3268；使用既有 node_modules 的 junction，沒有安裝或修改依賴。開關 JavaScript 為 false，避免 hydration 覆寫量測原型。
- 158.0.8127.37，Windows Chrome，viewport 320×720，DPR 1。這不是 WSL Docker CI 結果。
- 只於瀏覽器 DOM 放入 spec 指定按鈕自稱（中文／English／日本語）與獨立 aria-hidden 文字箭頭 ▾，沿用原 navLink class，原 header CSS 不變。兩個連結分別取 common.features、nav.header.login／base，日文與品牌副字標取定稿 JSON。日本語套用 spec 字型鏈與 line-break:strict；字型壓力測試明確指定各 Latin 字族。
- 量測 naturalWidth：複製每個項目到 width:max-content 的暫時 absolute 節點；required = 品牌與三個按鈕／連結的 naturalWidth 總和＋nav gap＋兩個 action gap；margin = nav 內寬 288 − required。所有項目原始數據均在 header-preflight.json。
- TreeWalker 讀取各 header 項目文字節點，再以 Range.getClientRects 記錄行頂位置；此處用於辨認換行，**不等於** §8.4 的基線／候選全頁 DOM 文字節點比對。
- CDP CSS.getPlatformFontsForNode 確認實際字型：Arial 指定下的 Latin 為 Arial Black、Roboto 為載入的 Roboto Black、Liberation Sans 為載入的 Liberation Sans Bold；文字箭頭 fallback 為 Cambria Math。字型測試資源只供測量，未加入產品或下載 web font。
- 本輪重現腳本：header-preflight.cjs（從 repo 根目錄執行，需先啟動上述基線 server；引用 .tmp/ 的既有測量字型與兩份授權文案來源）。

## 320 px 全六組 × 三字型量測

單位 px，可用 nav 內寬每組都是 288；數字四捨五入至小數點後兩位，JSON 保留原精度。

| 語言 | 狀態 | 指定字族 | 需要寬度 | 餘裕 | ≥8 px |
|---|---|---|---:|---:|---|
| zh-TW | 未登入 | Arial | 224.56 | 63.44 | 通過餘裕門檻 |
| zh-TW | 已登入 | Arial | 253.36 | 34.64 | 通過餘裕門檻 |
| en | 未登入 | Arial | 313.02 | -25.02 | **停止** |
| en | 已登入 | Arial | 304.20 | -16.20 | **停止** |
| ja | 未登入 | Arial | 252.83 | 35.17 | 通過餘裕門檻 |
| ja | 已登入 | Arial | 250.98 | 37.02 | 通過餘裕門檻 |
| zh-TW | 未登入 | Roboto | 213.73 | 74.27 | 通過餘裕門檻 |
| zh-TW | 已登入 | Roboto | 242.53 | 45.47 | 通過餘裕門檻 |
| en | 未登入 | Roboto | 271.84 | 16.16 | 通過餘裕門檻 |
| en | 已登入 | Roboto | 264.16 | 23.84 | 通過餘裕門檻 |
| ja | 未登入 | Roboto | 242.00 | 46.00 | 通過餘裕門檻 |
| ja | 已登入 | Roboto | 240.16 | 47.84 | 通過餘裕門檻 |
| zh-TW | 未登入 | Liberation Sans | 215.70 | 72.30 | 通過餘裕門檻 |
| zh-TW | 已登入 | Liberation Sans | 244.50 | 43.50 | 通過餘裕門檻 |
| en | 未登入 | Liberation Sans | 284.50 | 3.50 | **停止** |
| en | 已登入 | Liberation Sans | 275.75 | 12.25 | 通過餘裕門檻 |
| ja | 未登入 | Liberation Sans | 243.97 | 44.03 | 通過餘裕門檻 |
| ja | 已登入 | Liberation Sans | 242.13 | 45.88 | 通過餘裕門檻 |

英文 Arial 未登入的 Log in 文字行頂為 15／29（兩行）；已登入雖仍可見單行，但自然需要寬度超過容器，不符合餘裕規範。Liberation Sans 未登入雖單行，仍只有 3.50 px 餘裕。

代表截圖：[英文未登入 Arial](screenshots/header-preflight-en-signed-out-Arial-320x720.png)、[英文未登入 Liberation Sans](screenshots/header-preflight-en-signed-out-Liberation-Sans-320x720.png)。screenshots/ 共 18 張，均為本輪新增的 320 px 診斷畫面；未移動或覆寫歷史截圖／錄影。

## 來源檔保留

兩份原始檔均原地保留、未改寫：

| 檔案 | SHA-256 |
|---|---|
| .tmp/2ib-ja-final.json | f7869b371563e8b6deb56ed9b91fa5e0332a0767fcea9ef21f3c1ef1a302af6f |
| .tmp/2ib-ja-review-result.json | 74157fb47a6c06f493267ddef7212e5dc138d6fd7c9960c972fc518804ef4da4 |

## 未執行項目與限制

- 未實作 backend catalog／migration／DTO／DB 測試；未啟用 ja、未建立產品 ja.json、未實作 LanguageSwitch 選單、排程摘要、fallback／manifest 或術語表。
- 依停止要求未繼續 360／390／543／544／545 px header 矩陣、日文全部頁面與彈窗、三語像素回歸、A／B 分組、全頁 RGBA 容差 0 比較；因此沒有逐像素相同的成對成果需歸檔，亦沒有 390×844 回歸範例或像素 SHA-256 清單可交付。
- 未執行兩個候選樹的 CI 五 job、兩個 web Dockerfile、migration-only DB、real-backend、舊 API 相容性、完整 Vitest／e2e。未連線任何 DB。WSL 非提權初步探測回傳 E_ACCESSDENIED；因 header 已停止，不進一步處理該環境問題。
- 未完成日文全頁字形／溢出檢查；DOM 原型的日文只驗證 header，不代表其他日文頁面通過。
- 未 stage、commit、push 或部署；既有工作區修改保留。

## 待 Ed 決定

需要重新決定 header 的可接受文案或版面方式，才可恢復實作。此次未替使用者選擇縮字、縮字級、縮間距或改版面。即使改採 CSS 箭頭，也需重新量測，不將此原型結果當作所有可能箭頭實作均不可行的證明。

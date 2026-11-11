# Phase 2E-0 驗證紀錄

2026-11-11。已依 2R 完成候選變更與 Linux 驗證，停在審閱者驗收。

## §3 暫停原因

Phase 1 的 [audit-baseline.cjs](../2026-09-18-page-visual-phase-1/samples/derivations/treasure-chest-states-v04/audit-baseline.cjs) 會讀取 [baseline.json](../2026-09-18-page-visual-phase-1/samples/derivations/treasure-chest-states-v04/baseline.json#L721)，逐檔比對 SHA-256，任一不符即回傳失敗。其記錄包含下列兩份規格指定要修改的連結文件。用 .tmp/phase-2e0-baseline 的乾淨 88173fa worktree 確認兩者原先都符合清單。

| 文件 | Git 歷史 | 稽核預期及乾淨基線 SHA-256 | 路徑更新後 SHA-256 |
|---|---|---|---|
| 2026-09-14-visual-asset-hierarchy.md | bd3865f | 51aec4cb083cd594e85e3681985b3b5785a17031acbea8803e8702d7c3ab9184 | be86e4b2e6efd2e8c06df7c27b3fb550e9c74d0c299425e33eb5e64e18e0d651 |
| 2026-09-14-visual-asset-hierarchy-design.md | d320dae | 7a7bf78e2355898ed3a1d7cf75d10d2c990b5a03d32a402a8281ea13c5fb9537 | 041fd95f18b06f8e055010fda5b6899189c6762cb7d495e3016d5af7678cfc59 |

此工具也列於 [Phase 1 v04 驗證指令](../2026-09-18-page-visual-phase-1/ancient-treasure-chest-v04-verification.md#L109)。原始稽核程式與基線清單保留原樣。2R.1 核准保留兩份路徑更新。這是 Phase 1 v04 的時間點快照，僅由歷史文件列為手動指令，CI 和 Vitest 皆未呼叫它。主工作區實跑時，876 個檔案中 20 個不符。18 個是第一輪之前的 2A–2D 變更與既有生成檔差異，包含 decision log、審閱索引、品牌與 Playwright 測試及 public/sw.js。其餘兩個是本輪的連結更新。快照另記當時的暫存 diff，與目前的空暫存 diff 不同，devlog 前綴仍相符。

## 已驗證的變更

使用暫存 Git index 執行 git mv，實際 index 維持空差異。暫存 index 的 diff 顯示 27 個 100% rename。五份文件只替換 legacy 路徑。再次搜尋舊字串，只剩規格與驗證紀錄中的歷史文字。將五份文件與 88173fa 比對，只出現路徑替換，依序為 20、16、16、18、1 處。

| 相對路徑 | 搬移前 SHA-256 | 搬移後 |
|---|---|---|
| mobile-mockups/activity-mockup.svg | 253c36ea6c9cdd781855bd16119f066db56d9e45648a80d856f317fbd422b171 | 一致 |
| mobile-mockups/confirmations-mockup.svg | fb2fc245479fcae93e35ddd79347d4311b88eca50a2b2ff2bbfc433488fd546f | 一致 |
| mobile-mockups/correction-mockup.svg | b93a610f8311bf67f4d004768e92b8881f86619f9b0ac769f8ffafc8160d218b | 一致 |
| mobile-mockups/dashboard-mockup.svg | 17ec3bf54d8f6acbeb517ee911802f5268d2d8078de55599b4430af58c2e0c19 | 一致 |
| mobile-mockups/expense-create-mockup.svg | a4e5b1a25b5d8887c26a40b1f83251976a72785adbf82bcfa627178e354391f5 | 一致 |
| mobile-mockups/fund-detail-mockup.svg | bb953435eb3240295e399b3f435d7cd383af44313cb8ec623076fb5b67068e23 | 一致 |
| mobile-mockups/settings-mockup.svg | e22de623965da0ccb63866f908612eabd14831daffbfe9bf0f6210499d6009ad | 一致 |
| mobile-mockups/settlement-mockup.svg | c081f3b0a20fb898a946e6b08943d6d9d23fa154f810b5fc5e4076f2bee97ab9 | 一致 |
| mobile-wireframes/activity-wireframe.svg | 6a3886bb98b4574234fb55070638d640e397bea75c4503b8a4528671138ae70b | 一致 |
| mobile-wireframes/confirmations-wireframe.svg | 1366223c8f42b46e7c1a8e773e4b5f8175806a7d4a9e3c06e193c2ac6dd0cd32 | 一致 |
| mobile-wireframes/correction-wireframe.svg | f2c4edef9dc4a32d3cfd184b07c5674fe0f532e3f50482df41bbfdd39526a8ac | 一致 |
| mobile-wireframes/dashboard-wireframe.svg | 2ac61e94e6510f2398d2db7115512b357edc4977a39c1ae897c307ad15fbe476 | 一致 |
| mobile-wireframes/expense-create-wireframe.svg | 1dbb996a54f045ff1bdaffb9964dbd15682f4b3b6996a5cf7df5ed526223adf5 | 一致 |
| mobile-wireframes/fund-detail-wireframe.svg | 3c2c1d20dbc8ac4a0c1b3fcc8ed52e2f8040da03f3d1a1dfe6b783d5c0267252 | 一致 |
| mobile-wireframes/settings-wireframe.svg | adfa943a44ae96676bf3ae21c364ea5996ec4d0b4fbfdb373d6cfd3e12fd3032 | 一致 |
| mobile-wireframes/settlement-wireframe.svg | d73e49f735e70ae1a6582b1a9fcbab812b5d3c7ce4d2fd6d0dc67b7c9afbbe91 | 一致 |
| README.md | 634f2169376aca33f0f788a713fe2c0efea6700649bf4198658f3d92b113c91a | 一致 |
| web-mockups/web-activity-mockup.svg | 046964406f18345c5e016ce98584940560cea8efef726d77f387bcd2518c5027 | 一致 |
| web-mockups/web-dashboard-mockup.svg | 92c53d30b9043e814eeea8c0bb67a5b0505fdb28b52c521328fb011a0997cada | 一致 |
| web-mockups/web-fund-workspace-mockup.svg | 304c8965aecac3fe72a34bb2340d563de163153106608cba319e868828d89e05 | 一致 |
| web-mockups/web-settings-mockup.svg | b3c74e12227d9ca2352b2d51c830a84eff69d887bf3aa24f1564732d7c8c8d9b | 一致 |
| web-mockups/web-settlement-mockup.svg | 741988e006a5feea05389cf32d3e06abdb365e08b33fa62cef4878c9fd155e27 | 一致 |
| web-wireframes/web-activity-wireframe.svg | e145859414343236186ec5e1594defac95d2cbea9017bc9b6d32620bb7c40c83 | 一致 |
| web-wireframes/web-dashboard-wireframe.svg | 793cf898271cef8501e2f0923d9e14042c7b216a02ada311fed76f3fb4f7ace4 | 一致 |
| web-wireframes/web-fund-workspace-wireframe.svg | ea75a4bfdc4d5f09d8e7dcfabe7509d62d5744e070243e1fc6b42a0bfcf23ce4 | 一致 |
| web-wireframes/web-settings-wireframe.svg | 559d0867fd656f796d5c2d3c3774554e9c387e7823def7019e4439a508092d39 | 一致 |
| web-wireframes/web-settlement-wireframe.svg | d699244801629773119e2f78401b6cc5f81444c0a452f6f7b88b8e4e6fcc78fb | 一致 |

## §4 Lineage 判定

### D：Git 換行轉換

所有下列檔案的工作樹 SHA-256 都與各自的記錄一致，且逐位元組比對確認舊 blob 只差 CRLF。按精確路徑設定 -text。新 blob 從工作樹原樣加入容器的暫存 index，再由該 index 另行 checkout。新 checkout 逐一執行 SHA-256 檢查，13/13 通過。工作樹位元組未改動。

Motion 三檔由 d187aca 引入。HTML 依 review-manifest，controller 依 production-asset-manifest。Landing 定位來源與 receipts 由 0362db3 引入。定位來源依 landing-prop-position.manifest，桌機與手機 receipt 依 application compositor，phone-exploration receipt 依 3R–3R3 manifests。Home 四份 prompt 由 e6b3434 引入，依 Home v01／v02 manifests。

| Phase 1 相對路徑 | 工作樹 SHA-256 | 舊 blob SHA-256 | 新 blob SHA-256 | 寫死的 SHA-256 |
|---|---|---|---|---|
| motion-calibration-v02r-review.html | f85417e0d7807a9d56e2ecd592fdf12d1dd7476b1bbdff42dd615146ac682d39 | d4ce6c001d5bb06b5a945599eaf101ed2502405e058d945d98a600b69ec4636d | f85417e0d7807a9d56e2ecd592fdf12d1dd7476b1bbdff42dd615146ac682d39 | f85417e0d7807a9d56e2ecd592fdf12d1dd7476b1bbdff42dd615146ac682d39 |
| motion-calibration-v02-review.html | 40b8fb2bfd57f8a1115b72d97b2fac675bb1e867398d44d34c4824a6b7abbaf9 | 397002aa7101331e84184f64daaa6c90a3bc52a4b6b03123d3f3a2f9ab781587 | 40b8fb2bfd57f8a1115b72d97b2fac675bb1e867398d44d34c4824a6b7abbaf9 | 40b8fb2bfd57f8a1115b72d97b2fac675bb1e867398d44d34c4824a6b7abbaf9 |
| motion-calibration-v02r.js | c96be3d553ca2de3927232857ba78d451f37e083c1fa13777f0c0f777cb81258 | 64667aa2835bce2e1535585216fbfce7ce23ee94c7465bc4e4d8d5d321cc0288 | c96be3d553ca2de3927232857ba78d451f37e083c1fa13777f0c0f777cb81258 | c96be3d553ca2de3927232857ba78d451f37e083c1fa13777f0c0f777cb81258 |
| landing-prop-position.model.mjs | 8b878415a0bb31509b0f16e4827224db1c3bb8fdc61c14215496487e5eaa0790 | 13e965c4f94d71490a0985be49113031e527f5451e8befa3b7a01cf50e6d9f0e | 8b878415a0bb31509b0f16e4827224db1c3bb8fdc61c14215496487e5eaa0790 | 8b878415a0bb31509b0f16e4827224db1c3bb8fdc61c14215496487e5eaa0790 |
| landing-prop-position.controller.mjs | 96dc6992fa3eda2fc5645368e308800d054d844cc23832325dbd1e1ac4629378 | e864e4ce476fc104360d9936eb2c2207f4c91b0bfe3d0374e306fc1457167ddd | 96dc6992fa3eda2fc5645368e308800d054d844cc23832325dbd1e1ac4629378 | 96dc6992fa3eda2fc5645368e308800d054d844cc23832325dbd1e1ac4629378 |
| render-landing-prop-position-tool.mjs | 2c79915131222a8e58a48e69d548b289e740cef736dd68a365f5fa7dad89fe7f | d722d1720da860685083830b20cb790fea9dd19155137325f2f082f417c42ed7 | 2c79915131222a8e58a48e69d548b289e740cef736dd68a365f5fa7dad89fe7f | 2c79915131222a8e58a48e69d548b289e740cef736dd68a365f5fa7dad89fe7f |
| samples/derivations/landing-prop-placement-receipts/desktop-receipt.json | 620802128cd32afbd0654a146bf50c098275e08264512f6c169bde3ca4ddea6d | 67474daac357babb5a20bca9b00ede8802da48b6e6c7d1cc7ea77aeb479719f5 | 620802128cd32afbd0654a146bf50c098275e08264512f6c169bde3ca4ddea6d | 620802128cd32afbd0654a146bf50c098275e08264512f6c169bde3ca4ddea6d |
| samples/derivations/landing-prop-placement-receipts/phone-receipt.json | 0ae862073aee3ac9bac5d75a3f0857b40b27609d9d55e8dc1499b3c4d3de845e | 1b24b9620765641664413375de1591b33efce09b5f9e3c8aa80a46ed36daa0ce | 0ae862073aee3ac9bac5d75a3f0857b40b27609d9d55e8dc1499b3c4d3de845e | 0ae862073aee3ac9bac5d75a3f0857b40b27609d9d55e8dc1499b3c4d3de845e |
| samples/derivations/landing-prop-placement-receipts/phone-exploration-receipt.json | e5e32395401af10a2ff4ee1b8523c2106788c9518bc50f89fdf610b44e222e88 | 85fa7f47b7e06610ff688755f3616836779073391ea814e053867154b9066662 | e5e32395401af10a2ff4ee1b8523c2106788c9518bc50f89fdf610b44e222e88 | e5e32395401af10a2ff4ee1b8523c2106788c9518bc50f89fdf610b44e222e88 |
| samples/derivations/home-base/desktop-prompt.md | 32b4aa0d0325d934ca1ca0aa76203500912d0f5da5d42afc836e660608ec38d2 | f5b7b78dade171ffe753d71a5d90c13584f865b7c3cdd92e3139c29184bec298 | 32b4aa0d0325d934ca1ca0aa76203500912d0f5da5d42afc836e660608ec38d2 | 32b4aa0d0325d934ca1ca0aa76203500912d0f5da5d42afc836e660608ec38d2 |
| samples/derivations/home-base/phone-prompt.md | 6a20433f2180b73ef676244eb782e4eb7896403a04d1802f32907702c05ed0c8 | ef36bbc10bf714a77d7ef7734901ae73729ad7b5314f5ba788cad0daa5a9464c | 6a20433f2180b73ef676244eb782e4eb7896403a04d1802f32907702c05ed0c8 | 6a20433f2180b73ef676244eb782e4eb7896403a04d1802f32907702c05ed0c8 |
| samples/derivations/home-base-v02/desktop-prompt.md | 65abde3d4cdf029eca15229f364c0abb6238dff20fd116db6463e2f0b589de0d | 71eb296ac6e381c4b6f2a664345dc9178f46941b2314dfaff8d972cc04dc2a48 | 65abde3d4cdf029eca15229f364c0abb6238dff20fd116db6463e2f0b589de0d | 65abde3d4cdf029eca15229f364c0abb6238dff20fd116db6463e2f0b589de0d |
| samples/derivations/home-base-v02/phone-prompt.md | ff2923a7b401304510c2517d49a675f4cce3f4ef39b4e4a84f0475bbb1d9e2e5 | 2904e75d22c17fe42bdbf8b383480b38e1d30fb16b9260b7b3ec927d2edcfba4 | ff2923a7b401304510c2517d49a675f4cce3f4ef39b4e4a84f0475bbb1d9e2e5 | ff2923a7b401304510c2517d49a675f4cce3f4ef39b4e4a84f0475bbb1d9e2e5 |

### C：歷史快照缺口

| 項目 | 寫死的 SHA-256 | 實際 SHA-256 | Git 證據與處理 |
|---|---|---|---|
| 壓力板 v02 spec | 28edc48e4f3675e454c8ceaaee2f5cfcd87814b35370b94996913111ec675efb | 07f4905b7cbaf8e0515a8aa1f17bd1ff0db5352573a79a72e3a660682e195fd5 | C。spec 唯一 Git 版本 0362db3 已含後續回合。原始 lineage 不變。 |
| 壓力板 attempt-04 spec | 9cbe50450464e8781e95006e8c1c65199e0e290cd74c15d77e5a9e5d7c14fa37 | 07f4905b7cbaf8e0515a8aa1f17bd1ff0db5352573a79a72e3a660682e195fd5 | C。同一 blob，現版 spec 擷取的 prompt 邊界也已改變。 |
| 壓力板 attempt-05 spec | 5d3c506484d0a452481113867421813110e8ca20c1c3afcf5c813da475db5c0d | 07f4905b7cbaf8e0515a8aa1f17bd1ff0db5352573a79a72e3a660682e195fd5 | C。0362db3 的現版包含後續回合內容。 |
| 壓力板 attempt-06 spec | e19d09c45cfbb7b7ba1c53d2d402ef038487a43ee92772ad9f1bf3b23667159b | 07f4905b7cbaf8e0515a8aa1f17bd1ff0db5352573a79a72e3a660682e195fd5 | C。同一 blob，現版擷取的 prompt 含額外 Markdown 內容。 |
| landing-prop-position-review.html | 25750ea6a2777f615b496d44a12dd51d6cb9fad06c1f5306a1f2a3420b654921 | 1021bf073585bb205c2530d1afe83f667578b0fc4fc918f699ee53c2a9e8b415 | C。唯一 Git 版本 0362db3 與工作樹相同。檢查 11 份 .tmp 副本，只有此 hash 及 cd49c9dd4b5ac0717c6606db816a13d678cfc878bc744ed344734b593a07b756。原檔保留。 |
| 定位 manifest 引用的 decision-log.md | cfe129fd5c25310887d36387a36d50a9be7747a0c4653d59073c81d53d15d151 | ab962809e275b1694b0c3ef2f39a3113ac0d933bd367f63dd74ece6f445d03db | 後續審閱有意追加（B）。逐一檢查 13 個 Git 版本及 .tmp 副本，找不到原始 hash。若更新會改寫歷史定位 manifest，依 C 保留。 |

Home v01／v02 的 manifest 在 Git 只有 e6b3434，工作樹與原 blob 各自相同（a3a0482615e58f723170e5d2025fa998f3ae931be63a0a85f516316544e493a8、35e1b6abfb065f9466f49c40805d5c0ab57254ac537ecbabe1d01878592da371）。v01／v02 HTML 也已符合各自的 reviewHash。基線重建只報 manifest differs，追到上述四份 D prompts。Landing application manifest 在 0362db3 的 blob 與工作樹相同，SHA-256 為 8084940578e2409aae4c59ffea6adfc7ac17e416ca61367a205c1e85105e0e8c。其 HTML 也已符合 reviewHash。基線失敗點是 desktop receipt，D 處理後才檢驗完整重建。定位 manifest 本身的 blob 和工作樹相同（091838768c00714dc5aa7895411516353327ac29b6c625a6e39147e78b8d16c0），出錯的是上表的 review HTML。

### 寶箱 PNG：已記錄位元組與 Git 相符

| PNG | 工作樹、舊 blob、manifest 共用的 SHA-256 | Git 歷史 |
|---|---|---|
| treasure-chest-states-v01/open-sprite.png | a79d5c8604180644a8d8a666f3c769aeebdb6dce711aff292fbe66f102e35a17 | 4acb2aa，另有 11 個相符 .tmp 副本 |
| treasure-chest-states-v02/open-sprite.png | 124a1f050f46122e7aba2aafa41010aca57f634e930ac7ca42b86d9f47f37ca3 | 4acb2aa，另有 11 個相符 .tmp 副本 |

兩張 PNG 原始位元組已符合紀錄。基線平行跑時，v04 重現 v01 open-sprite 的暫時讀取錯誤。v01 的測試會在原檔尾端附加一個零位元組，再於 finally 還原。相同機制也會暫改 v02 PNG 及各輪 manifest。v03 測得 v01 manifest 的 69a7bf80…，與依測試的方式移除 outputs.open-sprite 再序列化得到的 SHA-256 完全一致。v02 manifest 也在另一檔暫改時被讀到。這些是平行測試的暫時變更，持久檔案已匹配，沒有 A–D 要處理的永久差異。封存套件以 fileParallelism: false 依檔執行。

## §5 套件分流

下表都以 Phase 1 歷史審閱產物為對象，並執行 compositor 或寫入歷史 review，部分同時固定 C 的輸入。整檔由一份清單管理，未在測試內加入跳過條件。只讀完整性檢查、產品與推廣守門仍在主套件。2R 後 asset-style-gate.test.ts 與 88173fa 完全相同，motion 測試和 Gate B controller 原始 SHA-256 檢查均留在 CI。

| web/src/shared/brand 測試檔 | 封存理由 | Linux 結果 |
|---|---|---|
| ancient-treasure-chest-v04.test.ts | 重建 v04 寶箱與暫改 review 產物 | 13 通過 |
| ancient-treasure-chest.test.ts | 重建 v03 寶箱與暫改 review 產物 | 7 通過 |
| home-base-v02.test.ts | 執行 Home v02 compositor 的 --check，含 D 的 prompt 來源 | 1 通過 |
| home-base.test.ts | 執行 Home v01 compositor 的 --check，含 D 的 prompt 來源 | 1 通過 |
| landing-chest-material.test.ts | 重建寶箱材質審閱產物與測試覆寫保護 | 8 通過 |
| landing-prop-placement-application.test.ts | 執行 Landing application compositor 的 --check，含 D 的 receipts | 2 通過 |
| landing-prop-positioning.test.ts | 執行定位 compositor，會寫出歷史 review，另有 C 的舊 HTML hash | 4 通過, 1 已知失敗 |
| landing-title-placement.test.ts | 暫改歷史標題審閱產物並呼叫 compositor 驗證覆寫保護 | 5 通過 |
| pressure-plate-attempt-04-review.test.ts | 執行 attempt-04 compositor，固定 C 的 spec 快照與 prompt | 2 通過, 3 已知失敗 |
| pressure-plate-attempt-05-review.test.ts | 執行 attempt-05 compositor，固定 C 的 spec 快照 | 3 通過, 2 已知失敗 |
| pressure-plate-attempt-06-review.test.ts | 執行 attempt-06 compositor，固定 C 的 spec 快照與 prompt | 4 通過, 3 已知失敗 |
| pressure-plate-v02.test.ts | 執行 v02 compositor，固定 C 的 spec 快照 | 3 通過, 2 已知失敗 |
| restored-treasure-chest.test.ts | 重建 v02 寶箱與暫改 review 產物 | 9 通過 |
| treasure-chest-states.test.ts | 重建 v01 寶箱與暫改 review 產物 | 9 通過 |

### 每個已知失敗

| 測試檔 | 測試 | 原因 |
|---|---|---|
| landing-prop-positioning.test.ts | records every source/output hash and rebuilds byte-identically | 定位 HTML 的 C 缺口，既有輸出 hash 不符，compositor 在寫入前拒絕。 |
| pressure-plate-attempt-04-review.test.ts | keeps exact source history and the document's first prompt | C 的 prompt 邊界差異。工具取到現版 spec 額外追加的小節或 code fence。 |
| pressure-plate-attempt-04-review.test.ts | rebuilds all review outputs byte-identically | C 的 spec 快照缺口。compositor 在檢查輸出前就因輸入 SHA-256 不符而停止。 |
| pressure-plate-attempt-04-review.test.ts | refuses a modified output before writing any other target | C 的 spec 快照缺口。compositor 在檢查輸出前就因輸入 SHA-256 不符而停止。 |
| pressure-plate-attempt-05-review.test.ts | rebuilds prepared guide, all PNGs, HTML and manifest byte-identically | C 的 spec 快照缺口。compositor 在檢查輸出前就因輸入 SHA-256 不符而停止。 |
| pressure-plate-attempt-05-review.test.ts | refuses corrupt output without overwriting review files | C 的 spec 快照缺口。compositor 在檢查輸出前就因輸入 SHA-256 不符而停止。 |
| pressure-plate-attempt-06-review.test.ts | pins all five existing raw sources, prompt chain, measured guide and extra colour references | C 的 prompt 邊界差異。工具取到現版 spec 額外追加的小節或 code fence。 |
| pressure-plate-attempt-06-review.test.ts | rebuilds review outputs without rewriting existing measurement, guide or contracts | C 的 spec 快照缺口。compositor 在檢查輸出前就因輸入 SHA-256 不符而停止。 |
| pressure-plate-attempt-06-review.test.ts | refuses a corrupt review output before overwriting the HTML | C 的 spec 快照缺口。compositor 在檢查輸出前就因輸入 SHA-256 不符而停止。 |
| pressure-plate-v02.test.ts | rebuilds all review outputs byte-identically | C 的 spec 快照缺口。compositor 在檢查輸出前就因輸入 SHA-256 不符而停止。 |
| pressure-plate-v02.test.ts | refuses a modified output before writing any other target | C 的 spec 快照缺口。compositor 在檢查輸出前就因輸入 SHA-256 不符而停止。 |

### 測試數守恆

Linux 的 cfc7ac6（run #13）以 vitest list 實測 726。規格指定的 88173fa 乾淨基線實跑 740（719 通過、21 失敗）。兩版間淨增 14，來自 public pages +2、asset style gate +3、assets +1、Landing motion +2、Landing scene +1、pixel app shell +3、pixel dialogue +1、tokens +1。

候選主套件 658 ＋ 封存 82 ＝ 740。以相對測試檔路徑和完整測試名稱比對兩套件合併後的清單，與 88173fa 完全一致。上述 14 個測試全部保留。

## §6 Linux 驗證

WSL2 Ubuntu 內的 Docker node:22 容器，Node v22.23.4、npm 10.9.9。主工作區唯讀掛載。保留 .tmp/phase-2e0-baseline 的 88173fa 工作樹，另在容器建立同一 SHA 的乾淨基線和暫存 worktree。將候選變更放入隔離 index，使用 git checkout-index 全量取出至新目錄，並確認工作樹相對隔離 index 無差異。候選 tree 為 1afae36b2055368ebf0940f2dfe352457f52a762。封存測試的寫入只發生在容器副本。

| 目錄 | 指令 | Exit | 結果 |
|---|---|---:|---|
| repo | `node --test scripts/verify-mimic-naming.test.mjs` | 0 | 6/6 |
| repo | `node scripts/verify-mimic-naming.mjs` | 0 | 命名掃描通過 |
| web | `npm ci` | 0 | 依 lockfile 安裝 |
| backend | `npm ci` | 0 | 依 lockfile 安裝 |
| backend | `npm run prisma:generate` | 0 | 產生 Prisma Client |
| web | `node --test ../scripts/verify-ci-workflow.test.mjs` | 0 | workflow contract 通過 |
| web | `npm run lint` | 0 | 0 errors，2 個既有 e2e ESLint config warnings |
| web | `npm run typecheck` | 0 | 通過 |
| web | `npm test` | 0 | 658/658，125 個測試檔 |
| web | `npm run build` | 0 | Next.js production build 通過 |
| web | `npm run test:review-archive` | 1 | 71 通過，11 個已知失敗 |

主套件初跑和前一輪封存驗證重疊時，唯讀 Landing warm-rest 測試觸發既有 5 秒逾時。完成封存後，從相同暫存 tree 再乾淨 checkout 並單獨重跑。表格採重跑結果，初跑留在 final/test.log。Vitest 兩個命令另加 JSON reporter 以核對測試身分，測試選擇不變。Vitest 主設定同時有預設和具名匯出，打包器回報 MIXED_EXPORTS 警告，測試仍正確載入設定。Web build 使用 CI 的 MIMIC_API_BASE_URL 與 MIMIC_COOKIE_SECURE。日誌在 .tmp/phase-2e0-2r/final，基線與 run #13 證據在其上一層。

暫存 index 的 git diff --stat 與 --summary 顯示 27 個 100% rename，另有 13 個 D blob、五份連結、Web Vitest 設定與說明。verification 和 devlog 是其餘交付文件。實際 index 為空差異，無 commit。未編輯產品程式、backend、Dockerfile、CI workflow、Railway、已核准素材或 web/public。開始前工作區已有 landing-prop-position-review.html 的狀態項目，這輪未改寫其位元組。

## 待驗收

待審閱者驗收。推送後由 GitHub Actions 確認四個 job 的結果，包含此輪沒有執行完整 job 的 Backend 與 Production containers。D 的精確路徑屬性與對應 blob 需一同納入後續提交。Windows 暫存 index 實測，普通 git add 可能沿用 D 檔案的舊 stat 資訊。後續納入提交時，先加入 .gitattributes，再對 D 表的 13 條精確路徑執行 git add --renormalize -- <paths>，並核對 index 中的 SHA-256。

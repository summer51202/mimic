# Phase Avatar：職業選擇

- 日期：2026-11-25（小德起草；Ed 的決策見 §1）
- 狀態：**草稿，尚未 commit**。
- 基線：`1b5594e`（公會 Phase，已上線）。
- 像素回歸：依 `docs/design/pixel-regression-standard.md`。

---

## 1. Ed 已定的產品規則（2026-11-25）

1. **8 個職業**：warrior、mage、ranger、rogue、alchemist、bard、cartographer、physician。素材已核准，每個職業各有全身圖 192 px 和頭像 96 px。
2. **選職業的時機**：註冊後**第一次進入 Home** 時跳出「選擇你的職業」，可以按「之後再說」跳過。註冊表單不變。
3. **可以更改**：隨時在設定頁更改，沒有冷卻時間；選職業純粹改外觀，沒有遊戲規則上的影響。
4. **還沒選職業時**：Home 不顯示角色（跟現在一樣只有 Mimiku）；名單上顯示中性的空位，不假裝已經選了。
5. **職業會顯示在三個地方**：
   - Home 場景裡的自己（全身圖）；
   - 設定頁（顯示目前的職業，也是更改入口）；
   - 群組成員名單（頭像，取代現在依順序輪流顯示的 4 張舊頭像）。
   - 寶箱參與者公告板**這輪不做**。

---

## 2. 現況（`1b5594e`）

| 範圍 | 現況 |
|---|---|
| 素材 | `approved/page-visual-v1/avatars/{class}-full.png`（192×192）、`{class}-portrait.png`（96×96），共 16 張，狀態都是 `staged-only-until-consumer-plan` |
| Home | `scenes/home/layout.json` 的 `desktop.avatarSlots`、`phone.avatarSlots` 已有 8 個職業各自的 x／y／寬高／ground／scale。handoff 的決策是「頭像不渲染」 |
| 群組名單 | `features/groups/member-roster.tsx` 用 `pixelUiFiles.avatars[index % 4]`（`/pixel-ui/avatars/avatar-0X.png`），**依名單順序輪流顯示 4 張舊頭像，和使用者本人無關** |
| 後端 | `users.avatar_url`（VarChar 500，沒有使用）；`GET/PATCH /me` 回傳 id、mimic_id、email、display_name、locale、timezone |
| 合約 | web 的 `memberSchema` 是 strict（只有 user_id、display_name、mimic_id、role、status） |

---

## 3. 資料與 API

### 3.1 資料庫（新的 migration，不改已部署的 migration）
- `users.avatar_class`：nullable，只能是 §1 的 8 個值。用 Prisma enum `AvatarClass`，或 `VarChar(20)` 加 CHECK，實作時二選一並寫在 verification。
- `users.avatar_prompt_dismissed_at`：`Timestamptz` nullable。按「之後再說」時寫入，讓提示**跨裝置**只出現一次。
- `avatar_url` 不動、不使用。
- `migration-contract.spec.ts` 要涵蓋新 migration；`test:migration-only-db` 要通過。

### 3.2 API
- `GET /me`、`PATCH /me` 的回應新增：
  - `avatar_class: <8 個值之一> | null`；
  - `avatar_prompt_dismissed: boolean`。
- `PATCH /me` 可以接受：
  - `avatar_class`：8 個值之一；其他值回 400；
  - `avatar_prompt_dismissed: true`：只能設成 true，false 回 400；
  - 省略表示不變（和 `locale` 一致）。這輪不提供清除職業（`null` 回 400）。
- `GET /groups/:groupId/members` 每個成員新增 `avatar_class: … | null`。
- Home 不改 API：web 端的 `loadHome` 需要目前使用者的職業時，另外抓 `/me`。

### 3.3 部署（2H 起的規則）
1. **先 push web**：web 的合約讓新欄位變成 optional，缺欄位時視為「未選」，不顯示提示，也不顯示角色。
2. web 部署完成後，**再 push 後端**。
3. 之後另開一輪，把欄位改成必填。
- 驗證要分兩棵樹：「只有 web」和「全部」，並實際跑「新 web 接舊 API」。

---

## 4. 畫面

### 4.1 首次選擇（Home）
- 條件：`avatar_class === null` 且 `avatar_prompt_dismissed === false`，並且欄位存在（舊 API 不會出現提示）。
- 形式：`PixelDialog`（公會 Phase 的 notebook 紙面），標題「選擇你的職業」，下面一行說明。
- 8 個選項排成格子（手機 2 欄、桌機 4 欄），每格放頭像 96 px 和職業名稱。
  - 語意是 radio group（`role="radiogroup"`），可以用方向鍵切換；
  - 選中的那格用 2px 黃銅框（`#b79556`）加淺色底，不用亮金；
  - 頭像是裝飾性的（`alt=""`），可讀名稱靠文字。
- 按鈕：主要「決定」（亮金，唯一的 CTA）、次要「之後再說」。
  - 「決定」：`PATCH /me { avatar_class }`，成功後關閉彈窗，Home 出現角色；
  - 「之後再說」：`PATCH /me { avatar_prompt_dismissed: true }`，關閉彈窗；
  - 失敗時保留彈窗並顯示錯誤；離線時兩個按鈕都停用，加 `status-offline` 提示。
- 不觸發 record-ledger 動畫；暫停偏好不影響彈窗。

### 4.2 Home 角色
- 有職業時，依 `layout.json` 的 `avatarSlots[class]` 在場景中渲染全身圖。縮放規則照「已定的重要設計決策」：1× master，手機整數倍，桌機非整數倍。
- 圖層深度用 slot 的 `depth`，`aria-hidden`、`pointer-events: none`。
- 只顯示**自己**的職業，個人與群組情境都一樣。
- 和 Mimiku、火堆、卡片、對話框的 safe zone 不能重疊。如果 slot 的位置在某個寬度下會重疊，列為停止點。
- 沒有職業時，像素和現在完全相同。

### 4.3 設定頁
- 新增「職業」區塊：顯示目前職業的頭像 96 px 和名稱；未選時顯示中性空位和「尚未選擇」。
- 「更改職業」打開和 §4.1 相同的格子彈窗，但沒有「之後再說」，改成「取消」。

### 4.4 群組成員名單
- 有職業：顯示該成員的頭像（48 px，沿用目前尺寸，手機與桌機的縮放規則同導覽圖示）。
- 未選：中性空位。48 px 方框、2px 虛線 `--mimic-color-disabled-edge`、透明底，`aria-hidden`。
- `alt` 改成包含職業：`{name}（{class}）`；未選時 `{name}（尚未選擇職業）`。
- 舊的 `pixelUiFiles.avatars`（4 張舊頭像）不再使用。檔案先保留，下一輪清理。

---

## 5. 素材
- 推廣 16 張 avatar（`assets:promote -- --phase-avatar`），更新 manifest 的 disposition 與 SHA-256。
- 不需要新素材；如果實測發現需要（例如 Home 角色和背景對比不足），停下來回報，由 Ed 決定要不要交給 Codex 生圖。

---

## 6. 字串（三語）

| key | zh-TW | en | ja（草稿，待審） |
|---|---|---|---|
| `avatar.class.warrior` | 戰士 | Warrior | 戦士 |
| `avatar.class.mage` | 法師 | Mage | 魔法使い |
| `avatar.class.ranger` | 遊俠 | Ranger | レンジャー |
| `avatar.class.rogue` | 盜賊 | Rogue | 盗賊 |
| `avatar.class.alchemist` | 鍊金術士 | Alchemist | 錬金術師 |
| `avatar.class.bard` | 吟遊詩人 | Bard | 吟遊詩人 |
| `avatar.class.cartographer` | 製圖師 | Cartographer | 地図職人 |
| `avatar.class.physician` | 醫者 | Physician | 医術師 |
| `avatar.pickerTitle` | 選擇你的職業 | Choose your class | 職業を選ぶ |
| `avatar.pickerIntro` | 職業只會改變你在 mimic 裡的樣子，之後隨時可以在設定更改。 | Your class only changes how you look in mimic. You can change it anytime in Settings. | 職業で変わるのは mimic での見た目だけです。設定からいつでも変更できます。 |
| `avatar.confirm` | 決定 | Choose | 決定 |
| `avatar.later` | 之後再說 | Later | あとで |
| `avatar.cancel` | 取消 | Cancel | キャンセル |
| `avatar.settingsHeading` | 職業 | Class | 職業 |
| `avatar.none` | 尚未選擇 | Not chosen | 未選択 |
| `avatar.change` | 更改職業 | Change class | 職業を変更 |
| `avatar.rosterAlt` | {name}（{class}） | {name} ({class}) | {name}（{class}） |
| `avatar.rosterAltNone` | {name}（尚未選擇職業） | {name} (no class yet) | {name}（職業未選択） |
| `avatar.saveFailed` | 職業還沒儲存，請稍後再試。 | Your class wasn't saved. Try again later. | 職業を保存できませんでした。しばらくしてからもう一度お試しください。 |

- 如果 `common` 已經有「取消」「之後再說」這類 key，實作時沿用既有的，不重複新增，並在 verification 列出來。
- 日文的 19 句加進 `docs/design/assets/reviews/2026-11-19-phase-guild/ja-strings-for-review.md`，和公會 Phase 的 3 句一起給審閱者。
- 職業名稱加進 `docs/i18n/glossary.md`。

---

## 7. 驗證
- 像素回歸依 `docs/design/pixel-regression-standard.md`：
  - 基線 `1b5594e`；
  - **A 組**：候選 web 對基線 web，都接基線 API；
  - **B 組**：候選 web 分別接候選 API 與基線 API。
- 預期差異：Home（有職業的使用者、首次提示的彈窗）、設定頁、群組名單。
  - 測試資料要準備四種使用者：未選且未跳過、未選但已跳過、已選、名單中混合已選與未選。
- 零差異：沒有職業、而且已經跳過提示的使用者，在所有頁面都要和基線相同。
- 用 WSL Docker `node:22` 跑 CI 五個 job；backend-db job 要跑新 migration。
- 新 web 接舊 API：不出現提示、不顯示角色，名單全部是中性空位，不報錯。

## 8. 停止點
1. Home 角色和 safe zone（卡片、對話框、Mimiku、火堆）在任何寬度下重疊。
2. 任一語言出現截斷、溢出、橫向捲動。
3. 職業頭像在名單 48 px 下辨識度不足，或者需要新素材。
4. 新 web 接舊 API 時報錯，或者顯示了提示。
5. 需要修改已部署的 migration。

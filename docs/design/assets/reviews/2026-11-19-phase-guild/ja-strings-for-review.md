# 公會 Phase＋Avatar Phase：日文新字串審閱清單

- 狀態：累加中，尚未交給審閱者。
- 用語依據：`.tmp/2ib-ja-review-result.json` 的用語集（2I-b 上線後改看 `docs/i18n/glossary.md`）。
- 一般 UI 用です・ます體；ICU 複數只用 `other`。
- #1–3 為公會 Phase；#4–22 為 Avatar Phase（spec `docs/superpowers/specs/2026-11-25-phase-avatar-design.md` §6）。

| # | key | 使用位置 | zh-TW | en | ja（草稿） | 備註 |
|---|---|---|---|---|---|---|
| 1 | `shared.list.correctedTo` | 割り勘の支出リスト。訂正された支出の下に表示 | 已更正 {count} 次 · 更正後 <amount></amount> | Corrected {count, plural, one {once} other {# times}} · Now <amount></amount> | {count}回訂正済み · 訂正後 <amount></amount> | `<amount>` は金額（例 NT$1,200）。右側の大きな金額は元の記録のまま |
| 2 | `shared.list.correctedVoid` | 同上。最新の訂正で無効にした場合 | 已更正 {count} 次 · 已作廢 | Corrected {count, plural, one {once} other {# times}} · Voided | {count}回訂正済み · 無効 | 訂正フォームの「この支出を無効にする」に対応 |
| 3 | `shared.list.correctionReason` | 同上。2 行目 | 最新更正原因：<reason></reason> | Latest reason: <reason></reason> | 最新の訂正理由：<reason></reason> | `<reason>` はユーザーが入力した理由（長文あり） |
| 4 | `avatar.class.warrior` | 職業名。選択ダイアログ・設定・メンバー一覧の読み上げ | 戰士 | Warrior | 戦士 | 用語集に追加済み |
| 5 | `avatar.class.mage` | 職業名。選択ダイアログ・設定・メンバー一覧の読み上げ | 法師 | Mage | 魔法使い | 用語集に追加済み |
| 6 | `avatar.class.ranger` | 職業名。選択ダイアログ・設定・メンバー一覧の読み上げ | 遊俠 | Ranger | レンジャー | 用語集に追加済み |
| 7 | `avatar.class.rogue` | 職業名。選択ダイアログ・設定・メンバー一覧の読み上げ | 盜賊 | Rogue | 盗賊 | 用語集に追加済み |
| 8 | `avatar.class.alchemist` | 職業名。選択ダイアログ・設定・メンバー一覧の読み上げ | 鍊金術士 | Alchemist | 錬金術師 | 用語集に追加済み |
| 9 | `avatar.class.bard` | 職業名。選択ダイアログ・設定・メンバー一覧の読み上げ | 吟遊詩人 | Bard | 吟遊詩人 | 用語集に追加済み |
| 10 | `avatar.class.cartographer` | 職業名。選択ダイアログ・設定・メンバー一覧の読み上げ | 製圖師 | Cartographer | 地図職人 | 用語集に追加済み |
| 11 | `avatar.class.physician` | 職業名。選択ダイアログ・設定・メンバー一覧の読み上げ | 醫者 | Physician | 医術師 | 用語集に追加済み |
| 12 | `avatar.pickerTitle` | 職業選択ダイアログの見出し（ホーム初回、設定の変更） | 選擇你的職業 | Choose your class | 職業を選ぶ |  |
| 13 | `avatar.pickerIntro` | 同ダイアログの説明 1 行 | 職業只會改變你在 mimic 裡的樣子，之後隨時可以在設定更改。 | Your class only changes how you look in mimic. You can change it anytime in Settings. | 職業で変わるのは mimic での見た目だけです。設定からいつでも変更できます。 |  |
| 14 | `avatar.confirm` | 同ダイアログの主ボタン（唯一の金色ボタン） | 決定 | Choose | 決定 |  |
| 15 | `avatar.later` | ホーム初回だけ。押すと次回から表示しない（端末をまたいで記録） | 之後再說 | Later | あとで |  |
| 16 | `avatar.cancel` | 設定から開いたときだけ。「あとで」の代わり | 取消 | Cancel | キャンセル |  |
| 17 | `avatar.settingsHeading` | 設定ページの区画見出し | 職業 | Class | 職業 |  |
| 18 | `avatar.none` | 設定ページ。まだ職業を選んでいないとき | 尚未選擇 | Not chosen | 未選択 |  |
| 19 | `avatar.change` | 設定ページのボタン。ダイアログを開く | 更改職業 | Change class | 職業を変更 |  |
| 20 | `avatar.rosterAlt` | パーティーのメンバー一覧。頭像の代替テキスト（読み上げのみ） | {name}（{class}） | {name} ({class}) | {name}（{class}） | `{name}` は表示名、`{class}` は職業名 |
| 21 | `avatar.rosterAltNone` | 同上。職業未選択のメンバー（空枠、読み上げのみ） | {name}（尚未選擇職業） | {name} (no class yet) | {name}（職業未選択） | `{name}` は表示名 |
| 22 | `avatar.saveFailed` | ダイアログ内のエラー。保存に失敗したとき | 職業還沒儲存，請稍後再試。 | Your class wasn't saved. Try again later. | 職業を保存できませんでした。しばらくしてからもう一度お試しください。 |  |

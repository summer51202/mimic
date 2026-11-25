# 公會 Phase：日文新字串審閱清單

- 狀態：累加中，尚未交給審閱者。
- 用語依據：`.tmp/2ib-ja-review-result.json` 的用語集（2I-b 上線後改看 `docs/i18n/glossary.md`）。
- 一般 UI 用です・ます體；ICU 複數只用 `other`。

| # | key | 使用位置 | zh-TW | en | ja（草稿） | 備註 |
|---|---|---|---|---|---|---|
| 1 | `shared.list.correctedTo` | 割り勘の支出リスト。訂正された支出の下に表示 | 已更正 {count} 次 · 更正後 <amount></amount> | Corrected {count, plural, one {once} other {# times}} · Now <amount></amount> | {count}回訂正済み · 訂正後 <amount></amount> | `<amount>` は金額（例 NT$1,200）。右側の大きな金額は元の記録のまま |
| 2 | `shared.list.correctedVoid` | 同上。最新の訂正で無効にした場合 | 已更正 {count} 次 · 已作廢 | Corrected {count, plural, one {once} other {# times}} · Voided | {count}回訂正済み · 無効 | 訂正フォームの「この支出を無効にする」に対応 |
| 3 | `shared.list.correctionReason` | 同上。2 行目 | 最新更正原因：<reason></reason> | Latest reason: <reason></reason> | 最新の訂正理由：<reason></reason> | `<reason>` はユーザーが入力した理由（長文あり） |

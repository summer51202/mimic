# PairFund Spec Review

Review date: 2026-04-04

## 高優先級發現

### 1. 結算完成後缺少「帳本版本 / 快照」定義

目前 spec 有 `period_start`、`period_end` 與 late entry confirmation，但沒有定義 settlement 是基於哪個 ledger 狀態計算。

風險：

* 舊支出被修改、刪除、還原後，系統難以判斷是否真的影響已完成結算
* 後續重新計算建議時，可能把已結清金額重複算回來

建議：

* 增加 `ledger_version` 或 settlement snapshot 概念
* settlement 建立時記錄 cutoff / snapshot
* 判斷 late entry 是否影響結算時，不只比日期，也比是否早於最近已完成結算的 snapshot

### 2. `pending_confirmations` 缺少 request 層，未來多人場景會失真

目前模型比較像「每個人各一筆待辦」，但沒有一個總體 confirmation request 代表同一事件。

風險：

* 三人群組時，無法清楚表達整體 request 狀態
* UI、audit、通知很難完整呈現「同一件事」的進度

建議：

* 拆成 `confirmation_requests` 與 `confirmation_approvals`
* request 層記錄觸發原因與整體狀態
* approval 層記錄每位 target user 的決策

### 3. 交易允許直接修改，但缺少敏感欄位的重新審核規則

文件有要求保留 audit log，但沒有定義哪些欄位修改只算文案變更，哪些會影響帳務與結算。

風險：

* 前後端對 confirmation 觸發條件會做出不同判斷
* audit 有紀錄，但產品行為不一致

建議：

* 加一張 mutation policy 表
* 明確區分 cosmetic 欄位與 financial-impact 欄位
* `amount`、`occurred_on`、`payers`、`splits`、`expense_type` 這類欄位變更要重算淨額與結算建議，並視條件重建 confirmation

### 4. 金額命名在 DB 與 API 間不一致

API 已採 `amount_minor`，但 schema 仍大量使用 `amount`、`fixed_amount`、`allocated_amount`。

風險：

* ORM model、DTO、前端型別與測試資料會一直做語意轉換
* 新進成員可能誤會 DB 儲存的是 major unit

建議：

* 全系統統一為 `_minor`
* 若 DB 不改名，至少在 spec 明確寫死所有 `amount` 欄位皆為 minor unit

## 中優先級建議

### 5. `expense_splits` 缺少同一 user 的重複約束策略

風險：

* 在非 hybrid 模式下，同一個 user 可能被重複分攤，造成語意混亂

建議：

* 明訂非 hybrid 模式時一個 user 僅能有一筆 split
* 若 hybrid 允許同 user 同時有 fixed 與 ratio，需明確定義 payload 與驗證規則

### 6. refund / adjustment 目前語意偏混合

風險：

* 難以分辨是基金現金流變化，還是對某成員 liability 的修正

建議：

* 補上 adjustment 子類型，或拆出 cashflow / liability 兩種效果定義

### 7. idempotency key 只出現在架構章節，未進入正式 API / schema

風險：

* 行動裝置重送時可能重複建立交易

建議：

* 在 API 通用規格補上 idempotency header / key 規則
* 規劃資料落點，例如 `idempotency_keys` table 或 middleware 儲存策略

### 8. 權限規則仍留白，會直接阻塞 MVP 實作

建議：

* MVP 先定硬規則
* 建議版本：任何成員可新增；建立者可編輯自己的交易；owner 可編輯任何交易；刪除與 restore 僅 owner 可執行

## 整體評價

這份 spec 的方向是好的，尤其在：

* 先把 payer 與 split participants 拆開
* 願意在 MVP 就保留 audit 與 late entry
* 提前為多人群組與 multi-payer 預留模型

最值得先補強的是三塊：

1. settlement 基準
2. confirmation 模型
3. 交易修改規則

把這三件事先定清楚，後面的 schema、API、service 切分會順很多。

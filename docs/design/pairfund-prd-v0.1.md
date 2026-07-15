# PairFund PRD / 規格文件 v0.1

## 1. 產品定位

### 產品名稱

暫定名稱：**PairFund（情侶共同基金）**

### 願景

PairFund 是一個支援 iOS、Android、Web 的共享理財產品，讓情侶或小型群體在不開設實體共同帳戶的前提下，管理虛擬共同基金。

### 核心價值

* 用「基金」概念取代單純分帳
* 清楚拆分投入、支出、代墊、結算
* 行動裝置優先，Web 做補強
* 操作簡單、低負擔，但帳務結構完整

### 目標族群

主要：

* 情侶（共同生活 / 約會 / 旅遊）

次要：

* 室友
* 家庭
* 小型旅遊團體

## 2. 問題與目標

### 現有工具痛點

現有分帳工具多聚焦在「誰欠誰多少」，但不擅長處理：

* 長期共同資金池
* 固定投入
* 多基金
* 累積餘額
* 代墊與基金概念分離

### 產品目標

使用者可以：

1. 建立共同群組
2. 建立基金
3. 記錄投入
4. 記錄支出
5. 查看基金餘額
6. 查看個人淨額與應付應收
7. 取得結算建議並完成結算
8. 在手機與網頁同步使用

### 成功指標

* 每組用戶記帳頻率
* 月活躍留存
* 結算完成率
* 錯帳 / 問題回報率

## 3. MVP 範圍

### 包含

* 註冊 / 登入 / 登出
* 建立群組 / 邀請成員
* 建立與封存基金
* 建立分類
* 記錄投入
* 記錄支出
* 顯示基金餘額與個人淨額
* 顯示結算建議
* 建立與完成結算紀錄
* 支出 / 投入 / 結算歷史
* 手機與 Web 支援

### 不包含

* 銀行串接
* 真實投資功能
* 收據圖片
* OCR
* 稅務
* AI 自動記帳

## 4. 核心領域模型

### Group

共享空間，通常是一對情侶，也可擴充為多人群組。

### Fund

虛擬共同基金，例如約會基金、旅遊基金、生活基金。

### Contribution

成員投入到基金的金額。

### Expense

基金用途的支出。

### Advance / Payer

現實中實際先付款的人。付款人不一定參與分攤。

### Settlement

根據淨部位計算出的最終補款紀錄。

## 5. 產品原則與商業規則

### 設計原則

1. 數據正確性優先
2. 記帳要快
3. 結果要好懂
4. 帳務要可追蹤
5. 跨平台一致

### 商業規則

* 只有成員可以查看群組與基金資料
* 每筆支出的分攤總和必須等於支出金額
* 比例分攤需驗證比例總和，必要時可 normalization
* 混合分攤需先扣固定金額，再對剩餘金額依比例分攤
* 分攤參與者可只列實際參與者，未列入者視為不參與
* payer 與 split participants 必須分離
* 基金可封存
* 財務資料應採 soft delete
* 結算不可直接修改
* refund / 折讓應以獨立交易或調整紀錄處理
* 需定義 rounding 規則
* fund expense 與 personal expense 需分離，MVP 以拆兩筆交易處理
* late entry 採滾動模型，但若影響已結算內容，需警示並要求確認

## 6. 重要邊界情境

* 金額輸入錯誤
* 結算後補登舊資料
* refund / adjustment
* 餘額為負
* 同步衝突
* payer 不等於 split participant
* 僅部分成員參與支出
* hybrid split
* multi-payer 後續擴充
* personal expense 與 fund expense 拆分
* rounding 尾差處理

## 7. 功能需求

### 帳號

* 註冊
* 登入
* 登出
* 更新個人資料

### 群組

* 建立群組
* 邀請成員
* 取得成員列表

### 基金

* 建立基金
* 編輯基金
* 設定幣別
* 封存 / 取消封存

### 投入

* 新增投入
* 修改投入
* 軟刪除投入
* 查詢投入歷史

### 支出

* 新增支出
* 修改支出
* 軟刪除與還原支出
* 支援 `equal` / `ratio` / `fixed` / `hybrid` split
* split participants 可只列參與者
* payer 與 split participants 分離
* 資料模型預留 multi-payer

### 餘額與狀態

* 基金餘額
* 個人投入
* 個人代墊
* 個人應付 / 應收

### 結算

* 顯示結算建議
* 建立結算紀錄
* 標記完成
* 取消結算

### 紀錄與首頁

* 最近活動
* 支出 / 投入 / 結算歷史
* 待確認事項
* Dashboard / Summary

## 8. Database 設計摘要

### 設計原則

* 主交易表與 audit log 分離
* payer 與 split 分離
* split 模型可擴充
* MVP 前台單 payer，DB 預留 multi-payer
* late entry 需能進入確認流程
* 財務刪除以 soft delete 為主

### 建議資料表

核心帳號 / 群組：

* `users`
* `groups`
* `group_members`
* `group_invites`

基金 / 分類：

* `funds`
* `categories`

帳務：

* `contributions`
* `expenses`
* `expense_payers`
* `expense_splits`
* `settlements`
* `recurring_contribution_rules`

審核 / 歷史：

* `pending_confirmations`
* `audit_logs`

### 關鍵欄位設計

* 金額建議以 `bigint` 儲存最小貨幣單位
* `expenses` 包含 `split_mode`、`expense_type`、`confirmation_status`、`late_entry_flag`
* `expense_payers` 用於支援未來 multi-payer
* `expense_splits` 保存 ratio / fixed / allocated amount 與 `sort_order`
* `settlements` 保存基金層結算與期間資訊
* `pending_confirmations` 用於 late entry / sensitive edit
* `audit_logs` 保存 create / update / delete / restore / approve / complete 等操作歷史

### 計算邏輯

基金餘額：

```text
fund_balance =
  sum(active contributions)
  - sum(active fund_expense)
  + sum(active refund)
  ± adjustments
```

個人淨部位：

```text
member_position =
  contributions_by_user
  + payments_by_user
  - allocated_expense_share_by_user
  - settlements_sent
  + settlements_received
```

### Rounding

* 金額統一用最小貨幣單位
* ratio 導致尾差時，前 N-1 位先標準 rounding，最後一位承接差額
* 以 `sort_order` 保證結果可重現

## 9. API 設計摘要

### API 原則

* REST API + JSON
* Base URL: `/api/v1`
* App 與 Web 共用同一套 API
* 金額統一用 `amount_minor`
* 關鍵操作需寫 audit log
* late entry 與 sensitive edit 需進 confirmation flow

### Auth

* `POST /auth/register`
* `POST /auth/login`
* `POST /auth/refresh`
* `POST /auth/logout`
* `GET /me`
* `PATCH /me`

### Group / Fund / Category

* `POST /groups`
* `GET /groups`
* `GET /groups/{groupId}`
* `PATCH /groups/{groupId}`
* `GET /groups/{groupId}/members`
* `POST /groups/{groupId}/invites`
* `POST /group-invites/accept`
* `POST /groups/{groupId}/funds`
* `GET /groups/{groupId}/funds`
* `GET /funds/{fundId}`
* `PATCH /funds/{fundId}`
* `POST /funds/{fundId}/archive`
* `POST /funds/{fundId}/unarchive`
* `GET /groups/{groupId}/categories`
* `POST /groups/{groupId}/categories`
* `PATCH /categories/{categoryId}`
* `POST /categories/{categoryId}/archive`

### Contributions / Expenses / Settlements

* `POST /funds/{fundId}/contributions`
* `GET /funds/{fundId}/contributions`
* `GET /contributions/{contributionId}`
* `PATCH /contributions/{contributionId}`
* `DELETE /contributions/{contributionId}`
* `POST /funds/{fundId}/expenses`
* `GET /funds/{fundId}/expenses`
* `GET /expenses/{expenseId}`
* `PATCH /expenses/{expenseId}`
* `DELETE /expenses/{expenseId}`
* `POST /expenses/{expenseId}/restore`
* `GET /funds/{fundId}/settlement-suggestion`
* `POST /funds/{fundId}/settlements`
* `GET /funds/{fundId}/settlements`
* `GET /settlements/{settlementId}`
* `POST /settlements/{settlementId}/complete`
* `POST /settlements/{settlementId}/cancel`

### Recurring / Confirmation / Audit / Summary

* `POST /funds/{fundId}/recurring-rules`
* `GET /funds/{fundId}/recurring-rules`
* `PATCH /recurring-rules/{ruleId}`
* `POST /recurring-rules/{ruleId}/pause`
* `POST /recurring-rules/{ruleId}/resume`
* `POST /recurring-rules/{ruleId}/end`
* `GET /confirmations`
* `GET /confirmations/{confirmationId}`
* `POST /confirmations/{confirmationId}/approve`
* `POST /confirmations/{confirmationId}/reject`
* `GET /audit-logs`
* `GET /audit-logs/{logId}`
* `GET /groups/{groupId}/dashboard`
* `GET /funds/{fundId}/summary`

### 驗證與錯誤碼

* payers 不可為空
* splits 不可為空
* payers 總和 = 支出金額
* splits 計算後總和 = 支出金額
* payer / split user 必須屬於 fund 所屬 group
* `from_user_id != to_user_id`
* 常用錯誤碼：`VALIDATION_ERROR`、`SPLIT_TOTAL_MISMATCH`、`PAYER_TOTAL_MISMATCH`、`CONFIRMATION_REQUIRED`、`FUND_ARCHIVED`、`CONFLICT`

## 10. 技術架構

### 版本 A

* Mobile App：Flutter
* Web：Next.js
* Backend：NestJS
* Database：PostgreSQL
* ORM：Prisma
* App State：Riverpod
* Web Data：TanStack Query
* Web Form：React Hook Form + Zod
* App HTTP：Dio
* Auth：JWT + Refresh Token
* Monitoring：Sentry
* Analytics：PostHog

### 架構原則

* 三端共用後端 API 與資料模型
* 帳務與結算規則集中在後端
* 後端採模組化與可測試的 domain utilities

### 建議後端模組

* AuthModule
* UserModule
* GroupModule
* InviteModule
* FundModule
* CategoryModule
* ContributionModule
* ExpenseModule
* SettlementModule
* ConfirmationModule
* RecurringContributionModule
* AuditLogModule
* DashboardModule
* NotificationModule

### 一致性與同步策略

* 關鍵帳務操作用 DB transaction
* expense / payers / splits 同 transaction
* settlement create / complete 同 transaction
* confirmation 狀態變更需寫 audit
* MVP 採 online-first，不做完整 offline-first
* 建議支援 idempotency key 以避免重送重複入帳

### 通知與排程

* 固定投入提醒
* 待確認事項提醒
* 結算相關提醒
* Scheduler 可採 NestJS scheduler / cron
* Push 可採 FCM

### 測試重點

* split 與 rounding
* settlement calculator
* late entry + confirmation
* payer 不參與 split
* refund / adjustment
* soft delete / restore

## 11. 已確認方向

* 語言：繁中優先
* 產品定位：底層支援多人，第一版前台文案與 UX 偏情侶
* 固定投入：提醒後由使用者人工確認入帳
* 交易允許直接修改，但需保留完整歷史
* 結算層級：MVP 先做基金層
* 不做收據圖片與 OCR

## 12. 下一步

1. 補齊 schema 細節與 constraint 策略
2. 補齊 API request / response 範例與欄位定義
3. 補技術架構的專案目錄與 module 切法
4. 明確定義 confirmation flow 與 settlement 邊界

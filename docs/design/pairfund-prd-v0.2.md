# PairFund PRD / 規格文件 v0.2

## 1. 產品概述

### 產品名稱

暫定名稱：**PairFund（情侶共同基金）**

### 產品願景

PairFund 是一個支援 iOS / Android / Web 的共享理財 App，讓情侶或小型群體在不開設實體共同帳戶的前提下，管理「虛擬共同基金」。

它協助使用者：

* 共同投入資金
* 記錄共同支出
* 管理代墊關係
* 清楚知道誰該補誰多少
* 用結算區間管理歷史帳務

### 支援平台

* iOS App
* Android App
* Web 網頁版

### 產品目標

打造一個：

* 比分帳 App 更有結構
* 比完整理財軟體更輕量
* 適合日常使用的共同資金管理工具
* 在帳務上具備清楚的結算與鎖帳規則

### 目標用戶

主要：

* 情侶（共同生活 / 約會 / 旅遊）

次要：

* 室友
* 家庭
* 小型旅遊團體

### 核心價值

* 以「基金」概念取代單純分帳
* 清楚區分：投入 / 支出 / 代墊 / 結算 / 修正
* 行動裝置優先，網頁輔助
* 操作簡單、低負擔
* 結算後帳務不可被任意改動

---

## 2. 問題定義

現有分帳工具大多只處理：
「誰欠誰多少」

但無法良好支援：

* 長期共同資金池
* 每月固定投入
* 多基金管理（旅遊 / 約會 / 生活）
* 累積餘額
* 代墊與基金概念分離
* 結算後歷史帳務的穩定性

本產品要解決的是：
建立「虛擬共同基金」與「結算後鎖帳」的完整模型。

---

## 3. 產品目標與成功指標

### 商業目標

* 推出穩定 MVP
* 建立可擴展帳務架構
* 支援雙人優先、多人可擴充的使用場景

### 使用者目標

使用者可以：

1. 建立共同群組
2. 建立基金
3. 記錄投入
4. 記錄支出
5. 查看餘額
6. 查看誰該補誰
7. 發起定期或主動結算
8. 在發現舊帳問題時，用新交易修正歷史結果
9. 在手機與網頁同步使用

### 成功指標

* 每組用戶的記帳頻率
* 留存率（每月活躍）
* 結算完成率
* 錯帳 / 問題回報率低
* 已結算資料被回頭改動的爭議率低

---

## 4. 產品範圍

### MVP 包含

* 登入系統
* 建立群組 / 邀請
* 多 owner / member 角色
* 建立基金
* 記錄投入
* 記錄支出
* 分類
* 餘額顯示
* 個人淨額
* 結算建議
* 結算紀錄
* 修正類型交易
* 已結算區間鎖帳
* 手機 + 網頁支援

### MVP 不包含

* 銀行串接
* 投資功能
* OCR 收據
* 稅務
* AI 自動記帳
* 複雜爭議處理流程

---

## 5. 核心概念

### 群組（Group）

一個共享空間，通常是一對情侶，但底層支援多人。

### 成員角色（Role）

* `owner`：可複數，負責群組管理、基金管理、結算流程與未結算區交易管理
* `member`：一般成員

### 基金（Fund）

一個資金池，例如：

* 約會基金
* 旅遊基金
* 生活基金

### 投入（Contribution）

往基金裡放錢。

### 支出（Expense）

基金用途的花費。

### 代墊（Advance / Payer）

現實中由某人先付款。付款人不代表一定參與分攤。

### 結算（Settlement）

根據某一段期間的帳務狀態，產生誰補誰的紀錄。結算完成後，該結算覆蓋的區間視為已鎖定。

### 修正交易（Correction）

當已結算區間內的舊資料有錯，不允許直接回改原交易，而是新增一筆獨立交易處理修正。使用者需在標題或備註中自行說明原因。

---

## 6. 產品設計原則

1. **數據正確性優先**
2. **記帳要快**
3. **結果要好懂（人話）**
4. **帳務要可追蹤**
5. **跨平台一致**
6. **已結算資料不可被任意修改**

---

## 7. 功能需求

### 7.1 帳號系統

* 註冊
* 登入
* 登出
* 取得個人資料
* 更新個人資料

### 7.2 群組

* 建立群組
* 邀請成員
* 查看成員
* 設定角色
* 支援多 owner

### 7.3 基金

* 建立基金
* 編輯名稱
* 設定幣別
* 封存

### 7.4 投入

* 新增投入
* 修改投入
* 軟刪除投入
* 查詢投入紀錄

### 7.5 支出

* 新增支出
* 修改支出
* 軟刪除支出
* 還原支出
* 金額 / 類別 / 付款人
* 分攤方式：
  * 平分
  * 比例
  * 指定金額
  * 混合分攤（固定金額 + 比例）
* 分攤參與者可只列實際參與者
* payer 與 split participants 分離
* 後端資料模型需預留 multi-payer 擴充能力，MVP 前台可先只做單一 payer

### 7.6 修正交易

* 新增修正類型交易
* 修正交易為獨立交易，不強制連結原交易
* 使用者需在標題或備註自行說明修正原因
* 修正交易可用於修正舊支出、舊投入或已結算期間的差異

### 7.7 餘額與個人狀態

顯示：

* 基金餘額
* 個人投入
* 個人代墊
* 個人應付 / 應收

### 7.8 結算

* 顯示建議結算
* 建立結算紀錄
* 標記完成
* 支援定期結算
* 支援使用者主動結算
* 結算完成後，覆蓋區間進入鎖定狀態

### 7.9 紀錄

* 支出 / 投入 / 結算歷史
* 修正交易歷史

### 7.10 首頁

* 餘額
* 最近紀錄
* 應付應收
* 待結算資訊

---

## 8. 商業規則

* 只有成員可看資料
* 每筆支出分攤總和 = 支出金額
* 比例分攤時，比例總和需可驗證，必要時可自動 normalization
* 混合分攤時，需先扣除固定金額，再對剩餘金額依比例分攤
* 分攤可只列實際參與者，未列入者視為不參與該筆支出
* 付款人與分攤對象需分離
* 基金可封存
* 不允許隨意刪除帳務，建議 soft delete
* 結算不可直接修改
* 退款 / 折讓不建議直接修改原交易，應以獨立交易或修正交易處理
* 金額分攤必須定義 rounding 規則
* fund expense 與 personal expense 需明確分離；MVP 建議拆成兩筆交易處理
* 已結算區間內的交易不可修改、刪除、還原
* 若已結算區間的舊帳有問題，必須新增一筆獨立修正交易，不可回改原交易
* `owner` 可管理任何未結算區間內的交易
* `owner` 可複數
* 已結算區間的鎖定規則對所有角色一致，包含 owner

---

## 9. 邊界情境

* 金額輸入錯誤
* 結算後發現舊資料有誤
* 退款
* 分手 / 群組結束
* 餘額為負
* 同步衝突
* 付款人不等於分攤對象
* 某些成員不參與某筆支出
* 混合分攤（固定金額 + 比例）
* 多付款人（後續擴充）
* 個人支出與基金支出需拆分處理
* 比例與金額分攤導致尾差的 rounding 問題
* 已結算區間內發現帳務錯誤，需用修正交易處理

---

## 10. 使用流程

### 初次使用

1. 註冊
2. 建群組
3. 建基金
4. 邀請另一半
5. 開始記帳

### 日常使用

1. 開 app
2. 新增支出 / 投入
3. 查看餘額

### 結算流程

1. 查看結算建議
2. 發起定期或主動結算
3. 標記完成
4. 系統鎖定已結算區間

### 發現舊帳問題

1. 查看原交易
2. 由使用者新增一筆修正交易
3. 在標題或備註寫明原因
4. 修正交易影響目前淨額與後續結算，但不回改已完成結算的原始資料

---

## 11. 開發階段

### Phase 1

* 核心記帳
* 基金層結算
* 已結算區間鎖帳
* 修正交易
* 手機 + Web

### Phase 2

* 固定投入
* 通知
* 報表

### Phase 3

* 多幣別
* 匯出
* 語音輸入記帳

---

## 12. 已確認需求

1. 語言：**繁中優先**
2. 產品定位：**底層支援多人，但第一版 UX / 文案以情侶情境優先**
3. 固定投入：**支援**，但採用「到期提示 + 使用者人工確認入帳」模式，不做全自動入帳
4. 交易修改：**允許直接修改交易，但僅限未結算區間**
5. 結算層級：**MVP 先做基金層**
6. 收據圖片與 OCR：**初版不支援**
7. 已結算區間：**完全鎖定，不允許任何角色直接修改**
8. 舊帳修正方式：**新增獨立修正交易**
9. owner：**可複數**

---

## 13. MVP 建議

* 語言：繁中優先
* 產品：底層資料模型支援多人，但第一版 UX / 文案以情侶情境優先
* 單一幣別
* 支援固定投入，但採「提醒建立紀錄」模式，不做全自動記帳
* UI 可直接編輯未結算區交易，但底層需保留操作歷史
* 結算先做基金層
* 支出分攤支援：平分 / 比例 / 指定金額 / 混合分攤
* 分攤參與者可不包含所有成員
* payer 與 split participants 分離
* schema 預留 multi-payer 能力
* 不做收據圖片
* 不做 OCR
* 已結算區間採嚴格鎖帳
* 舊帳異常以獨立修正交易處理

---

## 14. Database Schema（v0.2 詳細版）

本章節以「前台情侶優先、底層支援多人」與「結算後鎖帳」為前提設計。

### 14.1 設計原則

1. **交易資料與操作紀錄分離**
2. **payer 與 split 分離**
3. **split 可擴充**
4. **MVP 先做單一 payer UI，但 DB 預留 multi-payer**
5. **已結算區間資料不可回改**
6. **修正必須用新交易表達**
7. **financial delete 優先 soft delete**

### 14.2 Prisma Enum 草案

```prisma
enum UserStatus {
  ACTIVE
  DISABLED
}

enum GroupType {
  COUPLE
  GROUP
}

enum GroupStatus {
  ACTIVE
  ARCHIVED
}

enum MemberRole {
  OWNER
  MEMBER
}

enum MemberStatus {
  ACTIVE
  LEFT
  REMOVED
}

enum InviteStatus {
  PENDING
  ACCEPTED
  EXPIRED
  REVOKED
}

enum FundStatus {
  ACTIVE
  ARCHIVED
}

enum CategoryType {
  EXPENSE
}

enum CategoryStatus {
  ACTIVE
  ARCHIVED
}

enum RecordStatus {
  ACTIVE
  DELETED
}

enum ContributionType {
  REGULAR
  ONE_TIME
  ADJUSTMENT
  CORRECTION
}

enum ExpenseSplitMode {
  EQUAL
  RATIO
  FIXED
  HYBRID
}

enum ExpenseType {
  FUND_EXPENSE
  REFUND
  ADJUSTMENT
  CORRECTION
}

enum SplitType {
  EQUAL
  RATIO
  FIXED
}

enum SettlementStatus {
  PENDING
  COMPLETED
  CANCELED
}

enum SettlementType {
  SCHEDULED
  MANUAL
}

enum RecurringRuleStatus {
  ACTIVE
  PAUSED
  ENDED
}

enum AuditEntityType {
  GROUP
  FUND
  CATEGORY
  CONTRIBUTION
  EXPENSE
  SETTLEMENT
  RECURRING_RULE
  GROUP_MEMBER
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
  RESTORE
  COMPLETE
  CANCEL
  ARCHIVE
  UNARCHIVE
  ROLE_CHANGE
}
```

### 14.3 資料表總覽

核心帳號 / 群組：

* `users`
* `groups`
* `group_members`
* `group_invites`

基金 / 分類：

* `funds`
* `categories`

金流 / 帳務：

* `contributions`
* `expenses`
* `expense_payers`
* `expense_splits`
* `settlements`
* `recurring_contribution_rules`

操作紀錄：

* `audit_logs`

### 14.4 Prisma Model 草案

以下為 Prisma schema 草案，重點在模型邊界、欄位命名與關聯方向；實際欄位型別可依 Prisma / PostgreSQL 版本微調。

```prisma
model User {
  id            String     @id @default(uuid()) @db.Uuid
  email         String     @unique @db.VarChar(255)
  passwordHash  String     @map("password_hash") @db.VarChar(255)
  displayName   String     @map("display_name") @db.VarChar(100)
  avatarUrl     String?    @map("avatar_url") @db.VarChar(500)
  locale        String     @default("zh-TW") @db.VarChar(20)
  timezone      String     @default("Asia/Taipei") @db.VarChar(100)
  status        UserStatus @default(ACTIVE)
  createdAt     DateTime   @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt     DateTime   @updatedAt @map("updated_at") @db.Timestamptz(6)
}

model Group {
  id              String      @id @default(uuid()) @db.Uuid
  name            String      @db.VarChar(100)
  groupType       GroupType   @map("group_type")
  defaultCurrency String      @map("default_currency") @db.VarChar(3)
  status          GroupStatus @default(ACTIVE)
  createdById     String      @map("created_by") @db.Uuid
  createdAt       DateTime    @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt       DateTime    @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@map("groups")
  @@index([createdById])
}

model GroupMember {
  id         String       @id @default(uuid()) @db.Uuid
  groupId    String       @map("group_id") @db.Uuid
  userId     String       @map("user_id") @db.Uuid
  role       MemberRole
  status     MemberStatus @default(ACTIVE)
  joinedAt   DateTime     @default(now()) @map("joined_at") @db.Timestamptz(6)
  createdAt  DateTime     @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt  DateTime     @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@map("group_members")
  @@unique([groupId, userId])
  @@index([groupId])
  @@index([userId])
  @@index([groupId, role, status])
}

model GroupInvite {
  id           String       @id @default(uuid()) @db.Uuid
  groupId      String       @map("group_id") @db.Uuid
  inviteCode   String       @unique @map("invite_code") @db.VarChar(64)
  invitedById  String       @map("invited_by") @db.Uuid
  invitedEmail String?      @map("invited_email") @db.VarChar(255)
  expiresAt    DateTime     @map("expires_at") @db.Timestamptz(6)
  status       InviteStatus @default(PENDING)
  acceptedById String?      @map("accepted_by") @db.Uuid
  acceptedAt   DateTime?    @map("accepted_at") @db.Timestamptz(6)
  createdAt    DateTime     @default(now()) @map("created_at") @db.Timestamptz(6)

  @@map("group_invites")
  @@index([groupId, status])
}

model Fund {
  id          String     @id @default(uuid()) @db.Uuid
  groupId     String     @map("group_id") @db.Uuid
  name        String     @db.VarChar(100)
  currency    String     @db.VarChar(3)
  status      FundStatus @default(ACTIVE)
  archivedAt  DateTime?  @map("archived_at") @db.Timestamptz(6)
  createdById String     @map("created_by") @db.Uuid
  createdAt   DateTime   @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime   @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@map("funds")
  @@index([groupId, status])
}

model Category {
  id         String         @id @default(uuid()) @db.Uuid
  groupId    String?        @map("group_id") @db.Uuid
  name       String         @db.VarChar(100)
  type       CategoryType   @default(EXPENSE)
  sortOrder  Int            @default(0) @map("sort_order")
  isDefault  Boolean        @default(false) @map("is_default")
  status     CategoryStatus @default(ACTIVE)
  createdAt  DateTime       @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt  DateTime       @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@map("categories")
  @@index([groupId, status, sortOrder])
}

model Contribution {
  id                String           @id @default(uuid()) @db.Uuid
  fundId            String           @map("fund_id") @db.Uuid
  contributorUserId String           @map("contributor_user_id") @db.Uuid
  amountMinor       BigInt           @map("amount_minor")
  contributionType  ContributionType @map("contribution_type")
  note              String?          @db.Text
  occurredOn        DateTime         @map("occurred_on") @db.Date
  status            RecordStatus     @default(ACTIVE)
  createdById       String           @map("created_by") @db.Uuid
  updatedById       String           @map("updated_by") @db.Uuid
  deletedById       String?          @map("deleted_by") @db.Uuid
  deletedAt         DateTime?        @map("deleted_at") @db.Timestamptz(6)
  createdAt         DateTime         @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt         DateTime         @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@map("contributions")
  @@index([fundId, occurredOn, status])
  @@index([contributorUserId, status])
}

model Expense {
  id           String           @id @default(uuid()) @db.Uuid
  fundId       String           @map("fund_id") @db.Uuid
  categoryId   String?          @map("category_id") @db.Uuid
  title        String           @db.VarChar(200)
  note         String?          @db.Text
  amountMinor  BigInt           @map("amount_minor")
  splitMode    ExpenseSplitMode @map("split_mode")
  expenseType  ExpenseType      @map("expense_type")
  occurredOn   DateTime         @map("occurred_on") @db.Date
  status       RecordStatus     @default(ACTIVE)
  createdById  String           @map("created_by") @db.Uuid
  updatedById  String           @map("updated_by") @db.Uuid
  deletedById  String?          @map("deleted_by") @db.Uuid
  deletedAt    DateTime?        @map("deleted_at") @db.Timestamptz(6)
  createdAt    DateTime         @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime         @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@map("expenses")
  @@index([fundId, occurredOn, status])
  @@index([categoryId])
  @@index([expenseType, status])
}

model ExpensePayer {
  id          String   @id @default(uuid()) @db.Uuid
  expenseId   String   @map("expense_id") @db.Uuid
  payerUserId String   @map("payer_user_id") @db.Uuid
  amountMinor BigInt   @map("amount_minor")
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@map("expense_payers")
  @@index([expenseId])
  @@index([payerUserId])
}

model ExpenseSplit {
  id                   String    @id @default(uuid()) @db.Uuid
  expenseId            String    @map("expense_id") @db.Uuid
  userId               String    @map("user_id") @db.Uuid
  splitType            SplitType @map("split_type")
  ratioValue           Decimal?  @map("ratio_value") @db.Decimal(10, 6)
  fixedAmountMinor     BigInt?   @map("fixed_amount_minor")
  allocatedAmountMinor BigInt    @map("allocated_amount_minor")
  sortOrder            Int       @default(0) @map("sort_order")
  createdAt            DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt            DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@map("expense_splits")
  @@index([expenseId, sortOrder])
  @@index([userId])
}

model Settlement {
  id             String           @id @default(uuid()) @db.Uuid
  fundId         String           @map("fund_id") @db.Uuid
  fromUserId     String           @map("from_user_id") @db.Uuid
  toUserId       String           @map("to_user_id") @db.Uuid
  amountMinor    BigInt           @map("amount_minor")
  periodStart    DateTime?        @map("period_start") @db.Date
  periodEnd      DateTime?        @map("period_end") @db.Date
  status         SettlementStatus @default(PENDING)
  settlementType SettlementType   @map("settlement_type")
  note           String?          @db.Text
  completedAt    DateTime?        @map("completed_at") @db.Timestamptz(6)
  canceledAt     DateTime?        @map("canceled_at") @db.Timestamptz(6)
  createdById    String           @map("created_by") @db.Uuid
  createdAt      DateTime         @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt      DateTime         @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@map("settlements")
  @@index([fundId, status])
  @@index([fundId, periodStart, periodEnd])
  @@index([fromUserId, status])
  @@index([toUserId, status])
}

model RecurringContributionRule {
  id             String               @id @default(uuid()) @db.Uuid
  fundId         String               @map("fund_id") @db.Uuid
  userId         String               @map("user_id") @db.Uuid
  amountMinor    BigInt               @map("amount_minor")
  frequency      String               @db.VarChar(20)
  dayOfMonth     Int                  @map("day_of_month")
  startDate      DateTime             @map("start_date") @db.Date
  endDate        DateTime?            @map("end_date") @db.Date
  status         RecurringRuleStatus  @default(ACTIVE)
  lastPromptedAt DateTime?            @map("last_prompted_at") @db.Timestamptz(6)
  createdById    String               @map("created_by") @db.Uuid
  createdAt      DateTime             @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt      DateTime             @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@map("recurring_contribution_rules")
  @@index([fundId, status])
  @@index([userId, status])
}

model AuditLog {
  id             String          @id @default(uuid()) @db.Uuid
  groupId        String?         @map("group_id") @db.Uuid
  fundId         String?         @map("fund_id") @db.Uuid
  actorUserId    String          @map("actor_user_id") @db.Uuid
  entityType     AuditEntityType @map("entity_type")
  entityId       String          @map("entity_id") @db.Uuid
  action         AuditAction
  beforeSnapshot Json?           @map("before_snapshot")
  afterSnapshot  Json?           @map("after_snapshot")
  metadata       Json?
  createdAt      DateTime        @default(now()) @map("created_at") @db.Timestamptz(6)

  @@map("audit_logs")
  @@index([entityType, entityId])
  @@index([actorUserId, createdAt])
  @@index([groupId, createdAt])
  @@index([fundId, createdAt])
}
```

### 14.5 重要 schema 約束與實作備註

這些約束不一定全部由 Prisma 直接表達，部分需要在 service / DB transaction 層驗證：

* `sum(expense_payers.amount_minor) = expenses.amount_minor`
* `sum(expense_splits.allocated_amount_minor) = expenses.amount_minor`
* `ratio` 模式時 `ratio_value` 必填
* `fixed` 模式時 `fixed_amount_minor` 必填
* 非 hybrid 模式建議限制同一 `expense_id + user_id` 僅一筆 split
* `from_user_id != to_user_id`
* 所有 payer / split / contributor / settlement user 都必須屬於 fund 所在 group
* 修改、刪除、還原交易前，必須先檢查 settled period lock

### 14.6 鎖帳判斷規則

後端需定義通用函式：

```text
is_locked(fund_id, occurred_on) =
  exists completed settlement
  where settlement.fund_id = fund_id
    and occurred_on between settlement.period_start and settlement.period_end
```

實務規則：

* `Contribution.occurred_on`、`Expense.occurred_on` 落在任何已完成結算區間內，即視為 locked
* locked record 不允許 `PATCH`
* locked record 不允許 `DELETE`
* locked record 不允許 `RESTORE`
* correction 交易仍是一般交易，只要 `occurred_on` 落在未鎖定區間即可新增

### 14.7 重要 schema 調整

#### group_members

* `role` 支援 `owner` / `member`
* 同一 group 可有多位 owner

#### contributions

建議欄位：

* `amount_minor`
* `contribution_type`: `regular` / `one_time` / `adjustment` / `correction`
* `occurred_on`
* `status`

#### expenses

建議欄位：

* `amount_minor`
* `split_mode`: `equal` / `ratio` / `fixed` / `hybrid`
* `expense_type`: `fund_expense` / `refund` / `adjustment` / `correction`
* `occurred_on`
* `status`

#### expense_payers

* `amount_minor`

#### expense_splits

* `fixed_amount_minor`
* `allocated_amount_minor`
* `ratio_value`
* `sort_order`

#### settlements

用途：結算紀錄與鎖帳邊界。

建議欄位：

* `fund_id`
* `from_user_id`
* `to_user_id`
* `amount_minor`
* `period_start`
* `period_end`
* `status`: `pending` / `completed` / `canceled`
* `settlement_type`: `scheduled` / `manual`
* `completed_at`

設計說明：

* 每筆 completed settlement 代表其所屬 fund 在該區間已有正式結算紀錄
* 已完成結算覆蓋的區間需作為交易修改限制的判斷依據
* 修改、刪除、還原交易前，後端需檢查該交易的 `occurred_on` 是否落在已結算區間內

### 14.4 計算邏輯建議

基金餘額：

```text
fund_balance =
  sum(active contributions.amount_minor)
  - sum(active expenses.amount_minor where expense_type = fund_expense)
  + sum(active expenses.amount_minor where expense_type = refund)
  ± adjustments/corrections
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

### 14.5 Rounding 規則建議

* 金額一律用最小貨幣單位儲存
* ratio 計算後若出現尾差，採：
  1. 先對前 N-1 位分攤者做標準 rounding
  2. 最後一位分攤者承接剩餘差額
* split 明細保留 `sort_order`

---

## 15. API Spec（v0.2 摘要）

### 15.1 API 設計原則

1. **資源導向**
2. **前後端共用同一套 API**
3. **金額統一使用 `amount_minor`**
4. **所有重要操作需保留歷史**
5. **已結算區間不允許修改、刪除、還原**
6. **修正以新增 correction 類型交易處理**

### 15.2 通用規格

* Base URL：`/api/v1`
* Auth：JWT access token + refresh token
* 日期：`YYYY-MM-DD`
* 時間：ISO 8601

### 15.3 重要資源

Auth：

* `POST /auth/register`
* `POST /auth/login`
* `POST /auth/refresh`
* `POST /auth/logout`
* `GET /me`
* `PATCH /me`

Groups / Funds / Categories：

* `POST /groups`
* `GET /groups`
* `GET /groups/{groupId}`
* `PATCH /groups/{groupId}`
* `GET /groups/{groupId}/members`
* `PATCH /groups/{groupId}/members/{memberId}`
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

Contributions / Expenses：

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

Settlements：

* `GET /funds/{fundId}/settlement-suggestion`
* `POST /funds/{fundId}/settlements`
* `GET /funds/{fundId}/settlements`
* `GET /settlements/{settlementId}`
* `POST /settlements/{settlementId}/complete`
* `POST /settlements/{settlementId}/cancel`

Recurring / Audit / Summary：

* `POST /funds/{fundId}/recurring-rules`
* `GET /funds/{fundId}/recurring-rules`
* `PATCH /recurring-rules/{ruleId}`
* `POST /recurring-rules/{ruleId}/pause`
* `POST /recurring-rules/{ruleId}/resume`
* `POST /recurring-rules/{ruleId}/end`
* `GET /audit-logs`
* `GET /audit-logs/{logId}`
* `GET /groups/{groupId}/dashboard`
* `GET /funds/{fundId}/summary`

### 15.4 核心 API 規則

#### 建立修正交易

* 使用既有 contribution / expense create API
* 透過 `contribution_type = correction` 或 `expense_type = correction` 表示
* 不要求 `related_transaction_id`
* 由使用者在 `title` 或 `note` 自行說明修正原因

#### 鎖帳限制

* 若交易 `occurred_on` 落在已完成結算的區間內：
  * `PATCH` 不允許
  * `DELETE` 不允許
  * `RESTORE` 不允許
* API 應回傳錯誤：
  * `SETTLED_PERIOD_LOCKED`

#### 權限

* `member` 可查看自己所在 group / fund
* `member` 可新增未結算區間內的交易
* `member` 可修改自己建立、且尚未落入已結算區間的交易
* `owner` 可管理 group 基本設定
* `owner` 可邀請成員與調整角色
* `owner` 可修改任何未結算區間內的交易
* 已結算區間的鎖定規則對 `owner` 與 `member` 一致

### 15.5 錯誤碼建議

* `UNAUTHORIZED`
* `FORBIDDEN`
* `NOT_FOUND`
* `VALIDATION_ERROR`
* `SPLIT_TOTAL_MISMATCH`
* `PAYER_TOTAL_MISMATCH`
* `INVALID_SPLIT_MODE`
* `FUND_ARCHIVED`
* `MEMBER_NOT_IN_GROUP`
* `SETTLEMENT_ALREADY_COMPLETED`
* `RESOURCE_ALREADY_DELETED`
* `SETTLED_PERIOD_LOCKED`
* `CONFLICT`

### 15.6 補充：主要 API Request / Response 草案

#### POST /auth/register

Request:

```json
{
  "email": "user@example.com",
  "password": "your_password",
  "display_name": "Edward"
}
```

Response:

```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "display_name": "Edward",
      "locale": "zh-TW",
      "timezone": "Asia/Taipei"
    },
    "access_token": "jwt",
    "refresh_token": "jwt"
  }
}
```

#### POST /groups

```json
{
  "name": "我們的小基金",
  "group_type": "couple",
  "default_currency": "TWD"
}
```

#### PATCH /groups/{groupId}/members/{memberId}

```json
{
  "role": "owner"
}
```

規則：

* 僅 owner 可操作
* 可有複數 owner
* 建議禁止把最後一位 owner 降權

#### POST /funds/{fundId}/contributions

一般投入：

```json
{
  "contributor_user_id": "user_uuid",
  "amount_minor": 5000,
  "contribution_type": "one_time",
  "occurred_on": "2026-04-05",
  "note": "四月投入"
}
```

修正投入：

```json
{
  "contributor_user_id": "user_uuid",
  "amount_minor": -500,
  "contribution_type": "correction",
  "occurred_on": "2026-04-05",
  "note": "修正三月多記投入"
}
```

#### POST /funds/{fundId}/expenses

一般支出：

```json
{
  "title": "晚餐",
  "category_id": "category_uuid",
  "note": "聚餐",
  "amount_minor": 1000,
  "split_mode": "hybrid",
  "expense_type": "fund_expense",
  "occurred_on": "2026-04-05",
  "payers": [
    {
      "payer_user_id": "user_a",
      "amount_minor": 1000
    }
  ],
  "splits": [
    {
      "user_id": "user_a",
      "split_type": "fixed",
      "fixed_amount_minor": 300,
      "sort_order": 1
    },
    {
      "user_id": "user_b",
      "split_type": "ratio",
      "ratio_value": 0.5,
      "sort_order": 2
    },
    {
      "user_id": "user_c",
      "split_type": "ratio",
      "ratio_value": 0.5,
      "sort_order": 3
    }
  ]
}
```

修正支出：

```json
{
  "title": "修正三月晚餐少記 200",
  "amount_minor": 200,
  "split_mode": "equal",
  "expense_type": "correction",
  "occurred_on": "2026-04-05",
  "payers": [
    {
      "payer_user_id": "user_a",
      "amount_minor": 200
    }
  ],
  "splits": [
    {
      "user_id": "user_a",
      "split_type": "equal",
      "sort_order": 1
    },
    {
      "user_id": "user_b",
      "split_type": "equal",
      "sort_order": 2
    }
  ]
}
```

#### GET /funds/{fundId}/expenses

Query params：

* `start_date`
* `end_date`
* `category_id`
* `created_by`
* `expense_type`
* `status`
* `page`
* `page_size`

#### POST /funds/{fundId}/settlements

```json
{
  "from_user_id": "user_b",
  "to_user_id": "user_a",
  "amount_minor": 2000,
  "period_start": "2026-04-01",
  "period_end": "2026-04-30",
  "settlement_type": "manual",
  "note": "四月結算"
}
```

#### GET /funds/{fundId}/settlement-suggestion

Response:

```json
{
  "data": {
    "fund_id": "fund_uuid",
    "currency": "TWD",
    "period_start": "2026-04-01",
    "period_end": "2026-04-30",
    "suggestions": [
      {
        "from_user_id": "user_b",
        "to_user_id": "user_a",
        "amount_minor": 2000
      }
    ]
  }
}
```

#### POST /settlements/{settlementId}/complete

```json
{
  "completed_at": "2026-04-05T10:30:00Z"
}
```

### 15.7 補充：驗證、鎖帳與權限規則

Expense 驗證：

* `payers` 不可為空
* `splits` 不可為空
* payers 總和必須等於 `amount_minor`
* splits 計算後總和必須等於 `amount_minor`
* hybrid 模式需先扣 fixed，再算 ratio
* payer / split user 必須屬於 fund 所屬 group

Contribution 驗證：

* contributor 必須屬於 fund 所屬 group
* correction / adjustment 是否允許負數，需在實作時固定規則

Settlement 驗證：

* `from_user_id != to_user_id`
* `amount_minor > 0`
* `period_start <= period_end`
* 使用者皆屬於同一 fund/group

鎖帳規則：

* 交易 `occurred_on` 落在任何 completed settlement 的 `period_start ~ period_end` 內，即視為 locked
* locked record 不允許 `PATCH`
* locked record 不允許 `DELETE`
* locked record 不允許 `RESTORE`
* 錯誤碼回傳 `SETTLED_PERIOD_LOCKED`

權限摘要：

* `member` 可查看自己所在 group / fund
* `member` 可新增交易
* `member` 可修改 / 刪除 / 還原自己建立且未鎖定的交易
* `owner` 可管理 group 基本設定、成員角色、基金與結算
* `owner` 可修改任何未鎖定交易
* 已結算區間的鎖定規則對 `owner` 與 `member` 一致

### 15.8 補充：建議回傳欄位

`GET /expenses/{expenseId}` 建議包含：

* expense 主資料
* payers
* splits
* `is_locked`
* audit history 摘要

`GET /funds/{fundId}/summary` 建議包含：

* fund balance
* contribution totals by member
* payment totals by member
* allocated share totals by member
* settlement totals by member
* current positions
* latest completed settlement period

### 14.8 補充：Prisma / PostgreSQL 落地建議

建議補充的 DB / service 層約束：

* `sum(expense_payers.amount_minor) = expenses.amount_minor`
* `sum(expense_splits.allocated_amount_minor) = expenses.amount_minor`
* `ratio` 模式時 `ratio_value` 必填
* `fixed` 模式時 `fixed_amount_minor` 必填
* 非 hybrid 模式建議限制同一 `expense_id + user_id` 僅一筆 split
* `from_user_id != to_user_id`
* payer / split / contributor / settlement user 必須屬於 fund 所在 group

建議的鎖帳判斷函式：

```text
is_locked(fund_id, occurred_on) =
  exists completed settlement
  where settlement.fund_id = fund_id
    and occurred_on between settlement.period_start and settlement.period_end
```

建議的計算邏輯：

```text
fund_balance =
  sum(active contributions.amount_minor)
  - sum(active expenses.amount_minor where expense_type = fund_expense)
  + sum(active expenses.amount_minor where expense_type = refund)
  ± adjustments
  ± corrections
```

---

## 16. 技術架構與軟體堆疊（版本 A）

推薦技術組合：

* **Mobile App**：Flutter
* **Web App**：Next.js
* **Backend API**：NestJS
* **Database**：PostgreSQL
* **ORM**：Prisma
* **Mobile State Management**：Riverpod
* **Web Data Fetching / State**：TanStack Query
* **Web Form**：React Hook Form + Zod
* **Mobile HTTP Client**：Dio
* **Auth**：JWT + Refresh Token
* **Monitoring**：Sentry
* **Analytics**：PostHog

### 架構原則

* 三端共用後端 API 與資料模型
* 帳務與結算規則集中在後端
* 後端需有明確的 settlement lock 檢查
* correction 交易沿用既有交易模型，不另開複雜關聯流程

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
* AuditLogModule
* DashboardModule
* NotificationModule

### 建議分層

* Controller：接 API request / response
* DTO：輸入輸出驗證
* Service：商業邏輯
* Repository / Prisma layer：資料存取
* Domain utility / rule engine：
  * split calculator
  * rounding utility
  * settlement calculator
  * settled-period lock evaluator

### 一致性策略

* 關鍵帳務操作使用 DB transaction
* expense / expense_payers / expense_splits 建立需同 transaction
* settlement create / complete 需同 transaction
* 修改 / 刪除 / 還原前需先檢查 settled period lock
* 軟刪除而非 hard delete

### MVP 同步策略

* online-first
* 網路失敗時保留表單草稿
* 關鍵建立交易 API 建議支援 idempotency key，避免重送造成重複記帳

### 測試重點

* hybrid split
* payer 不參與 split
* 未參與者 exclude
* correction 交易是否正確影響淨額
* settled period lock 是否正確攔截修改 / 刪除 / 還原
* settlement complete / cancel
* soft delete / restore

---

## 17. v0.2 與 v0.1 的主要差異

* 明確引入「結算後鎖帳」規則
* 移除 late entry confirmation 作為核心主線
* 新增 correction 作為正式交易類型
* owner 可複數
* owner 可管理任何未結算區間交易，但不能改已結算區間
* 金額命名統一以 `amount_minor` 為主

---

## 18. 下一步

1. 補 Prisma / PostgreSQL 詳細 schema
2. 補各 API request / response 完整範例
3. 補 settled period lock 的判斷規則與查詢策略
4. 補 correction 交易在 UI 的呈現方式與文案

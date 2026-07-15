-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "GroupType" AS ENUM ('COUPLE', 'GROUP');

-- CreateEnum
CREATE TYPE "GroupStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'LEFT', 'REMOVED');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "FundStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('EXPENSE');

-- CreateEnum
CREATE TYPE "CategoryStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('ACTIVE', 'DELETED');

-- CreateEnum
CREATE TYPE "ContributionType" AS ENUM ('REGULAR', 'ONE_TIME', 'ADJUSTMENT', 'CORRECTION');

-- CreateEnum
CREATE TYPE "ExpenseSplitMode" AS ENUM ('EQUAL', 'RATIO', 'FIXED', 'HYBRID');

-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('FUND_EXPENSE', 'REFUND', 'ADJUSTMENT', 'CORRECTION');

-- CreateEnum
CREATE TYPE "SplitType" AS ENUM ('EQUAL', 'RATIO', 'FIXED');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "SettlementType" AS ENUM ('SCHEDULED', 'MANUAL');

-- CreateEnum
CREATE TYPE "RecurringRuleStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ENDED');

-- CreateEnum
CREATE TYPE "AuditEntityType" AS ENUM ('GROUP', 'FUND', 'CATEGORY', 'CONTRIBUTION', 'EXPENSE', 'SETTLEMENT', 'RECURRING_RULE', 'GROUP_MEMBER');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'COMPLETE', 'CANCEL', 'ARCHIVE', 'UNARCHIVE', 'ROLE_CHANGE');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "avatar_url" VARCHAR(500),
    "locale" VARCHAR(20) NOT NULL DEFAULT 'zh-TW',
    "timezone" VARCHAR(100) NOT NULL DEFAULT 'Asia/Taipei',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "group_type" "GroupType" NOT NULL,
    "default_currency" VARCHAR(3) NOT NULL,
    "status" "GroupStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_members" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "MemberRole" NOT NULL,
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_invites" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "invite_code" VARCHAR(64) NOT NULL,
    "invited_by" UUID NOT NULL,
    "invited_email" VARCHAR(255),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "accepted_by" UUID,
    "accepted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funds" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "status" "FundStatus" NOT NULL DEFAULT 'ACTIVE',
    "archived_at" TIMESTAMPTZ(6),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "funds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "group_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "type" "CategoryType" NOT NULL DEFAULT 'EXPENSE',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "status" "CategoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contributions" (
    "id" UUID NOT NULL,
    "fund_id" UUID NOT NULL,
    "contributor_user_id" UUID NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "contribution_type" "ContributionType" NOT NULL,
    "note" TEXT,
    "occurred_on" DATE NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "fund_id" UUID NOT NULL,
    "category_id" UUID,
    "title" VARCHAR(200) NOT NULL,
    "note" TEXT,
    "amount_minor" BIGINT NOT NULL,
    "split_mode" "ExpenseSplitMode" NOT NULL,
    "expense_type" "ExpenseType" NOT NULL,
    "occurred_on" DATE NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_payers" (
    "id" UUID NOT NULL,
    "expense_id" UUID NOT NULL,
    "payer_user_id" UUID NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "expense_payers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_splits" (
    "id" UUID NOT NULL,
    "expense_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "split_type" "SplitType" NOT NULL,
    "ratio_value" DECIMAL(10,6),
    "fixed_amount_minor" BIGINT,
    "allocated_amount_minor" BIGINT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "expense_splits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlements" (
    "id" UUID NOT NULL,
    "fund_id" UUID NOT NULL,
    "from_user_id" UUID NOT NULL,
    "to_user_id" UUID NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "period_start" DATE,
    "period_end" DATE,
    "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "settlement_type" "SettlementType" NOT NULL,
    "note" TEXT,
    "completed_at" TIMESTAMPTZ(6),
    "canceled_at" TIMESTAMPTZ(6),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_contribution_rules" (
    "id" UUID NOT NULL,
    "fund_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "frequency" VARCHAR(20) NOT NULL,
    "day_of_month" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "status" "RecurringRuleStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_prompted_at" TIMESTAMPTZ(6),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "recurring_contribution_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "group_id" UUID,
    "fund_id" UUID,
    "actor_user_id" UUID NOT NULL,
    "entity_type" "AuditEntityType" NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" "AuditAction" NOT NULL,
    "before_snapshot" JSONB,
    "after_snapshot" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "groups_created_by_idx" ON "groups"("created_by");

-- CreateIndex
CREATE INDEX "group_members_group_id_idx" ON "group_members"("group_id");

-- CreateIndex
CREATE INDEX "group_members_user_id_idx" ON "group_members"("user_id");

-- CreateIndex
CREATE INDEX "group_members_group_id_role_status_idx" ON "group_members"("group_id", "role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "group_members_group_id_user_id_key" ON "group_members"("group_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_invites_invite_code_key" ON "group_invites"("invite_code");

-- CreateIndex
CREATE INDEX "group_invites_group_id_status_idx" ON "group_invites"("group_id", "status");

-- CreateIndex
CREATE INDEX "funds_group_id_status_idx" ON "funds"("group_id", "status");

-- CreateIndex
CREATE INDEX "categories_group_id_status_sort_order_idx" ON "categories"("group_id", "status", "sort_order");

-- CreateIndex
CREATE INDEX "contributions_fund_id_occurred_on_status_idx" ON "contributions"("fund_id", "occurred_on", "status");

-- CreateIndex
CREATE INDEX "contributions_contributor_user_id_status_idx" ON "contributions"("contributor_user_id", "status");

-- CreateIndex
CREATE INDEX "expenses_fund_id_occurred_on_status_idx" ON "expenses"("fund_id", "occurred_on", "status");

-- CreateIndex
CREATE INDEX "expenses_category_id_idx" ON "expenses"("category_id");

-- CreateIndex
CREATE INDEX "expenses_expense_type_status_idx" ON "expenses"("expense_type", "status");

-- CreateIndex
CREATE INDEX "expense_payers_expense_id_idx" ON "expense_payers"("expense_id");

-- CreateIndex
CREATE INDEX "expense_payers_payer_user_id_idx" ON "expense_payers"("payer_user_id");

-- CreateIndex
CREATE INDEX "expense_splits_expense_id_sort_order_idx" ON "expense_splits"("expense_id", "sort_order");

-- CreateIndex
CREATE INDEX "expense_splits_user_id_idx" ON "expense_splits"("user_id");

-- CreateIndex
CREATE INDEX "settlements_fund_id_status_idx" ON "settlements"("fund_id", "status");

-- CreateIndex
CREATE INDEX "settlements_fund_id_period_start_period_end_idx" ON "settlements"("fund_id", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "settlements_from_user_id_status_idx" ON "settlements"("from_user_id", "status");

-- CreateIndex
CREATE INDEX "settlements_to_user_id_status_idx" ON "settlements"("to_user_id", "status");

-- CreateIndex
CREATE INDEX "recurring_contribution_rules_fund_id_status_idx" ON "recurring_contribution_rules"("fund_id", "status");

-- CreateIndex
CREATE INDEX "recurring_contribution_rules_user_id_status_idx" ON "recurring_contribution_rules"("user_id", "status");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_group_id_created_at_idx" ON "audit_logs"("group_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_fund_id_created_at_idx" ON "audit_logs"("fund_id", "created_at");

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_invites" ADD CONSTRAINT "group_invites_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_invites" ADD CONSTRAINT "group_invites_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_invites" ADD CONSTRAINT "group_invites_accepted_by_fkey" FOREIGN KEY ("accepted_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funds" ADD CONSTRAINT "funds_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funds" ADD CONSTRAINT "funds_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "funds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_contributor_user_id_fkey" FOREIGN KEY ("contributor_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "funds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_payers" ADD CONSTRAINT "expense_payers_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_payers" ADD CONSTRAINT "expense_payers_payer_user_id_fkey" FOREIGN KEY ("payer_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "funds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_contribution_rules" ADD CONSTRAINT "recurring_contribution_rules_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "funds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_contribution_rules" ADD CONSTRAINT "recurring_contribution_rules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_contribution_rules" ADD CONSTRAINT "recurring_contribution_rules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "funds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- P7 intentionally removes the pre-financial-space Fund aggregate. There is no
-- compatibility layer: new financial-space records are the sole product model.
DELETE FROM "audit_logs"
WHERE "entity_type" NOT IN ('GROUP', 'GROUP_MEMBER');

DROP TABLE "expense_splits";
DROP TABLE "expense_payers";
DROP TABLE "recurring_contribution_rules";
DROP TABLE "settlements";
DROP TABLE "expenses";
DROP TABLE "contributions";
ALTER TABLE "audit_logs" DROP COLUMN "fund_id";
DROP TABLE "categories";
DROP TABLE "funds";

ALTER TABLE "audit_logs" ALTER COLUMN "entity_type" TYPE TEXT;
DROP TYPE "AuditEntityType";
CREATE TYPE "AuditEntityType" AS ENUM ('GROUP', 'GROUP_MEMBER');
ALTER TABLE "audit_logs" ALTER COLUMN "entity_type" TYPE "AuditEntityType"
USING "entity_type"::"AuditEntityType";

DROP TYPE "FundStatus";
DROP TYPE "CategoryType";
DROP TYPE "CategoryStatus";
DROP TYPE "ContributionType";
DROP TYPE "ExpenseSplitMode";
DROP TYPE "ExpenseType";
DROP TYPE "SplitType";
DROP TYPE "SettlementStatus";
DROP TYPE "SettlementType";
DROP TYPE "RecurringRuleStatus";

ALTER TYPE "FinancialSpaceStatus" ADD VALUE 'CLOSING';

ALTER TYPE "SpaceAuditAction" ADD VALUE 'POOLED_COMMITMENT_CREATED';
ALTER TYPE "SpaceAuditAction" ADD VALUE 'POOLED_COMMITMENT_UPDATED';
ALTER TYPE "SpaceAuditAction" ADD VALUE 'POOLED_OCCURRENCE_CONFIRMED';
ALTER TYPE "SpaceAuditAction" ADD VALUE 'POOLED_OCCURRENCE_SKIPPED';
ALTER TYPE "SpaceAuditAction" ADD VALUE 'POOLED_OCCURRENCE_CANCELED';
ALTER TYPE "SpaceAuditAction" ADD VALUE 'POOLED_REIMBURSEMENT_SENT';
ALTER TYPE "SpaceAuditAction" ADD VALUE 'POOLED_REIMBURSEMENT_RECEIVED';
ALTER TYPE "SpaceAuditAction" ADD VALUE 'POOLED_CORRECTION_CREATED';
ALTER TYPE "SpaceAuditAction" ADD VALUE 'POOLED_CLOSING_STARTED';
ALTER TYPE "SpaceAuditAction" ADD VALUE 'POOLED_RETURN_PLAN_CREATED';
ALTER TYPE "SpaceAuditAction" ADD VALUE 'POOLED_RETURN_SENT';
ALTER TYPE "SpaceAuditAction" ADD VALUE 'POOLED_RETURN_RECEIVED';

CREATE TYPE "PooledCadence" AS ENUM ('WEEKLY', 'MONTHLY');
CREATE TYPE "PooledCommitmentStatus" AS ENUM ('ACTIVE', 'CANCELED');
CREATE TYPE "PooledOccurrenceStatus" AS ENUM ('EXPECTED', 'CONFIRMED', 'SKIPPED', 'CANCELED');
CREATE TYPE "PooledPaymentSource" AS ENUM ('FUND_PAID', 'PARTICIPANT_ADVANCED');
CREATE TYPE "PooledWorkflowStatus" AS ENUM ('AWAITING_PAYMENT', 'SENT', 'COMPLETED');
CREATE TYPE "PooledCorrectionSourceKind" AS ENUM ('EXPENSE', 'REIMBURSEMENT', 'RETURN', 'CONTRIBUTION');
CREATE TYPE "PooledReturnPlanStatus" AS ENUM ('ACTIVE', 'COMPLETED');
CREATE TYPE "PooledPostingEntityType" AS ENUM ('CONTRIBUTION', 'REIMBURSEMENT', 'RETURN');
CREATE TYPE "PooledPostingTransition" AS ENUM ('CONFIRMED', 'SENT', 'RECEIVED');
CREATE TYPE "PooledOperationAction" AS ENUM ('COMMITMENT_CREATE', 'COMMITMENT_UPDATE', 'OCCURRENCE_CONFIRM', 'OCCURRENCE_SKIP', 'OCCURRENCE_CANCEL', 'EXPENSE_CREATE', 'EXPENSE_UPDATE', 'EXPENSE_DELETE', 'REIMBURSEMENT_SENT', 'REIMBURSEMENT_RECEIVED', 'CORRECTION_CREATE', 'CLOSING_START', 'RETURN_PLAN_CREATE', 'RETURN_SENT', 'RETURN_RECEIVED', 'ARCHIVE');

CREATE TABLE "pooled_commitments" (
  "id" UUID NOT NULL,
  "space_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "cadence" "PooledCadence" NOT NULL,
  "interval" INTEGER NOT NULL DEFAULT 1,
  "starts_on" DATE NOT NULL,
  "ends_on" DATE,
  "generated_through" DATE NOT NULL,
  "status" "PooledCommitmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_by_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "pooled_commitments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pooled_commitments_interval_check" CHECK ("interval" > 0),
  CONSTRAINT "pooled_commitments_version_check" CHECK ("version" > 0),
  CONSTRAINT "pooled_commitments_dates_check" CHECK ("ends_on" IS NULL OR "ends_on" >= "starts_on"),
  CONSTRAINT "pooled_commitments_generated_check" CHECK ("generated_through" >= "starts_on")
);

CREATE TABLE "pooled_commitment_assignments" (
  "commitment_id" UUID NOT NULL,
  "participant_user_id" UUID NOT NULL,
  "amount_minor" NUMERIC(65,0) NOT NULL,
  CONSTRAINT "pooled_commitment_assignments_pkey" PRIMARY KEY ("commitment_id", "participant_user_id"),
  CONSTRAINT "pooled_commitment_assignments_amount_check" CHECK ("amount_minor" > 0)
);

CREATE TABLE "pooled_contribution_occurrences" (
  "id" UUID NOT NULL,
  "commitment_id" UUID NOT NULL,
  "participant_user_id" UUID NOT NULL,
  "due_on" DATE NOT NULL,
  "amount_minor" NUMERIC(65,0) NOT NULL,
  "status" "PooledOccurrenceStatus" NOT NULL DEFAULT 'EXPECTED',
  "version" INTEGER NOT NULL DEFAULT 1,
  "confirmed_by_id" UUID,
  "confirmed_at" TIMESTAMPTZ(6),
  "skipped_by_id" UUID,
  "skipped_at" TIMESTAMPTZ(6),
  "canceled_by_id" UUID,
  "canceled_at" TIMESTAMPTZ(6),
  CONSTRAINT "pooled_contribution_occurrences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pooled_occurrences_amount_check" CHECK ("amount_minor" > 0),
  CONSTRAINT "pooled_occurrences_version_check" CHECK ("version" > 0),
  CONSTRAINT "pooled_occurrences_state_check" CHECK (
    ("status" = 'EXPECTED' AND "confirmed_by_id" IS NULL AND "confirmed_at" IS NULL AND "skipped_by_id" IS NULL AND "skipped_at" IS NULL AND "canceled_by_id" IS NULL AND "canceled_at" IS NULL) OR
    ("status" = 'CONFIRMED' AND "confirmed_by_id" = "participant_user_id" AND "confirmed_at" IS NOT NULL AND "skipped_by_id" IS NULL AND "skipped_at" IS NULL AND "canceled_by_id" IS NULL AND "canceled_at" IS NULL) OR
    ("status" = 'SKIPPED' AND "skipped_by_id" = "participant_user_id" AND "skipped_at" IS NOT NULL AND "confirmed_by_id" IS NULL AND "confirmed_at" IS NULL AND "canceled_by_id" IS NULL AND "canceled_at" IS NULL) OR
    ("status" = 'CANCELED' AND "canceled_by_id" IS NOT NULL AND "canceled_at" IS NOT NULL AND "confirmed_by_id" IS NULL AND "confirmed_at" IS NULL AND "skipped_by_id" IS NULL AND "skipped_at" IS NULL)
  ),
  CONSTRAINT "pooled_occurrence_unique" UNIQUE ("commitment_id", "participant_user_id", "due_on")
);

CREATE TABLE "pooled_contributions" (
  "id" UUID NOT NULL,
  "space_id" UUID NOT NULL,
  "occurrence_id" UUID NOT NULL,
  "participant_user_id" UUID NOT NULL,
  "amount_minor" NUMERIC(65,0) NOT NULL,
  "confirmed_by_id" UUID NOT NULL,
  "confirmed_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "pooled_contributions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pooled_contributions_amount_check" CHECK ("amount_minor" > 0),
  CONSTRAINT "pooled_contributions_actor_check" CHECK ("participant_user_id" = "confirmed_by_id"),
  CONSTRAINT "pooled_contributions_occurrence_key" UNIQUE ("occurrence_id")
);

CREATE TABLE "pooled_expense_payments" (
  "expense_id" UUID NOT NULL,
  "source" "PooledPaymentSource" NOT NULL,
  "advanced_by_id" UUID,
  CONSTRAINT "pooled_expense_payments_pkey" PRIMARY KEY ("expense_id"),
  CONSTRAINT "pooled_expense_source_check" CHECK (("source" = 'FUND_PAID' AND "advanced_by_id" IS NULL) OR ("source" = 'PARTICIPANT_ADVANCED' AND "advanced_by_id" IS NOT NULL)),
  CONSTRAINT "pooled_expense_payment_unique" UNIQUE ("expense_id")
);

CREATE TABLE "pooled_reimbursements" (
  "id" UUID NOT NULL,
  "space_id" UUID NOT NULL,
  "expense_id" UUID NOT NULL,
  "participant_user_id" UUID NOT NULL,
  "amount_minor" NUMERIC(65,0) NOT NULL,
  "status" "PooledWorkflowStatus" NOT NULL DEFAULT 'AWAITING_PAYMENT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "sent_by_id" UUID,
  "sent_at" TIMESTAMPTZ(6),
  "received_by_id" UUID,
  "received_at" TIMESTAMPTZ(6),
  CONSTRAINT "pooled_reimbursements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pooled_reimbursements_amount_check" CHECK ("amount_minor" > 0),
  CONSTRAINT "pooled_reimbursements_version_check" CHECK ("version" > 0),
  CONSTRAINT "pooled_reimbursements_state_check" CHECK (
    ("status" = 'AWAITING_PAYMENT' AND "sent_by_id" IS NULL AND "sent_at" IS NULL AND "received_by_id" IS NULL AND "received_at" IS NULL) OR
    ("status" = 'SENT' AND "sent_by_id" IS NOT NULL AND "sent_at" IS NOT NULL AND "received_by_id" IS NULL AND "received_at" IS NULL) OR
    ("status" = 'COMPLETED' AND "sent_by_id" IS NOT NULL AND "sent_at" IS NOT NULL AND "received_by_id" = "participant_user_id" AND "received_at" IS NOT NULL)
  ),
  CONSTRAINT "pooled_reimbursements_expense_key" UNIQUE ("expense_id")
);

CREATE TABLE "pooled_corrections" (
  "id" UUID NOT NULL,
  "space_id" UUID NOT NULL,
  "source_kind" "PooledCorrectionSourceKind" NOT NULL,
  "source_id" UUID NOT NULL,
  "amount_minor" NUMERIC(65,0) NOT NULL,
  "occurred_on" DATE NOT NULL,
  "reason" VARCHAR(2000) NOT NULL,
  "created_by_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pooled_corrections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pooled_corrections_nonzero_check" CHECK ("amount_minor" <> 0)
);

CREATE TABLE "pooled_return_plans" (
  "id" UUID NOT NULL,
  "space_id" UUID NOT NULL,
  "status" "PooledReturnPlanStatus" NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_by_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pooled_return_plans_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pooled_return_plans_version_check" CHECK ("version" > 0)
);

CREATE TABLE "pooled_returns" (
  "id" UUID NOT NULL,
  "plan_id" UUID NOT NULL,
  "recipient_user_id" UUID NOT NULL,
  "amount_minor" NUMERIC(65,0) NOT NULL,
  "status" "PooledWorkflowStatus" NOT NULL DEFAULT 'AWAITING_PAYMENT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "sent_by_id" UUID,
  "sent_at" TIMESTAMPTZ(6),
  "received_by_id" UUID,
  "received_at" TIMESTAMPTZ(6),
  CONSTRAINT "pooled_returns_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pooled_returns_amount_check" CHECK ("amount_minor" > 0),
  CONSTRAINT "pooled_returns_version_check" CHECK ("version" > 0),
  CONSTRAINT "pooled_returns_state_check" CHECK (
    ("status" = 'AWAITING_PAYMENT' AND "sent_by_id" IS NULL AND "sent_at" IS NULL AND "received_by_id" IS NULL AND "received_at" IS NULL) OR
    ("status" = 'SENT' AND "sent_by_id" IS NOT NULL AND "sent_at" IS NOT NULL AND "received_by_id" IS NULL AND "received_at" IS NULL) OR
    ("status" = 'COMPLETED' AND "sent_by_id" IS NOT NULL AND "sent_at" IS NOT NULL AND "received_by_id" = "recipient_user_id" AND "received_at" IS NOT NULL)
  ),
  CONSTRAINT "pooled_returns_recipient_key" UNIQUE ("plan_id", "recipient_user_id")
);

CREATE TABLE "pooled_transition_postings" (
  "id" UUID NOT NULL,
  "space_id" UUID NOT NULL,
  "entity_type" "PooledPostingEntityType" NOT NULL,
  "entity_id" UUID NOT NULL,
  "transition" "PooledPostingTransition" NOT NULL,
  "amount_minor" NUMERIC(65,0) NOT NULL,
  "actor_user_id" UUID NOT NULL,
  "posted_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "pooled_transition_postings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pooled_transition_posting_unique" UNIQUE ("entity_type", "entity_id", "transition")
);

CREATE TABLE "pooled_operation_receipts" (
  "id" UUID NOT NULL,
  "space_id" UUID NOT NULL,
  "actor_user_id" UUID NOT NULL,
  "request_id" UUID NOT NULL,
  "action" "PooledOperationAction" NOT NULL,
  "payload_hash" VARCHAR(64) NOT NULL,
  "response" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pooled_operation_receipts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pooled_operation_receipts_request_key" UNIQUE ("space_id", "actor_user_id", "request_id")
);

CREATE INDEX "pooled_commitments_space_id_status_idx" ON "pooled_commitments"("space_id", "status");
CREATE INDEX "pooled_occurrences_participant_status_due_idx" ON "pooled_contribution_occurrences"("participant_user_id", "status", "due_on");
CREATE INDEX "pooled_contributions_space_confirmed_idx" ON "pooled_contributions"("space_id", "confirmed_at");
CREATE INDEX "pooled_expense_payments_advanced_idx" ON "pooled_expense_payments"("advanced_by_id");
CREATE INDEX "pooled_reimbursements_space_status_idx" ON "pooled_reimbursements"("space_id", "status");
CREATE INDEX "pooled_corrections_space_date_id_idx" ON "pooled_corrections"("space_id", "occurred_on", "id");
CREATE INDEX "pooled_return_plans_space_status_idx" ON "pooled_return_plans"("space_id", "status");
CREATE UNIQUE INDEX "pooled_return_plans_one_active" ON "pooled_return_plans"("space_id") WHERE "status" = 'ACTIVE';
CREATE INDEX "pooled_returns_plan_status_idx" ON "pooled_returns"("plan_id", "status");
CREATE INDEX "pooled_postings_space_posted_idx" ON "pooled_transition_postings"("space_id", "posted_at");

ALTER TABLE "pooled_commitments" ADD CONSTRAINT "pooled_commitments_space_fkey" FOREIGN KEY ("space_id") REFERENCES "financial_spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pooled_commitments" ADD CONSTRAINT "pooled_commitments_creator_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pooled_commitment_assignments" ADD CONSTRAINT "pooled_assignments_commitment_fkey" FOREIGN KEY ("commitment_id") REFERENCES "pooled_commitments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pooled_commitment_assignments" ADD CONSTRAINT "pooled_assignments_participant_fkey" FOREIGN KEY ("participant_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pooled_contribution_occurrences" ADD CONSTRAINT "pooled_occurrences_commitment_fkey" FOREIGN KEY ("commitment_id") REFERENCES "pooled_commitments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pooled_contribution_occurrences" ADD CONSTRAINT "pooled_occurrences_participant_fkey" FOREIGN KEY ("participant_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pooled_contribution_occurrences" ADD CONSTRAINT "pooled_occurrences_confirmer_fkey" FOREIGN KEY ("confirmed_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pooled_contribution_occurrences" ADD CONSTRAINT "pooled_occurrences_skipper_fkey" FOREIGN KEY ("skipped_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pooled_contribution_occurrences" ADD CONSTRAINT "pooled_occurrences_canceler_fkey" FOREIGN KEY ("canceled_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pooled_contributions" ADD CONSTRAINT "pooled_contributions_space_fkey" FOREIGN KEY ("space_id") REFERENCES "financial_spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pooled_contributions" ADD CONSTRAINT "pooled_contributions_occurrence_fkey" FOREIGN KEY ("occurrence_id") REFERENCES "pooled_contribution_occurrences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pooled_contributions" ADD CONSTRAINT "pooled_contributions_participant_fkey" FOREIGN KEY ("participant_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pooled_contributions" ADD CONSTRAINT "pooled_contributions_confirmer_fkey" FOREIGN KEY ("confirmed_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pooled_expense_payments" ADD CONSTRAINT "pooled_expense_payment_expense_fkey" FOREIGN KEY ("expense_id") REFERENCES "expense_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pooled_expense_payments" ADD CONSTRAINT "pooled_expense_payment_advancer_fkey" FOREIGN KEY ("advanced_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pooled_reimbursements" ADD CONSTRAINT "pooled_reimbursement_space_fkey" FOREIGN KEY ("space_id") REFERENCES "financial_spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pooled_reimbursements" ADD CONSTRAINT "pooled_reimbursement_expense_fkey" FOREIGN KEY ("expense_id") REFERENCES "pooled_expense_payments"("expense_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pooled_reimbursements" ADD CONSTRAINT "pooled_reimbursement_participant_fkey" FOREIGN KEY ("participant_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pooled_reimbursements" ADD CONSTRAINT "pooled_reimbursement_sender_fkey" FOREIGN KEY ("sent_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pooled_reimbursements" ADD CONSTRAINT "pooled_reimbursement_receiver_fkey" FOREIGN KEY ("received_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pooled_corrections" ADD CONSTRAINT "pooled_correction_space_fkey" FOREIGN KEY ("space_id") REFERENCES "financial_spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pooled_corrections" ADD CONSTRAINT "pooled_correction_creator_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pooled_return_plans" ADD CONSTRAINT "pooled_return_plan_space_fkey" FOREIGN KEY ("space_id") REFERENCES "financial_spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pooled_return_plans" ADD CONSTRAINT "pooled_return_plan_creator_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pooled_returns" ADD CONSTRAINT "pooled_return_plan_fkey" FOREIGN KEY ("plan_id") REFERENCES "pooled_return_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pooled_returns" ADD CONSTRAINT "pooled_return_recipient_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pooled_returns" ADD CONSTRAINT "pooled_return_sender_fkey" FOREIGN KEY ("sent_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pooled_returns" ADD CONSTRAINT "pooled_return_receiver_fkey" FOREIGN KEY ("received_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pooled_transition_postings" ADD CONSTRAINT "pooled_posting_space_fkey" FOREIGN KEY ("space_id") REFERENCES "financial_spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pooled_transition_postings" ADD CONSTRAINT "pooled_posting_actor_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pooled_operation_receipts" ADD CONSTRAINT "pooled_receipt_space_fkey" FOREIGN KEY ("space_id") REFERENCES "financial_spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pooled_operation_receipts" ADD CONSTRAINT "pooled_receipt_actor_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "SharedBatchStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "SharedTransferStatus" AS ENUM ('AWAITING_PAYMENT', 'SENT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SharedOperationAction" AS ENUM ('BATCH_START', 'BATCH_CANCEL', 'TRANSFER_SENT', 'TRANSFER_RECEIVED', 'EXPENSE_CORRECTION', 'TRANSFER_CORRECTION');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SpaceAuditAction" ADD VALUE 'SHARED_BATCH_STARTED';
ALTER TYPE "SpaceAuditAction" ADD VALUE 'SHARED_BATCH_CANCELED';
ALTER TYPE "SpaceAuditAction" ADD VALUE 'SHARED_BATCH_COMPLETED';
ALTER TYPE "SpaceAuditAction" ADD VALUE 'SHARED_TRANSFER_SENT';
ALTER TYPE "SpaceAuditAction" ADD VALUE 'SHARED_TRANSFER_RECEIVED';
ALTER TYPE "SpaceAuditAction" ADD VALUE 'SHARED_CORRECTION_CREATED';

-- CreateTable
CREATE TABLE "shared_settlement_batches" (
    "id" UUID NOT NULL,
    "space_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "status" "SharedBatchStatus" NOT NULL DEFAULT 'PENDING',
    "version" INTEGER NOT NULL DEFAULT 1,
    "snapshot" JSONB NOT NULL,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_by_id" UUID,
    "completed_at" TIMESTAMPTZ(6),
    "canceled_by_id" UUID,
    "canceled_at" TIMESTAMPTZ(6),

    CONSTRAINT "shared_settlement_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared_settlement_transfers" (
    "id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "from_user_id" UUID NOT NULL,
    "to_user_id" UUID NOT NULL,
    "amount_minor" DECIMAL(65,0) NOT NULL,
    "status" "SharedTransferStatus" NOT NULL DEFAULT 'AWAITING_PAYMENT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "sent_by_id" UUID,
    "sent_at" TIMESTAMPTZ(6),
    "received_by_id" UUID,
    "received_at" TIMESTAMPTZ(6),

    CONSTRAINT "shared_settlement_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared_corrections" (
    "id" UUID NOT NULL,
    "space_id" UUID NOT NULL,
    "source_expense_id" UUID,
    "source_transfer_id" UUID,
    "revision" INTEGER NOT NULL,
    "occurred_on" DATE NOT NULL,
    "reason" VARCHAR(2000) NOT NULL,
    "amount_minor" DECIMAL(65,0) NOT NULL,
    "target_amount_minor" DECIMAL(65,0) NOT NULL,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shared_corrections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared_correction_payers" (
    "correction_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount_minor" DECIMAL(65,0) NOT NULL,

    CONSTRAINT "shared_correction_payers_pkey" PRIMARY KEY ("correction_id","user_id")
);

-- CreateTable
CREATE TABLE "shared_correction_allocations" (
    "correction_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount_minor" DECIMAL(65,0) NOT NULL,

    CONSTRAINT "shared_correction_allocations_pkey" PRIMARY KEY ("correction_id","user_id")
);

-- CreateTable
CREATE TABLE "shared_operation_receipts" (
    "id" UUID NOT NULL,
    "space_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "action" "SharedOperationAction" NOT NULL,
    "payload_hash" VARCHAR(64) NOT NULL,
    "response" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shared_operation_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shared_settlement_batches_space_id_period_end_idx" ON "shared_settlement_batches"("space_id", "period_end");

-- CreateIndex
CREATE INDEX "shared_settlement_transfers_batch_id_status_idx" ON "shared_settlement_transfers"("batch_id", "status");

-- CreateIndex
CREATE INDEX "shared_corrections_space_id_occurred_on_id_idx" ON "shared_corrections"("space_id", "occurred_on", "id");

-- CreateIndex
CREATE UNIQUE INDEX "shared_corrections_source_expense_id_revision_key" ON "shared_corrections"("source_expense_id", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "shared_corrections_source_transfer_id_revision_key" ON "shared_corrections"("source_transfer_id", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "shared_operation_receipts_space_id_actor_user_id_request_id_key" ON "shared_operation_receipts"("space_id", "actor_user_id", "request_id");

-- AddForeignKey
ALTER TABLE "shared_settlement_batches" ADD CONSTRAINT "shared_settlement_batches_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "financial_spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_settlement_batches" ADD CONSTRAINT "shared_settlement_batches_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_settlement_batches" ADD CONSTRAINT "shared_settlement_batches_completed_by_id_fkey" FOREIGN KEY ("completed_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_settlement_batches" ADD CONSTRAINT "shared_settlement_batches_canceled_by_id_fkey" FOREIGN KEY ("canceled_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_settlement_transfers" ADD CONSTRAINT "shared_settlement_transfers_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "shared_settlement_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_settlement_transfers" ADD CONSTRAINT "shared_settlement_transfers_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_settlement_transfers" ADD CONSTRAINT "shared_settlement_transfers_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_settlement_transfers" ADD CONSTRAINT "shared_settlement_transfers_sent_by_id_fkey" FOREIGN KEY ("sent_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_settlement_transfers" ADD CONSTRAINT "shared_settlement_transfers_received_by_id_fkey" FOREIGN KEY ("received_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_corrections" ADD CONSTRAINT "shared_corrections_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "financial_spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_corrections" ADD CONSTRAINT "shared_corrections_source_expense_id_fkey" FOREIGN KEY ("source_expense_id") REFERENCES "expense_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_corrections" ADD CONSTRAINT "shared_corrections_source_transfer_id_fkey" FOREIGN KEY ("source_transfer_id") REFERENCES "shared_settlement_transfers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_corrections" ADD CONSTRAINT "shared_corrections_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_correction_payers" ADD CONSTRAINT "shared_correction_payers_correction_id_fkey" FOREIGN KEY ("correction_id") REFERENCES "shared_corrections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_correction_payers" ADD CONSTRAINT "shared_correction_payers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_correction_allocations" ADD CONSTRAINT "shared_correction_allocations_correction_id_fkey" FOREIGN KEY ("correction_id") REFERENCES "shared_corrections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_correction_allocations" ADD CONSTRAINT "shared_correction_allocations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_operation_receipts" ADD CONSTRAINT "shared_operation_receipts_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "financial_spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_operation_receipts" ADD CONSTRAINT "shared_operation_receipts_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "shared_one_pending_batch" ON "shared_settlement_batches"("space_id") WHERE "status"='PENDING';
ALTER TABLE "shared_settlement_batches" ADD CONSTRAINT "shared_batch_invariants" CHECK (
  "period_start" <= "period_end" AND "version" > 0 AND (
    ("status"='PENDING' AND "completed_by_id" IS NULL AND "completed_at" IS NULL AND "canceled_by_id" IS NULL AND "canceled_at" IS NULL) OR
    ("status"='COMPLETED' AND "completed_by_id" IS NOT NULL AND "completed_at" IS NOT NULL AND "canceled_by_id" IS NULL AND "canceled_at" IS NULL) OR
    ("status"='CANCELED' AND "completed_by_id" IS NULL AND "completed_at" IS NULL AND "canceled_by_id" IS NOT NULL AND "canceled_at" IS NOT NULL)
  )
);
ALTER TABLE "shared_settlement_transfers" ADD CONSTRAINT "shared_transfer_invariants" CHECK (
  "amount_minor">0 AND "version">0 AND "from_user_id"<>"to_user_id" AND (
    ("status"='AWAITING_PAYMENT' AND "sent_by_id" IS NULL AND "sent_at" IS NULL AND "received_by_id" IS NULL AND "received_at" IS NULL) OR
    ("status"='SENT' AND "sent_by_id" IS NOT NULL AND "sent_by_id"="from_user_id" AND "sent_at" IS NOT NULL AND "received_by_id" IS NULL AND "received_at" IS NULL) OR
    ("status"='COMPLETED' AND "sent_by_id" IS NOT NULL AND "sent_by_id"="from_user_id" AND "sent_at" IS NOT NULL AND "received_by_id" IS NOT NULL AND "received_by_id"="to_user_id" AND "received_at">="sent_at")
  )
);
ALTER TABLE "shared_corrections" ADD CONSTRAINT "shared_correction_invariants" CHECK (
  ("source_expense_id" IS NOT NULL) <> ("source_transfer_id" IS NOT NULL)
  AND "revision">0 AND "target_amount_minor">=0
  AND ("source_transfer_id" IS NULL OR "amount_minor"=0)
);

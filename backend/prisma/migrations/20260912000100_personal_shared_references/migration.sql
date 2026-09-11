-- CreateEnum
CREATE TYPE "PersonalReferenceStatus" AS ENUM ('ACTIVE', 'REMOVED');

-- CreateEnum
CREATE TYPE "PersonalReferenceAction" AS ENUM ('CREATE', 'UPDATE', 'REMOVE');

-- AlterEnum
ALTER TYPE "SpaceAuditAction" ADD VALUE 'PERSONAL_REFERENCE_CREATED';
ALTER TYPE "SpaceAuditAction" ADD VALUE 'PERSONAL_REFERENCE_UPDATED';
ALTER TYPE "SpaceAuditAction" ADD VALUE 'PERSONAL_REFERENCE_REMOVED';

-- CreateTable
CREATE TABLE "personal_expense_references" (
  "id" UUID NOT NULL,
  "personal_space_id" UUID NOT NULL,
  "source_expense_id" UUID NOT NULL,
  "owner_user_id" UUID NOT NULL,
  "private_note" VARCHAR(2000),
  "status" "PersonalReferenceStatus" NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "personal_expense_references_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "personal_expense_references_owner_source_key" UNIQUE ("personal_space_id", "source_expense_id", "owner_user_id"),
  CONSTRAINT "personal_expense_references_version_check" CHECK ("version" > 0),
  CONSTRAINT "personal_expense_references_personal_space_id_fkey" FOREIGN KEY ("personal_space_id") REFERENCES "financial_spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "personal_expense_references_source_expense_id_fkey" FOREIGN KEY ("source_expense_id") REFERENCES "expense_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "personal_expense_references_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "personal_expense_reference_tags" (
  "reference_id" UUID NOT NULL,
  "tag_id" UUID NOT NULL,
  CONSTRAINT "personal_expense_reference_tags_pkey" PRIMARY KEY ("reference_id", "tag_id"),
  CONSTRAINT "personal_expense_reference_tags_reference_id_fkey" FOREIGN KEY ("reference_id") REFERENCES "personal_expense_references"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "personal_expense_reference_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "taxonomy_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "personal_reference_receipts" (
  "id" UUID NOT NULL,
  "space_id" UUID NOT NULL,
  "actor_user_id" UUID NOT NULL,
  "request_id" UUID NOT NULL,
  "action" "PersonalReferenceAction" NOT NULL,
  "payload_hash" VARCHAR(64) NOT NULL,
  "response" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "personal_reference_receipts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "personal_reference_receipts_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "financial_spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "personal_reference_receipts_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "personal_expense_references_personal_space_id_status_idx" ON "personal_expense_references"("personal_space_id", "status");
CREATE INDEX "personal_expense_references_source_expense_id_status_idx" ON "personal_expense_references"("source_expense_id", "status");
CREATE INDEX "personal_expense_references_owner_user_id_status_idx" ON "personal_expense_references"("owner_user_id", "status");
CREATE UNIQUE INDEX "personal_reference_receipts_space_id_actor_user_id_request_id_key" ON "personal_reference_receipts"("space_id", "actor_user_id", "request_id");

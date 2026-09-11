-- CreateEnum
CREATE TYPE "TaxonomyKind" AS ENUM ('CATEGORY', 'TAG');

-- CreateEnum
CREATE TYPE "TaxonomyScope" AS ENUM ('SYSTEM', 'PERSONAL', 'GROUP');

-- CreateEnum
CREATE TYPE "TaxonomyStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'MERGED');

-- CreateEnum
CREATE TYPE "TaxonomyAction" AS ENUM ('CREATE', 'RENAME', 'MERGE', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "ExpenseMutationAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SpaceAuditAction" ADD VALUE 'EXPENSE_CREATED';
ALTER TYPE "SpaceAuditAction" ADD VALUE 'EXPENSE_UPDATED';
ALTER TYPE "SpaceAuditAction" ADD VALUE 'EXPENSE_DELETED';

-- CreateTable
CREATE TABLE "taxonomy_terms" (
    "id" UUID NOT NULL,
    "kind" "TaxonomyKind" NOT NULL,
    "scope" "TaxonomyScope" NOT NULL,
    "scope_key" VARCHAR(64) NOT NULL,
    "owner_user_id" UUID,
    "group_id" UUID,
    "system_key" VARCHAR(64),
    "name" VARCHAR(60) NOT NULL,
    "normalized_name" VARCHAR(120) NOT NULL,
    "translations" JSONB NOT NULL DEFAULT '{}',
    "category_keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "TaxonomyStatus" NOT NULL DEFAULT 'ACTIVE',
    "merged_into_id" UUID,
    "created_by_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "taxonomy_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taxonomy_audit_events" (
    "id" UUID NOT NULL,
    "term_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "action" "TaxonomyAction" NOT NULL,
    "before" JSONB,
    "after" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "taxonomy_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_records" (
    "id" UUID NOT NULL,
    "space_id" UUID NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "occurred_on" DATE NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "note" VARCHAR(2000),
    "category_id" UUID NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by_id" UUID NOT NULL,
    "updated_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "expense_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_record_tags" (
    "expense_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "expense_record_tags_pkey" PRIMARY KEY ("expense_id","tag_id")
);

-- CreateTable
CREATE TABLE "expense_mutation_receipts" (
    "id" UUID NOT NULL,
    "space_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "action" "ExpenseMutationAction" NOT NULL,
    "payload_hash" VARCHAR(64) NOT NULL,
    "response" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_mutation_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "taxonomy_terms_system_key_key" ON "taxonomy_terms"("system_key");

-- CreateIndex
CREATE INDEX "taxonomy_terms_scope_key_kind_status_idx" ON "taxonomy_terms"("scope_key", "kind", "status");

-- CreateIndex
CREATE INDEX "taxonomy_audit_events_term_id_created_at_idx" ON "taxonomy_audit_events"("term_id", "created_at");

-- CreateIndex
CREATE INDEX "expense_records_space_id_status_occurred_on_id_idx" ON "expense_records"("space_id", "status", "occurred_on", "id");

-- CreateIndex
CREATE UNIQUE INDEX "expense_mutation_receipts_space_id_actor_user_id_request_id_key" ON "expense_mutation_receipts"("space_id", "actor_user_id", "request_id");

-- AddForeignKey
ALTER TABLE "taxonomy_terms" ADD CONSTRAINT "taxonomy_terms_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taxonomy_terms" ADD CONSTRAINT "taxonomy_terms_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taxonomy_terms" ADD CONSTRAINT "taxonomy_terms_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taxonomy_terms" ADD CONSTRAINT "taxonomy_terms_merged_into_id_fkey" FOREIGN KEY ("merged_into_id") REFERENCES "taxonomy_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taxonomy_audit_events" ADD CONSTRAINT "taxonomy_audit_events_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "taxonomy_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taxonomy_audit_events" ADD CONSTRAINT "taxonomy_audit_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_records" ADD CONSTRAINT "expense_records_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "financial_spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_records" ADD CONSTRAINT "expense_records_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "taxonomy_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_records" ADD CONSTRAINT "expense_records_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_records" ADD CONSTRAINT "expense_records_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_record_tags" ADD CONSTRAINT "expense_record_tags_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expense_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_record_tags" ADD CONSTRAINT "expense_record_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "taxonomy_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_mutation_receipts" ADD CONSTRAINT "expense_mutation_receipts_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "financial_spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_mutation_receipts" ADD CONSTRAINT "expense_mutation_receipts_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE taxonomy_terms ADD CONSTRAINT taxonomy_scope_check CHECK (
 (scope='SYSTEM' AND owner_user_id IS NULL AND group_id IS NULL AND system_key IS NOT NULL AND created_by_id IS NULL AND scope_key='SYSTEM') OR
 (scope='PERSONAL' AND owner_user_id IS NOT NULL AND group_id IS NULL AND system_key IS NULL AND created_by_id IS NOT NULL AND scope_key='PERSONAL:' || owner_user_id::text) OR
 (scope='GROUP' AND group_id IS NOT NULL AND owner_user_id IS NULL AND system_key IS NULL AND created_by_id IS NOT NULL AND scope_key='GROUP:' || group_id::text)
);
ALTER TABLE taxonomy_terms ADD CONSTRAINT taxonomy_merge_check CHECK (
 (status='MERGED' AND merged_into_id IS NOT NULL AND merged_into_id<>id) OR
 (status<>'MERGED' AND merged_into_id IS NULL)
);
CREATE UNIQUE INDEX taxonomy_active_name ON taxonomy_terms(scope_key,kind,normalized_name) WHERE status='ACTIVE';
ALTER TABLE taxonomy_terms ADD CONSTRAINT taxonomy_version_check CHECK(version>0);
ALTER TABLE expense_records ADD CONSTRAINT expense_amount_positive CHECK(amount_minor>0);
ALTER TABLE expense_records ADD CONSTRAINT expense_version_positive CHECK(version>0);

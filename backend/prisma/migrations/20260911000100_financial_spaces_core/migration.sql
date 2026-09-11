-- CreateEnum
CREATE TYPE "FinancialSpaceMode" AS ENUM ('PERSONAL_EXPENSES', 'SHARED_EXPENSES', 'POOLED_FUND');

-- CreateEnum
CREATE TYPE "FinancialSpaceStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SpaceParticipantRole" AS ENUM ('MANAGER', 'PARTICIPANT');

-- CreateEnum
CREATE TYPE "SpaceAuditAction" AS ENUM ('CREATE', 'UPDATE', 'PARTICIPANT_ADDED', 'PARTICIPANT_ENDED', 'ROLE_CHANGED', 'ARCHIVE');

-- CreateTable
CREATE TABLE "financial_spaces" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "mode" "FinancialSpaceMode" NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "timezone" VARCHAR(100) NOT NULL DEFAULT 'Asia/Taipei',
    "opened_on" DATE NOT NULL,
    "group_id" UUID,
    "owner_user_id" UUID,
    "created_by_id" UUID NOT NULL,
    "status" "FinancialSpaceStatus" NOT NULL DEFAULT 'ACTIVE',
    "first_formal_record_at" TIMESTAMPTZ(6),
    "archived_at" TIMESTAMPTZ(6),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "financial_spaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_participants" (
    "id" UUID NOT NULL,
    "space_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "SpaceParticipantRole" NOT NULL DEFAULT 'PARTICIPANT',
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "space_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_audit_events" (
    "id" UUID NOT NULL,
    "space_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "action" "SpaceAuditAction" NOT NULL,
    "before" JSONB,
    "after" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "space_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "financial_spaces_group_id_status_idx" ON "financial_spaces"("group_id", "status");

-- CreateIndex
CREATE INDEX "financial_spaces_owner_user_id_status_idx" ON "financial_spaces"("owner_user_id", "status");

-- CreateIndex
CREATE INDEX "space_participants_space_id_user_id_effective_from_idx" ON "space_participants"("space_id", "user_id", "effective_from");

-- CreateIndex
CREATE INDEX "space_participants_user_id_effective_to_idx" ON "space_participants"("user_id", "effective_to");

-- CreateIndex
CREATE INDEX "space_audit_events_space_id_created_at_idx" ON "space_audit_events"("space_id", "created_at");

-- AddForeignKey
ALTER TABLE "financial_spaces" ADD CONSTRAINT "financial_spaces_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_spaces" ADD CONSTRAINT "financial_spaces_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_spaces" ADD CONSTRAINT "financial_spaces_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_participants" ADD CONSTRAINT "space_participants_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "financial_spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_participants" ADD CONSTRAINT "space_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_audit_events" ADD CONSTRAINT "space_audit_events_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "financial_spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_audit_events" ADD CONSTRAINT "space_audit_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE financial_spaces ADD CONSTRAINT space_scope_check CHECK (
 (mode = 'PERSONAL_EXPENSES' AND owner_user_id IS NOT NULL AND group_id IS NULL)
 OR (mode IN ('SHARED_EXPENSES','POOLED_FUND') AND owner_user_id IS NULL AND group_id IS NOT NULL)
);
ALTER TABLE financial_spaces ADD CONSTRAINT space_currency_check
 CHECK (currency ~ '^[A-Z]{3}$');
ALTER TABLE financial_spaces ADD CONSTRAINT space_archive_check CHECK (
 (status = 'ACTIVE' AND archived_at IS NULL) OR
 (status = 'ARCHIVED' AND archived_at IS NOT NULL)
);
ALTER TABLE financial_spaces ADD CONSTRAINT space_version_check CHECK (version > 0);
ALTER TABLE space_participants ADD CONSTRAINT participation_interval_check
 CHECK (effective_to IS NULL OR effective_to >= effective_from);
CREATE UNIQUE INDEX space_one_current_participation
 ON space_participants(space_id,user_id) WHERE effective_to IS NULL;
CREATE OR REPLACE FUNCTION protect_financial_space_identity() RETURNS trigger AS $$
BEGIN
 IF NEW.group_id IS DISTINCT FROM OLD.group_id OR
    NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id THEN
   RAISE EXCEPTION 'SPACE_SCOPE_IMMUTABLE';
 END IF;
 IF OLD.first_formal_record_at IS NOT NULL AND (
    NEW.mode IS DISTINCT FROM OLD.mode OR
    NEW.currency IS DISTINCT FROM OLD.currency OR
    NEW.timezone IS DISTINCT FROM OLD.timezone OR
    NEW.opened_on IS DISTINCT FROM OLD.opened_on OR
    NEW.first_formal_record_at IS DISTINCT FROM OLD.first_formal_record_at) THEN
   RAISE EXCEPTION 'SPACE_FINANCIAL_IDENTITY_LOCKED';
 END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER financial_space_identity_guard BEFORE UPDATE ON financial_spaces
 FOR EACH ROW EXECUTE FUNCTION protect_financial_space_identity();

ALTER TABLE "financial_spaces" DROP CONSTRAINT "space_archive_check";

ALTER TABLE "financial_spaces" ADD CONSTRAINT "space_archive_check" CHECK (
  (status IN ('ACTIVE', 'CLOSING') AND archived_at IS NULL) OR
  (status = 'ARCHIVED' AND archived_at IS NOT NULL)
);

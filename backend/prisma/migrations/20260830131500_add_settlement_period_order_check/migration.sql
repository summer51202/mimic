-- Enforce the period ordering rule for every future settlement insert or update.
--
-- This is intentionally NOT VALID: legacy PENDING rows may predate service-level
-- validation and have period_start > period_end. PostgreSQL will enforce the
-- constraint for new and modified rows without mutating or scanning legacy data.
-- Before a future migration runs VALIDATE CONSTRAINT, deployment must perform a
-- preflight audit and resolve every row returned by:
-- SELECT id FROM "settlements"
-- WHERE "period_start" IS NOT NULL
--   AND "period_end" IS NOT NULL
--   AND "period_start" > "period_end";

ALTER TABLE "settlements"
ADD CONSTRAINT "settlements_period_order_check"
CHECK (
  "period_start" IS NULL
  OR "period_end" IS NULL
  OR "period_start" <= "period_end"
) NOT VALID;

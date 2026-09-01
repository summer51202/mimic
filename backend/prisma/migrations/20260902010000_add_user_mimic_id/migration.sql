ALTER TABLE "users" ADD COLUMN "mimic_id" VARCHAR(15);

DO $$
DECLARE
  current_user_row RECORD;
  random_body TEXT;
  candidate TEXT;
BEGIN
  FOR current_user_row IN
    SELECT "id"
    FROM "users"
    ORDER BY "created_at", "id"
  LOOP
    LOOP
      random_body := upper(
        translate(replace(gen_random_uuid()::text, '-', ''), '01', '23')
      );
      candidate :=
        'MIMIC-' || substr(random_body, 1, 4) || '-' || substr(random_body, 5, 4);

      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM "users" WHERE "mimic_id" = candidate
      );
    END LOOP;

    UPDATE "users"
    SET "mimic_id" = candidate
    WHERE "id" = current_user_row."id";
  END LOOP;
END $$;

ALTER TABLE "users" ALTER COLUMN "mimic_id" SET NOT NULL;

CREATE UNIQUE INDEX "users_mimic_id_key" ON "users"("mimic_id");

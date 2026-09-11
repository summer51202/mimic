CREATE TABLE "shared_expense_payers" (
  "expense_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "amount_minor" BIGINT NOT NULL CHECK ("amount_minor" > 0),
  CONSTRAINT "shared_expense_payers_pkey" PRIMARY KEY ("expense_id", "user_id"),
  CONSTRAINT "shared_expense_payers_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expense_records"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "shared_expense_payers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "shared_expense_allocations" (
  "expense_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "amount_minor" BIGINT NOT NULL CHECK ("amount_minor" >= 0),
  CONSTRAINT "shared_expense_allocations_pkey" PRIMARY KEY ("expense_id", "user_id"),
  CONSTRAINT "shared_expense_allocations_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expense_records"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "shared_expense_allocations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "shared_expense_payers_user_id_idx" ON "shared_expense_payers"("user_id");
CREATE INDEX "shared_expense_allocations_user_id_idx" ON "shared_expense_allocations"("user_id");

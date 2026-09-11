-- A CHECK expression evaluating to NULL passes in PostgreSQL. Require the
-- receipt timestamp explicitly rather than relying only on timestamp ordering.
ALTER TABLE "shared_settlement_transfers" ADD CONSTRAINT "shared_transfer_receipt_timestamp"
  CHECK ("status" <> 'COMPLETED' OR "received_at" IS NOT NULL);

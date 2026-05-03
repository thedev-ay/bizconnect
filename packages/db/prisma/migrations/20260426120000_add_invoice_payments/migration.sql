ALTER TABLE "invoices"
ADD COLUMN "amount_paid" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN "balance_due" DECIMAL(10,2) NOT NULL DEFAULT 0;

UPDATE "invoices"
SET
  "amount_paid" = CASE
    WHEN "status" = 'paid' THEN "total"
    ELSE 0
  END,
  "balance_due" = CASE
    WHEN "status" = 'paid' THEN 0
    ELSE "total"
  END;

CREATE TABLE "invoice_payments" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "branch_id" TEXT,
  "invoice_id" TEXT NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "payment_method" TEXT NOT NULL DEFAULT 'cash',
  "notes" TEXT,
  "received_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "invoice_payments_pkey" PRIMARY KEY ("id")
);

INSERT INTO "invoice_payments" (
  "id",
  "tenant_id",
  "branch_id",
  "invoice_id",
  "amount",
  "payment_method",
  "notes",
  "received_at",
  "created_at"
)
SELECT
  substr(md5("id" || '-paid-migration'), 1, 25),
  "tenant_id",
  "branch_id",
  "id",
  "total",
  'cash',
  'Backfilled from existing paid invoice',
  COALESCE("paid_at", "updated_at", "created_at"),
  COALESCE("paid_at", "updated_at", "created_at")
FROM "invoices"
WHERE "status" = 'paid';

CREATE INDEX "invoice_payments_tenant_id_idx" ON "invoice_payments"("tenant_id");
CREATE INDEX "invoice_payments_tenant_id_branch_id_idx" ON "invoice_payments"("tenant_id", "branch_id");
CREATE INDEX "invoice_payments_invoice_id_idx" ON "invoice_payments"("invoice_id");
CREATE INDEX "invoice_payments_tenant_id_received_at_idx" ON "invoice_payments"("tenant_id", "received_at");

ALTER TABLE "invoice_payments"
ADD CONSTRAINT "invoice_payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

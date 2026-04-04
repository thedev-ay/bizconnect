ALTER TABLE "invoices"
ADD COLUMN "customer_id" TEXT,
ADD COLUMN "job_order_id" TEXT;

ALTER TABLE "job_orders"
ADD COLUMN "customer_id" TEXT;

CREATE INDEX "invoices_customer_id_idx" ON "invoices"("customer_id");
CREATE UNIQUE INDEX "invoices_job_order_id_key" ON "invoices"("job_order_id");
CREATE INDEX "job_orders_customer_id_idx" ON "job_orders"("customer_id");

ALTER TABLE "invoices"
ADD CONSTRAINT "invoices_customer_id_fkey"
FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoices"
ADD CONSTRAINT "invoices_job_order_id_fkey"
FOREIGN KEY ("job_order_id") REFERENCES "job_orders"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "job_orders"
ADD CONSTRAINT "job_orders_customer_id_fkey"
FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

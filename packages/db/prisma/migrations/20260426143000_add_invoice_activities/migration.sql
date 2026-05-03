CREATE TABLE "invoice_activities" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "branch_id" TEXT,
  "invoice_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "invoice_activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "invoice_activities_tenant_id_idx" ON "invoice_activities"("tenant_id");
CREATE INDEX "invoice_activities_tenant_id_branch_id_idx" ON "invoice_activities"("tenant_id", "branch_id");
CREATE INDEX "invoice_activities_invoice_id_idx" ON "invoice_activities"("invoice_id");
CREATE INDEX "invoice_activities_tenant_id_created_at_idx" ON "invoice_activities"("tenant_id", "created_at");

ALTER TABLE "invoice_activities"
ADD CONSTRAINT "invoice_activities_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

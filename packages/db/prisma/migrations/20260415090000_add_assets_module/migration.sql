-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "customer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "asset_type" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "identifier" TEXT,
    "serial_no" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "job_orders" ADD COLUMN "asset_id" TEXT;

-- CreateIndex
CREATE INDEX "assets_tenant_id_idx" ON "assets"("tenant_id");
CREATE INDEX "assets_tenant_id_branch_id_idx" ON "assets"("tenant_id", "branch_id");
CREATE INDEX "assets_tenant_id_customer_id_idx" ON "assets"("tenant_id", "customer_id");
CREATE INDEX "assets_tenant_id_status_idx" ON "assets"("tenant_id", "status");
CREATE INDEX "job_orders_asset_id_idx" ON "job_orders"("asset_id");

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "assets" ADD CONSTRAINT "assets_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assets" ADD CONSTRAINT "assets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_orders" ADD CONSTRAINT "job_orders_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "sale_items" DROP CONSTRAINT "sale_items_item_id_fkey";

-- AlterTable
ALTER TABLE "sale_items" ADD COLUMN     "item_type" TEXT NOT NULL DEFAULT 'product',
ADD COLUMN     "weight" DECIMAL(10,3),
ALTER COLUMN "item_id" DROP NOT NULL,
ALTER COLUMN "original_price" SET DEFAULT 0;

-- CreateTable
CREATE TABLE "service_catalog" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pricing_type" TEXT NOT NULL DEFAULT 'per_piece',
    "price" DECIMAL(10,2) NOT NULL,
    "category" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_catalog_tenant_id_idx" ON "service_catalog"("tenant_id");

-- CreateIndex
CREATE INDEX "service_catalog_tenant_id_is_active_idx" ON "service_catalog"("tenant_id", "is_active");

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_catalog" ADD CONSTRAINT "service_catalog_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

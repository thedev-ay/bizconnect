/*
  Warnings:

  - Added the required column `original_price` to the `sale_items` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "sale_items" ADD COLUMN "original_price" DECIMAL(10,2);
UPDATE "sale_items" SET "original_price" = "unit_price";
ALTER TABLE "sale_items" ALTER COLUMN "original_price" SET NOT NULL;
ALTER TABLE "sale_items" ADD COLUMN "promo_discount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "promotions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "value" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "buy_qty" INTEGER,
    "get_qty" INTEGER,
    "days_of_week" JSONB,
    "start_time" TEXT,
    "end_time" TEXT,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_items" (
    "id" TEXT NOT NULL,
    "promotion_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,

    CONSTRAINT "promotion_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "promotions_tenant_id_idx" ON "promotions"("tenant_id");

-- CreateIndex
CREATE INDEX "promotions_tenant_id_is_active_idx" ON "promotions"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "promotion_items_promotion_id_item_id_key" ON "promotion_items"("promotion_id", "item_id");

-- AddForeignKey
ALTER TABLE "promotion_items" ADD CONSTRAINT "promotion_items_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_items" ADD CONSTRAINT "promotion_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

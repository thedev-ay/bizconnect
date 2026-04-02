/*
  Warnings:

  - You are about to drop the column `description` on the `job_orders` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "job_orders" DROP COLUMN "description",
ADD COLUMN     "claimed_at" TIMESTAMP(3),
ADD COLUMN     "contact_no" TEXT,
ADD COLUMN     "notes" TEXT,
ALTER COLUMN "status" SET DEFAULT 'received';

-- CreateTable
CREATE TABLE "job_order_items" (
    "id" TEXT NOT NULL,
    "job_order_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "weight" DECIMAL(10,3),
    "unit_price" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "job_order_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "job_order_items" ADD CONSTRAINT "job_order_items_job_order_id_fkey" FOREIGN KEY ("job_order_id") REFERENCES "job_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

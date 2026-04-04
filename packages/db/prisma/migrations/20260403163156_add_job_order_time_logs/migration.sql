/*
  Warnings:

  - Added the required column `tenant_id` to the `job_order_time_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `job_order_time_logs` table without a default value. This is not possible if the table is not empty.
  - Made the column `recorded_by` on table `job_order_time_logs` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "job_order_time_logs" DROP CONSTRAINT "job_order_time_logs_job_order_id_fkey";

-- AlterTable
ALTER TABLE "job_order_time_logs" ADD COLUMN     "tenant_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "recorded_by" SET NOT NULL;

-- CreateIndex
CREATE INDEX "job_order_time_logs_tenant_id_idx" ON "job_order_time_logs"("tenant_id");

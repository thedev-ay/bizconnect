-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "branch_id" TEXT;

-- AlterTable
ALTER TABLE "attendance" ADD COLUMN     "branch_id" TEXT;

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "branch_id" TEXT;

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "home_branch_id" TEXT;

-- AlterTable
ALTER TABLE "inventory_adjustments" ADD COLUMN     "branch_id" TEXT;

-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "branch_id" TEXT;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "branch_id" TEXT;

-- AlterTable
ALTER TABLE "job_orders" ADD COLUMN     "branch_id" TEXT;

-- AlterTable
ALTER TABLE "leave_requests" ADD COLUMN     "branch_id" TEXT;

-- AlterTable
ALTER TABLE "payroll_records" ADD COLUMN     "branch_id" TEXT;

-- AlterTable
ALTER TABLE "sale_returns" ADD COLUMN     "branch_id" TEXT;

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "branch_id" TEXT;

-- AlterTable
ALTER TABLE "shifts" ADD COLUMN     "branch_id" TEXT;

-- AlterTable
ALTER TABLE "workflow_stages" ADD COLUMN     "branch_id" TEXT;

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_branch_assignments" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_branch_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "branches_tenant_id_idx" ON "branches"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "branches_tenant_id_slug_key" ON "branches"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "employee_branch_assignments_employee_id_idx" ON "employee_branch_assignments"("employee_id");

-- CreateIndex
CREATE INDEX "employee_branch_assignments_branch_id_idx" ON "employee_branch_assignments"("branch_id");

-- CreateIndex
CREATE INDEX "appointments_tenant_id_branch_id_idx" ON "appointments"("tenant_id", "branch_id");

-- CreateIndex
CREATE INDEX "customers_tenant_id_branch_id_idx" ON "customers"("tenant_id", "branch_id");

-- CreateIndex
CREATE INDEX "employees_tenant_id_home_branch_id_idx" ON "employees"("tenant_id", "home_branch_id");

-- CreateIndex
CREATE INDEX "inventory_adjustments_tenant_id_branch_id_idx" ON "inventory_adjustments"("tenant_id", "branch_id");

-- CreateIndex
CREATE INDEX "inventory_items_tenant_id_branch_id_idx" ON "inventory_items"("tenant_id", "branch_id");

-- CreateIndex
CREATE INDEX "invoices_tenant_id_branch_id_idx" ON "invoices"("tenant_id", "branch_id");

-- CreateIndex
CREATE INDEX "job_orders_tenant_id_branch_id_idx" ON "job_orders"("tenant_id", "branch_id");

-- CreateIndex
CREATE INDEX "sales_tenant_id_branch_id_idx" ON "sales"("tenant_id", "branch_id");

-- CreateIndex
CREATE INDEX "workflow_stages_tenant_id_branch_id_idx" ON "workflow_stages"("tenant_id", "branch_id");

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_branch_assignments" ADD CONSTRAINT "employee_branch_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_branch_assignments" ADD CONSTRAINT "employee_branch_assignments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_home_branch_id_fkey" FOREIGN KEY ("home_branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;


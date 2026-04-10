ALTER TABLE "job_orders" DROP COLUMN IF EXISTS "assigned_to";

CREATE TABLE "job_order_assignments" (
    "id" TEXT NOT NULL,
    "job_order_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "employee_name" TEXT NOT NULL,
    CONSTRAINT "job_order_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "job_order_assignments_job_order_id_employee_id_key" ON "job_order_assignments"("job_order_id", "employee_id");
CREATE INDEX "job_order_assignments_job_order_id_idx" ON "job_order_assignments"("job_order_id");

ALTER TABLE "job_order_assignments" ADD CONSTRAINT "job_order_assignments_job_order_id_fkey" FOREIGN KEY ("job_order_id") REFERENCES "job_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_order_assignments" ADD CONSTRAINT "job_order_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

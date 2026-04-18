ALTER TABLE "services"
ADD COLUMN "available_for_appointments" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "available_for_job_orders" BOOLEAN NOT NULL DEFAULT true;

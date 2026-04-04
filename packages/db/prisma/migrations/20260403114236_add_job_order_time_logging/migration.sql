-- CreateTable
CREATE TABLE "job_order_time_logs" (
    "id" TEXT NOT NULL,
    "job_order_id" TEXT NOT NULL,
    "task_name" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "duration" INTEGER,
    "notes" TEXT,
    "recorded_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_order_time_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_order_time_logs_job_order_id_idx" ON "job_order_time_logs"("job_order_id");

-- CreateIndex
CREATE INDEX "job_order_time_logs_created_at_idx" ON "job_order_time_logs"("created_at");

-- AddForeignKey
ALTER TABLE "job_order_time_logs" ADD CONSTRAINT "job_order_time_logs_job_order_id_fkey" FOREIGN KEY ("job_order_id") REFERENCES "job_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

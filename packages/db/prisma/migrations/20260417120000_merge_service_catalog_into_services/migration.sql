ALTER TABLE "services"
ADD COLUMN "pricing_type" TEXT NOT NULL DEFAULT 'flat',
ADD COLUMN "category" TEXT,
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "services_tenant_id_is_active_idx" ON "services"("tenant_id", "is_active");

INSERT INTO "services" (
  "id",
  "tenant_id",
  "name",
  "description",
  "duration",
  "pricing_type",
  "price",
  "category",
  "is_active",
  "created_at",
  "updated_at"
)
SELECT
  sc."id",
  sc."tenant_id",
  sc."name",
  sc."description",
  60,
  sc."pricing_type",
  sc."price",
  sc."category",
  sc."is_active",
  sc."created_at",
  sc."updated_at"
FROM "service_catalog" sc
WHERE NOT EXISTS (
  SELECT 1
  FROM "services" s
  WHERE s."tenant_id" = sc."tenant_id"
    AND LOWER(s."name") = LOWER(sc."name")
);

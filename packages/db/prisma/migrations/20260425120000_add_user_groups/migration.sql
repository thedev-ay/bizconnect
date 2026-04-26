CREATE TABLE "user_groups" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_groups_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "users" ADD COLUMN "user_group_id" TEXT;

CREATE INDEX "user_groups_tenant_id_idx" ON "user_groups"("tenant_id");
CREATE UNIQUE INDEX "user_groups_tenant_id_name_key" ON "user_groups"("tenant_id", "name");
CREATE INDEX "users_user_group_id_idx" ON "users"("user_group_id");

ALTER TABLE "user_groups" ADD CONSTRAINT "user_groups_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_user_group_id_fkey" FOREIGN KEY ("user_group_id") REFERENCES "user_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

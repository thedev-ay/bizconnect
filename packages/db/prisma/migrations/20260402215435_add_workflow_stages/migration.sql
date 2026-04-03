-- CreateTable
CREATE TABLE "workflow_stages" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'zinc',
    "sort_order" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "workflow_stages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workflow_stages_tenant_id_idx" ON "workflow_stages"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_stages_tenant_id_slug_key" ON "workflow_stages"("tenant_id", "slug");

-- AddForeignKey
ALTER TABLE "workflow_stages" ADD CONSTRAINT "workflow_stages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default workflow stages for all existing tenants
INSERT INTO "workflow_stages" ("id", "tenant_id", "name", "slug", "color", "sort_order", "type")
SELECT gen_random_uuid()::text, t.id, 'Received',  'received', 'zinc',    0, 'active'    FROM tenants t ON CONFLICT DO NOTHING;
INSERT INTO "workflow_stages" ("id", "tenant_id", "name", "slug", "color", "sort_order", "type")
SELECT gen_random_uuid()::text, t.id, 'Washing',   'washing',  'blue',    1, 'active'    FROM tenants t ON CONFLICT DO NOTHING;
INSERT INTO "workflow_stages" ("id", "tenant_id", "name", "slug", "color", "sort_order", "type")
SELECT gen_random_uuid()::text, t.id, 'Drying',    'drying',   'orange',  2, 'active'    FROM tenants t ON CONFLICT DO NOTHING;
INSERT INTO "workflow_stages" ("id", "tenant_id", "name", "slug", "color", "sort_order", "type")
SELECT gen_random_uuid()::text, t.id, 'Folding',   'folding',  'violet',  3, 'active'    FROM tenants t ON CONFLICT DO NOTHING;
INSERT INTO "workflow_stages" ("id", "tenant_id", "name", "slug", "color", "sort_order", "type")
SELECT gen_random_uuid()::text, t.id, 'Ready',     'ready',    'emerald', 4, 'active'    FROM tenants t ON CONFLICT DO NOTHING;
INSERT INTO "workflow_stages" ("id", "tenant_id", "name", "slug", "color", "sort_order", "type")
SELECT gen_random_uuid()::text, t.id, 'Claimed',   'claimed',  'zinc',    5, 'completed' FROM tenants t ON CONFLICT DO NOTHING;
INSERT INTO "workflow_stages" ("id", "tenant_id", "name", "slug", "color", "sort_order", "type")
SELECT gen_random_uuid()::text, t.id, 'Cancelled', 'cancelled','red',     6, 'cancelled' FROM tenants t ON CONFLICT DO NOTHING;

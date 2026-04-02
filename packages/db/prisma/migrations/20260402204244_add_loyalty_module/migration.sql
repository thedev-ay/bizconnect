-- CreateTable
CREATE TABLE "loyalty_settings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "stamps_per_reward" INTEGER NOT NULL DEFAULT 10,
    "reward_description" TEXT NOT NULL DEFAULT '1 Free Wash',
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "loyalty_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_cards" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "phone" TEXT,
    "current_stamps" INTEGER NOT NULL DEFAULT 0,
    "total_stamps" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_stamps" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_stamps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_redemptions" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "stamps_used" INTEGER NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_settings_tenant_id_key" ON "loyalty_settings"("tenant_id");

-- CreateIndex
CREATE INDEX "loyalty_cards_tenant_id_idx" ON "loyalty_cards"("tenant_id");

-- CreateIndex
CREATE INDEX "loyalty_cards_tenant_id_phone_idx" ON "loyalty_cards"("tenant_id", "phone");

-- CreateIndex
CREATE INDEX "loyalty_stamps_card_id_idx" ON "loyalty_stamps"("card_id");

-- CreateIndex
CREATE INDEX "loyalty_redemptions_card_id_idx" ON "loyalty_redemptions"("card_id");

-- AddForeignKey
ALTER TABLE "loyalty_settings" ADD CONSTRAINT "loyalty_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_cards" ADD CONSTRAINT "loyalty_cards_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_stamps" ADD CONSTRAINT "loyalty_stamps_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "loyalty_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_redemptions" ADD CONSTRAINT "loyalty_redemptions_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "loyalty_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

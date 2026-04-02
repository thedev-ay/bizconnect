"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bizconnect/db";
import { authorize } from "@/lib/authorize";
import { createCardSchema, saveLoyaltySettingsSchema, type CreateCardInput, type SaveLoyaltySettingsInput } from "./schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function createLoyaltyCard(
  tenantSlug: string,
  tenantId: string,
  input: CreateCardInput
) {
  await authorize(tenantSlug, "loyalty.create");
  const parsed = createCardSchema.parse(input);

  const card = await db.loyaltyCard.create({
    data: {
      tenantId,
      customerName: parsed.customerName,
      phone: parsed.phone?.trim() || null,
      currentStamps: 0,
      totalStamps: 0,
    },
  });

  revalidatePath(`/${tenantSlug}/loyalty`);
  return card;
}

export async function addStamp(
  tenantSlug: string,
  tenantId: string,
  cardId: string,
  note?: string
) {
  await authorize(tenantSlug, "loyalty.stamp");

  await prisma.$transaction(async (tx) => {
    const card = await (tx as any).loyaltyCard.findUnique({
      where: { id: cardId, tenantId },
      select: { currentStamps: true, totalStamps: true },
    });
    if (!card) throw new Error("Card not found");

    await (tx as any).loyaltyCard.update({
      where: { id: cardId },
      data: {
        currentStamps: card.currentStamps + 1,
        totalStamps: card.totalStamps + 1,
      },
    });

    await (tx as any).loyaltyStamp.create({
      data: { cardId, note: note ?? null },
    });
  });

  revalidatePath(`/${tenantSlug}/loyalty`);
}

export async function redeemReward(
  tenantSlug: string,
  tenantId: string,
  cardId: string,
  stampsPerReward: number,
  note?: string
) {
  await authorize(tenantSlug, "loyalty.redeem");

  await prisma.$transaction(async (tx) => {
    const card = await (tx as any).loyaltyCard.findUnique({
      where: { id: cardId, tenantId },
      select: { currentStamps: true },
    });
    if (!card) throw new Error("Card not found");
    if (card.currentStamps < stampsPerReward) {
      throw new Error(`Need ${stampsPerReward} stamps to redeem`);
    }

    await (tx as any).loyaltyCard.update({
      where: { id: cardId },
      data: { currentStamps: card.currentStamps - stampsPerReward },
    });

    await (tx as any).loyaltyRedemption.create({
      data: { cardId, stampsUsed: stampsPerReward, note: note ?? null },
    });
  });

  revalidatePath(`/${tenantSlug}/loyalty`);
}

export async function saveLoyaltySettings(
  tenantSlug: string,
  tenantId: string,
  input: SaveLoyaltySettingsInput
) {
  await authorize(tenantSlug, "loyalty.settings");
  const parsed = saveLoyaltySettingsSchema.parse(input);

  await db.loyaltySetting.upsert({
    where: { tenantId },
    create: { tenantId, ...parsed },
    update: parsed,
  });

  revalidatePath(`/${tenantSlug}/loyalty`);
}

export async function deleteLoyaltyCard(
  tenantSlug: string,
  tenantId: string,
  cardId: string
) {
  await authorize(tenantSlug, "loyalty.create");
  await db.loyaltyCard.delete({ where: { id: cardId, tenantId } });
  revalidatePath(`/${tenantSlug}/loyalty`);
}

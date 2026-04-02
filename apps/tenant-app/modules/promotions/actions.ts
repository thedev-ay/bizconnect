"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bizconnect/db";
import { authorize } from "@/lib/authorize";
import { promotionSchema, type PromotionInput } from "./schema";

export async function createPromotion(tenantSlug: string, tenantId: string, input: PromotionInput) {
  await authorize(tenantSlug);
  const parsed = promotionSchema.parse(input);
  const { itemIds, startsAt, endsAt, ...data } = parsed;

  await prisma.promotion.create({
    data: {
      ...data,
      tenantId,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
      items: {
        create: itemIds.map((itemId) => ({ itemId })),
      },
    },
  });

  revalidatePath(`/${tenantSlug}/promotions`);
}

export async function updatePromotion(
  tenantSlug: string,
  tenantId: string,
  promotionId: string,
  input: PromotionInput
) {
  await authorize(tenantSlug);
  const parsed = promotionSchema.parse(input);
  const { itemIds, startsAt, endsAt, ...data } = parsed;

  await prisma.$transaction(async (tx) => {
    await tx.promotionItem.deleteMany({ where: { promotionId } });
    await tx.promotion.update({
      where: { id: promotionId, tenantId },
      data: {
        ...data,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
        items: {
          create: itemIds.map((itemId) => ({ itemId })),
        },
      },
    });
  });

  revalidatePath(`/${tenantSlug}/promotions`);
}

export async function togglePromotion(tenantSlug: string, tenantId: string, promotionId: string, isActive: boolean) {
  await authorize(tenantSlug);
  await prisma.promotion.update({
    where: { id: promotionId, tenantId },
    data: { isActive },
  });
  revalidatePath(`/${tenantSlug}/promotions`);
}

export async function deletePromotion(tenantSlug: string, tenantId: string, promotionId: string) {
  await authorize(tenantSlug);
  await prisma.promotion.delete({ where: { id: promotionId, tenantId } });
  revalidatePath(`/${tenantSlug}/promotions`);
}

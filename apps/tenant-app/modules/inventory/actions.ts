"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bizconnect/db";
import { authorize } from "@/lib/authorize";
import { createItemSchema, updateItemSchema, adjustStockSchema } from "./schema";
import type { CreateItemInput, UpdateItemInput } from "./schema";

export async function createItem(tenantSlug: string, tenantId: string, input: CreateItemInput) {
  await authorize(tenantSlug, "inventory.create");
  const parsed = createItemSchema.parse(input);

  await prisma.inventoryItem.create({
    data: {
      tenantId,
      ...parsed,
    },
  });

  revalidatePath(`/${tenantSlug}/inventory`);
}

export async function updateItem(
  tenantSlug: string,
  tenantId: string,
  itemId: string,
  input: UpdateItemInput
) {
  await authorize(tenantSlug, "inventory.edit");
  const parsed = updateItemSchema.parse(input);

  await prisma.inventoryItem.update({
    where: { id: itemId, tenantId },
    data: parsed,
  });

  revalidatePath(`/${tenantSlug}/inventory`);
}

export async function adjustStock(
  tenantSlug: string,
  tenantId: string,
  itemId: string,
  delta: number,
  reason?: string,
  userId?: string
) {
  await authorize(tenantSlug, "inventory.edit");

  await prisma.$transaction(async (tx) => {
    // Update inventory
    await tx.inventoryItem.update({
      where: { id: itemId, tenantId },
      data: { quantity: { increment: delta } },
    });

    // Log adjustment
    await tx.inventoryAdjustment.create({
      data: {
        tenantId,
        itemId,
        quantityChange: delta,
        reason: reason || "manual",
        adjustedById: userId,
      },
    });
  });

  revalidatePath(`/${tenantSlug}/inventory`);
}

export async function deleteItem(tenantSlug: string, tenantId: string, itemId: string) {
  await authorize(tenantSlug, "inventory.delete");
  await prisma.inventoryItem.delete({ where: { id: itemId, tenantId } });
  revalidatePath(`/${tenantSlug}/inventory`);
}

export async function getAdjustmentHistory(tenantSlug: string, tenantId: string, itemId: string) {
  await authorize(tenantSlug, "inventory.view");

  const adjustments = await prisma.inventoryAdjustment.findMany({
    where: { tenantId, itemId },
    orderBy: { createdAt: "desc" },
  });

  return adjustments;
}

"use server";

import { prisma } from "@bizconnect/db";
import { authorize } from "@/lib/authorize";
import { getActiveBranchId } from "@/lib/branch";
import { createItemSchema, updateItemSchema } from "./schema";
import type { CreateItemInput, UpdateItemInput } from "./schema";

export async function createItem(tenantSlug: string, tenantId: string, input: CreateItemInput) {
  await authorize(tenantSlug, "inventory.create");
  const parsed = createItemSchema.parse(input);
  const branchId = await getActiveBranchId();

  await prisma.inventoryItem.create({
    data: {
      tenantId,
      branchId: branchId ?? null,
      ...parsed,
    },
  });
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
  const branchId = await getActiveBranchId();

  await prisma.$transaction(async (tx) => {
    await tx.inventoryItem.update({
      where: { id: itemId, tenantId },
      data: { quantity: { increment: delta } },
    });

    await tx.inventoryAdjustment.create({
      data: {
        tenantId,
        branchId: branchId ?? null,
        itemId,
        quantityChange: delta,
        reason: reason || "manual",
        adjustedById: userId,
      },
    });
  });
}

export async function deleteItem(tenantSlug: string, tenantId: string, itemId: string) {
  await authorize(tenantSlug, "inventory.delete");
  await prisma.inventoryItem.delete({ where: { id: itemId, tenantId } });
}

export async function getAdjustmentHistory(tenantSlug: string, tenantId: string, itemId: string) {
  await authorize(tenantSlug, "inventory.view");

  const adjustments = await prisma.inventoryAdjustment.findMany({
    where: { tenantId, itemId },
    orderBy: { createdAt: "desc" },
  });

  return adjustments;
}

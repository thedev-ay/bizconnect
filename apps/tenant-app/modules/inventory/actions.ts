"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bizconnect/db";
import { auth } from "@/lib/auth";
import { createItemSchema, updateItemSchema, adjustStockSchema } from "./schema";
import type { CreateItemInput, UpdateItemInput } from "./schema";

async function authorize(tenantSlug: string) {
  const session = await auth();
  if (!session?.user || session.user.tenantSlug !== tenantSlug) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function createItem(tenantSlug: string, tenantId: string, input: CreateItemInput) {
  await authorize(tenantSlug);
  const parsed = createItemSchema.parse(input);

  const item = await prisma.inventoryItem.create({
    data: {
      tenantId,
      ...parsed,
    },
  });

  revalidatePath(`/${tenantSlug}/inventory`);
  return item;
}

export async function updateItem(
  tenantSlug: string,
  tenantId: string,
  itemId: string,
  input: UpdateItemInput
) {
  await authorize(tenantSlug);
  const parsed = updateItemSchema.parse(input);

  const item = await prisma.inventoryItem.update({
    where: { id: itemId, tenantId },
    data: parsed,
  });

  revalidatePath(`/${tenantSlug}/inventory`);
  return item;
}

export async function adjustStock(
  tenantSlug: string,
  tenantId: string,
  itemId: string,
  delta: number
) {
  await authorize(tenantSlug);

  const item = await prisma.inventoryItem.update({
    where: { id: itemId, tenantId },
    data: { quantity: { increment: delta } },
  });

  revalidatePath(`/${tenantSlug}/inventory`);
  return item;
}

export async function deleteItem(tenantSlug: string, tenantId: string, itemId: string) {
  await authorize(tenantSlug);
  await prisma.inventoryItem.delete({ where: { id: itemId, tenantId } });
  revalidatePath(`/${tenantSlug}/inventory`);
}

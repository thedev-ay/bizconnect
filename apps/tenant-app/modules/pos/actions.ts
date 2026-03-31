"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bizconnect/db";
import { auth } from "@/lib/auth";
import { createSaleSchema, type CreateSaleInput } from "./schema";
import { nanoid } from "@/lib/utils";

async function authorize(tenantSlug: string) {
  const session = await auth();
  if (!session?.user || session.user.tenantSlug !== tenantSlug) {
    throw new Error("Unauthorized");
  }
  return session;
}

function generateReferenceNo() {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `TXN-${date}-${rand}`;
}

export async function createSale(tenantSlug: string, tenantId: string, input: CreateSaleInput) {
  const session = await authorize(tenantSlug);
  const parsed = createSaleSchema.parse(input);

  const change = parsed.amountPaid - parsed.total;

  const sale = await prisma.$transaction(async (tx) => {
    // Create the sale record
    const newSale = await tx.sale.create({
      data: {
        tenantId,
        referenceNo: generateReferenceNo(),
        subtotal: parsed.subtotal,
        discount: parsed.discount,
        total: parsed.total,
        amountPaid: parsed.amountPaid,
        change: Math.max(0, change),
        paymentMethod: parsed.paymentMethod,
        status: "completed",
        servedById: session.user.id,
        items: {
          create: parsed.items.map((item) => ({
            itemId: item.itemId,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
          })),
        },
      },
      include: { items: true },
    });

    // Deduct stock for each item
    for (const item of parsed.items) {
      await tx.inventoryItem.updateMany({
        where: { id: item.itemId, tenantId },
        data: { quantity: { decrement: item.quantity } },
      });
    }

    return newSale;
  });

  revalidatePath(`/${tenantSlug}/pos`);
  return sale;
}

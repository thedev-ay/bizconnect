"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bizconnect/db";
import { authorize } from "@/lib/authorize";
import { createSaleSchema, type CreateSaleInput } from "./schema";
import { nanoid } from "@/lib/utils";

function generateReferenceNo() {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `TXN-${date}-${rand}`;
}

export async function createSale(tenantSlug: string, tenantId: string, input: CreateSaleInput) {
  const session = await authorize(tenantSlug, "pos.process_sale");
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items: { create: parsed.items.map((item) => ({
            itemId: item.itemId ?? null,
            itemType: item.itemType,
            name: item.name,
            quantity: item.quantity,
            weight: item.weight ?? null,
            unitPrice: item.unitPrice,
            originalPrice: item.originalPrice,
            promoDiscount: item.promoDiscount,
            total: item.total,
          })) as any },
      },
      include: { items: true },
    });

    // Deduct stock for product items only
    for (const item of parsed.items) {
      if (item.itemType === "product" && item.itemId) {
        await tx.inventoryItem.updateMany({
          where: { id: item.itemId, tenantId },
          data: { quantity: { decrement: item.quantity } },
        });
      }
    }

    return newSale;
  });

  revalidatePath(`/${tenantSlug}/pos`);
  revalidatePath(`/${tenantSlug}/pos/sales`);
  return {
    ...sale,
    subtotal: sale.subtotal.toString(),
    discount: sale.discount.toString(),
    total: sale.total.toString(),
    amountPaid: sale.amountPaid.toString(),
    change: sale.change.toString(),
    items: sale.items.map((i) => ({
      id: i.id,
      saleId: i.saleId,
      itemId: i.itemId,
      itemType: i.itemType,
      name: i.name,
      quantity: i.quantity,
      weight: i.weight,
      unitPrice: i.unitPrice.toString(),
      originalPrice: i.originalPrice.toString(),
      promoDiscount: i.promoDiscount.toString(),
      total: i.total.toString(),
    })),
  };
}

export async function voidSale(tenantSlug: string, tenantId: string, saleId: string) {
  await authorize(tenantSlug, "pos.void");

  const sale = await prisma.sale.findUnique({
    where: { id: saleId, tenantId },
    include: { items: true },
  });
  if (!sale) throw new Error("Sale not found");
  if (sale.status === "voided") throw new Error("Sale already voided");

  await prisma.$transaction(async (tx) => {
    await tx.sale.update({
      where: { id: saleId },
      data: { status: "voided" },
    });
    // Restore stock
    for (const item of sale.items) {
      await tx.inventoryItem.updateMany({
        where: { id: item.itemId, tenantId },
        data: { quantity: { increment: item.quantity } },
      });
    }
  });

  revalidatePath(`/${tenantSlug}/pos/sales`);
}

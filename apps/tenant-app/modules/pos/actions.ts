"use server";

import { prisma } from "@bizconnect/db";
import { authorize } from "@/lib/authorize";
import { getActiveBranchId } from "@/lib/branch";
import { serialize } from "@/lib/serialize";
import { createSaleSchema, type CreateSaleInput } from "./schema";
import { nanoid } from "@/lib/utils";

function generateReferenceNo() {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `TXN-${date}-${rand}`;
}

export async function createSale(tenantSlug: string, tenantId: string, input: CreateSaleInput) {
  const [session, branchId] = await Promise.all([
    authorize(tenantSlug, "pos.process_sale"),
    getActiveBranchId(),
  ]);
  const parsed = createSaleSchema.parse(input);

  const change = parsed.amountPaid - parsed.total;

  const sale = await prisma.$transaction(async (tx) => {
    const productItems = parsed.items.filter(
      (item): item is typeof item & { itemId: string } => item.itemType === "product" && Boolean(item.itemId)
    );

    if (productItems.length > 0) {
      const inventoryItems = await tx.inventoryItem.findMany({
        where: {
          tenantId,
          id: { in: productItems.map((item) => item.itemId) },
        },
        select: {
          id: true,
          name: true,
          quantity: true,
        },
      });

      for (const item of productItems) {
        const inventoryItem = inventoryItems.find((entry) => entry.id === item.itemId);
        if (!inventoryItem) {
          throw new Error(`Product "${item.name}" is no longer available`);
        }
        if (inventoryItem.quantity < item.quantity) {
          throw new Error(
            `Only ${inventoryItem.quantity} left for ${inventoryItem.name}. Update the cart and try again.`
          );
        }
      }
    }

    const newSale = await tx.sale.create({
      data: {
        tenantId,
        branchId: branchId ?? null,
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

    for (const item of parsed.items) {
      if (item.itemType === "product" && item.itemId) {
        const updated = await tx.inventoryItem.updateMany({
          where: {
            id: item.itemId,
            tenantId,
            quantity: { gte: item.quantity },
          },
          data: { quantity: { decrement: item.quantity } },
        });
        if (updated.count === 0) {
          throw new Error(`Not enough stock left for ${item.name}. Please refresh and try again.`);
        }
        await tx.inventoryAdjustment.create({
          data: {
            tenantId,
            itemId: item.itemId,
            quantityChange: -item.quantity,
            reason: "sale",
            notes: `Sale ${newSale.referenceNo}`,
            adjustedById: session.user.id,
          },
        });
      }
    }

    return newSale;
  });

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
    include: {
      items: true,
      returns: {
        where: { status: { in: ["pending", "approved", "refunded"] } },
        select: { id: true, status: true },
      },
    },
  });
  if (!sale) throw new Error("Sale not found");
  if (sale.status === "voided") throw new Error("Sale already voided");
  if (sale.returns.length > 0) {
    throw new Error("This sale has return activity. Use the returns workflow instead of voiding it.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.sale.update({
      where: { id: saleId },
      data: { status: "voided" },
    });
    for (const item of sale.items) {
      await tx.inventoryItem.updateMany({
        where: { id: item.itemId ?? undefined, tenantId },
        data: { quantity: { increment: item.quantity } },
      });
      if (item.itemId) {
        await tx.inventoryAdjustment.create({
          data: {
            tenantId,
            itemId: item.itemId,
            quantityChange: item.quantity,
            reason: "sale_void",
            notes: `Sale void ${sale.referenceNo}`,
          },
        });
      }
    }
  });
}

// ─── Returns/Refunds ─────────────────────────────────────────────────────────

function generateReturnReferenceNo() {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `RMA-${date}-${rand}`;
}

export async function createReturn(
  tenantSlug: string,
  tenantId: string,
  saleId: string,
  items: Array<{ saleItemId: string; quantity: number }>,
  reason: string,
  notes?: string
) {
  const session = await authorize(tenantSlug, "pos.process_sale");

  const sale = await prisma.sale.findUnique({
    where: { id: saleId, tenantId },
    include: {
      items: true,
      returns: {
        where: { status: { in: ["pending", "approved", "refunded"] } },
        include: { items: true },
      },
    },
  });
  if (!sale) throw new Error("Sale not found");

  const returnedQuantities = new Map<string, number>();
  for (const saleReturn of sale.returns) {
    for (const returnItem of saleReturn.items) {
      returnedQuantities.set(
        returnItem.saleItemId,
        (returnedQuantities.get(returnItem.saleItemId) ?? 0) + returnItem.quantity
      );
    }
  }

  let refundAmount = 0;
  for (const returnItem of items) {
    const saleItem = sale.items.find((i) => i.id === returnItem.saleItemId);
    if (!saleItem) {
      throw new Error("One or more selected sale items could not be found");
    }

    const alreadyReturned = returnedQuantities.get(returnItem.saleItemId) ?? 0;
    const returnableQuantity = saleItem.quantity - alreadyReturned;

    if (returnableQuantity <= 0) {
      throw new Error(`${saleItem.name} has already been fully returned`);
    }

    if (returnItem.quantity > returnableQuantity) {
      throw new Error(`Only ${returnableQuantity} of ${saleItem.name} can still be returned`);
    }

    const itemRefund = Number(saleItem.total) * (returnItem.quantity / saleItem.quantity);
    refundAmount += itemRefund;
  }

  const saleReturn = await prisma.saleReturn.create({
    data: {
      tenantId,
      saleId,
      referenceNo: generateReturnReferenceNo(),
      reason,
      notes: notes || null,
      status: "pending",
      refundAmount,
      refundMethod: sale.paymentMethod === "cash" ? "cash" : "original_payment",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items: { create: items.map((i) => ({ saleItemId: i.saleItemId, quantity: i.quantity })) as any },
    },
    include: { items: true },
  });

  return serialize(saleReturn);
}

export async function approveReturn(
  tenantSlug: string,
  tenantId: string,
  returnId: string,
  restockQuantities?: Record<string, number>
) {
  const session = await authorize(tenantSlug, "pos.void");

  const saleReturn = await prisma.saleReturn.findUnique({
    where: { id: returnId },
    include: { items: true, sale: { include: { items: true } } },
  });
  if (!saleReturn) throw new Error("Return not found");
  if (saleReturn.status !== "pending") throw new Error("Return is not pending");

  await prisma.$transaction(async (tx) => {
    await tx.saleReturn.update({
      where: { id: returnId },
      data: {
        status: "approved",
        approvedById: session.user.id,
        approvedAt: new Date(),
      },
    });

    for (const returnItem of saleReturn.items) {
      const saleItem = saleReturn.sale.items.find((i) => i.id === returnItem.saleItemId);
      if (saleItem && saleItem.itemId) {
        await tx.inventoryItem.updateMany({
          where: { id: saleItem.itemId, tenantId },
          data: { quantity: { increment: returnItem.quantity } },
        });

        await tx.inventoryAdjustment.create({
          data: {
            tenantId,
            itemId: saleItem.itemId,
            quantityChange: returnItem.quantity,
            reason: "return",
            notes: `Return ${saleReturn.referenceNo}`,
            adjustedById: session.user.id,
          },
        });
      }
    }
  });

  return serialize(
    await prisma.saleReturn.findUnique({
      where: { id: returnId },
      include: { items: true },
    })
  );
}

export async function rejectReturn(tenantSlug: string, tenantId: string, returnId: string) {
  await authorize(tenantSlug, "pos.void");

  const saleReturn = await prisma.saleReturn.findUnique({
    where: { id: returnId },
  });
  if (!saleReturn) throw new Error("Return not found");
  if (saleReturn.status !== "pending") throw new Error("Return is not pending");

  const updatedSaleReturn = await prisma.saleReturn.update({
    where: { id: returnId },
    data: { status: "rejected" },
  });

  return serialize(updatedSaleReturn);
}

export async function processRefund(
  tenantSlug: string,
  tenantId: string,
  returnId: string,
  refundMethod: string
) {
  const session = await authorize(tenantSlug, "pos.void");

  const saleReturn = await prisma.saleReturn.findUnique({
    where: { id: returnId },
  });
  if (!saleReturn) throw new Error("Return not found");
  if (saleReturn.status !== "approved") throw new Error("Return is not approved");

  const updatedSaleReturn = await prisma.saleReturn.update({
    where: { id: returnId },
    data: {
      status: "refunded",
      refundMethod,
      refundedAt: new Date(),
    },
  });

  return serialize(updatedSaleReturn);
}

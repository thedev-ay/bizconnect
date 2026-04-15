import { NextResponse } from "next/server";
import { prisma } from "@bizconnect/db";
import { authorize } from "@/lib/authorize";
import { getActiveBranchId } from "@/lib/branch";

export async function GET(_req: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantSlug } = await params;

  const [session, branchId] = await Promise.all([
    authorize(tenantSlug),
    getActiveBranchId(),
  ]);

  const tenantId = session.user.tenantId;
  const branchFilter = branchId ? { branchId } : {};

  const [items, recentAdjustments] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { tenantId, ...branchFilter },
      include: { category: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.inventoryAdjustment.findMany({
      where: { tenantId, ...branchFilter },
      select: {
        id: true,
        itemId: true,
        quantityChange: true,
        reason: true,
        notes: true,
        createdAt: true,
        item: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  const serializedItems = items.map((i) => ({
    ...i,
    unitCost: i.unitCost.toString(),
    unitPrice: i.unitPrice.toString(),
  }));

  return NextResponse.json({ items: serializedItems, recentAdjustments });
}

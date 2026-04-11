import { NextResponse } from "next/server";
import { prisma } from "@bizconnect/db";
import { authorize } from "@/lib/authorize";

export async function GET(_req: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantSlug } = await params;

  const session = await authorize(tenantSlug);

  const [items, recentAdjustments] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { tenantId: session.user.tenantId },
      include: { category: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.inventoryAdjustment.findMany({
      where: { tenantId: session.user.tenantId },
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

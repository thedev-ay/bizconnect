import { NextResponse } from "next/server";
import { prisma } from "@bizconnect/db";
import { authorize } from "@/lib/authorize";

export async function GET(_req: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantSlug } = await params;

  const session = await authorize(tenantSlug);
  const tenantId = session.user.tenantId;
  const now = new Date();
  const servicesEnabled = session.user.modules.includes("services");

  const [rawProducts, activePromos, rawServices] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { tenantId, quantity: { gt: 0 } },
      select: {
        id: true,
        name: true,
        unitPrice: true,
        quantity: true,
        sku: true,
        category: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma as any).promotion.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      select: {
        id: true,
        type: true,
        value: true,
        buyQty: true,
        getQty: true,
        daysOfWeek: true,
        startTime: true,
        endTime: true,
        items: { select: { itemId: true } },
      },
    }),
    servicesEnabled
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (prisma as any).serviceCatalog.findMany({
          where: { tenantId, isActive: true },
          orderBy: [{ category: "asc" }, { name: "asc" }],
        })
      : Promise.resolve([]),
  ]);

  interface RawPromo {
    id: string;
    type: string;
    value: { toString(): string };
    buyQty: number | null;
    getQty: number | null;
    daysOfWeek: unknown;
    startTime: string | null;
    endTime: string | null;
    items: { itemId: string }[];
  }

  const promos: RawPromo[] = activePromos as RawPromo[];

  const promosByItem = new Map<string, RawPromo[]>();
  for (const promo of promos) {
    for (const { itemId } of promo.items) {
      if (!promosByItem.has(itemId)) promosByItem.set(itemId, []);
      promosByItem.get(itemId)!.push(promo);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const services = (rawServices as any[]).map((s) => ({
    id: s.id as string,
    name: s.name as string,
    pricingType: s.pricingType as "per_piece" | "per_kilo" | "flat",
    price: Number(s.price),
    category: s.category as string | null,
  }));

  const products = rawProducts.map((p) => ({
    id: p.id,
    name: p.name,
    unitPrice: Number(p.unitPrice),
    quantity: p.quantity,
    sku: p.sku,
    category: p.category?.name ?? null,
    promotions: (promosByItem.get(p.id) ?? []).map((promo) => ({
      id: promo.id,
      type: promo.type,
      value: Number(promo.value),
      buyQty: promo.buyQty,
      getQty: promo.getQty,
      daysOfWeek: promo.daysOfWeek as number[] | null,
      startTime: promo.startTime,
      endTime: promo.endTime,
    })),
  }));

  return NextResponse.json({ products, services, servicesEnabled });
}

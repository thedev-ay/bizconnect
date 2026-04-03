import { prisma } from "@bizconnect/db";
import { getTenant } from "@/lib/tenant";
import { POSTerminal } from "@/modules/pos";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";
import type { PromoType } from "@/modules/promotions";

interface POSPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function POSPage({ params }: POSPageProps) {
  const { tenant: tenantSlug } = await params;
  const tenant = await getTenant(tenantSlug);
  const now = new Date();

  const [rawProducts, activePromos, rawServices] = await Promise.all([
    prisma.inventoryItem.findMany({

      where: { tenantId: tenant.id, quantity: { gt: 0 } },
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
        tenantId: tenant.id,
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma as any).serviceCatalog.findMany({
      where: { tenantId: tenant.id, isActive: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
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

  // Build a map: itemId → list of active promos
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
      type: promo.type as PromoType,
      value: Number(promo.value),
      buyQty: promo.buyQty,
      getQty: promo.getQty,
      daysOfWeek: promo.daysOfWeek as number[] | null,
      startTime: promo.startTime,
      endTime: promo.endTime,
    })),
  }));

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Point of Sale</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{products.length} products available</p>
        </div>
        <Link href={`/${tenantSlug}/pos/sales`}>
          <Button variant="outline" size="sm">
            <History className="mr-2 h-4 w-4" />
            Sales History
          </Button>
        </Link>
      </div>
      <div className="flex-1 overflow-hidden">
        <POSTerminal
          products={products}
          services={services}
          tenantSlug={tenantSlug}
          tenantId={tenant.id}
          tenantName={tenant.name}
          currencySymbol={tenant.currencySymbol}
          currencyLocale={tenant.currencyLocale}
        />
      </div>
    </div>
  );
}

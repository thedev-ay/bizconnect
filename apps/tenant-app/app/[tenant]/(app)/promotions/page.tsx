import { prisma } from "@bizconnect/db";
import { getTenant } from "@/lib/tenant";
import { Card, CardContent } from "@/components/ui/card";
import { PromotionsList } from "@/modules/promotions/components/promotions-list";
import type { Promotion } from "@/modules/promotions";

interface PromotionsPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function PromotionsPage({ params }: PromotionsPageProps) {
  const { tenant: tenantSlug } = await params;
  const tenant = await getTenant(tenantSlug);

  const [promotions, products] = await Promise.all([
    prisma.promotion.findMany({
      where: { tenantId: tenant.id },
      include: {
        items: {
          include: { item: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.inventoryItem.findMany({
      where: { tenantId: tenant.id },
      select: {
        id: true,
        name: true,
        category: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const typedPromotions: Promotion[] = promotions.map((p) => ({
    ...p,
    type: p.type as Promotion["type"],
    value: p.value.toString(),
    daysOfWeek: p.daysOfWeek as number[] | null,
  }));

  const productOptions = products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category?.name ?? null,
  }));

  const now = new Date();
  const weekFromNow = new Date(now); weekFromNow.setDate(now.getDate() + 7);

  const activeCount = typedPromotions.filter(
    (p) => p.isActive && (!p.endsAt || new Date(p.endsAt) >= now) && (!p.startsAt || new Date(p.startsAt) <= now)
  ).length;
  const scheduledCount = typedPromotions.filter(
    (p) => p.isActive && p.startsAt && new Date(p.startsAt) > now
  ).length;
  const expiringSoonCount = typedPromotions.filter(
    (p) => p.endsAt && new Date(p.endsAt) >= now && new Date(p.endsAt) <= weekFromNow
  ).length;

  const stats = [
    { label: "Total", value: promotions.length, color: "text-zinc-900" },
    { label: "Active now", value: activeCount, color: "text-emerald-600" },
    { label: "Scheduled", value: scheduledCount, color: "text-blue-600" },
    { label: "Expiring this week", value: expiringSoonCount, color: expiringSoonCount > 0 ? "text-amber-600" : "text-zinc-400" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Promotions</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Manage discounts and deals applied at checkout</p>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="shadow-none border-zinc-200">
            <CardContent className="p-4">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-none border-zinc-200">
        <PromotionsList
          promotions={typedPromotions}
          tenantSlug={tenantSlug}
          tenantId={tenant.id}
          products={productOptions}
        />
      </Card>
    </div>
  );
}

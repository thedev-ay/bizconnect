import { prisma } from "@bizconnect/db";
import { getTenant } from "@/lib/tenant";
import { Card } from "@/components/ui/card";
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
    value: p.value.toString(),
    daysOfWeek: p.daysOfWeek as number[] | null,
  }));

  const productOptions = products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category?.name ?? null,
  }));

  const activeCount = promotions.filter((p) => p.isActive).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Promotions</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {promotions.length} total · {activeCount} active
        </p>
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

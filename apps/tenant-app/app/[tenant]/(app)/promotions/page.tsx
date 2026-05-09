import { prisma } from "@bizconnect/db";
import { getTenant } from "@/lib/tenant";
import { TopbarPageBridge } from "@/components/layout/topbar-page-bridge";
import { ContentPanel, PageShell } from "@/components/layout/page-shell";
import { PromotionsList } from "@/modules/promotions/components/promotions-list";
import { NewPromotionButton } from "@/modules/promotions/components/new-promotion-button";
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

  return (
    <PageShell className="h-auto min-h-full">
      <TopbarPageBridge title="Promotions" description={`${typedPromotions.length} total`} />
      <NewPromotionButton
        tenantSlug={tenantSlug}
        tenantId={tenant.id}
        currencySymbol={tenant.currencySymbol}
        products={productOptions}
        showTrigger={false}
      />
      <ContentPanel className="overflow-hidden p-0">
        <PromotionsList
          promotions={typedPromotions}
          tenantSlug={tenantSlug}
          tenantId={tenant.id}
          currencySymbol={tenant.currencySymbol}
          products={productOptions}
        />
      </ContentPanel>
    </PageShell>
  );
}

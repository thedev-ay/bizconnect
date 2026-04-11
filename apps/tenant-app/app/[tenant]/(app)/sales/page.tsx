import { getTenant } from "@/lib/tenant";
import { authorize } from "@/lib/authorize";
import { SalesView } from "@/modules/pos/components/sales-view";

interface SalesPageProps {
  params: Promise<{ tenant: string }>;
  searchParams?: Promise<{ saleId?: string }>;
}

export default async function SalesPage({ params, searchParams }: SalesPageProps) {
  const { tenant: tenantSlug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const [tenant] = await Promise.all([getTenant(tenantSlug), authorize(tenantSlug)]);

  return (
    <SalesView
      tenantSlug={tenantSlug}
      tenantId={tenant.id}
      tenantName={tenant.name}
      currencySymbol={tenant.currencySymbol}
      currencyLocale={tenant.currencyLocale}
      highlightedSaleId={resolvedSearchParams?.saleId}
    />
  );
}

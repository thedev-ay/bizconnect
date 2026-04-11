import { getTenant } from "@/lib/tenant";
import { InventoryView } from "@/modules/inventory";

interface InventoryPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function InventoryPage({ params }: InventoryPageProps) {
  const { tenant: tenantSlug } = await params;
  const tenant = await getTenant(tenantSlug);

  return (
    <InventoryView
      tenantSlug={tenantSlug}
      tenantId={tenant.id}
      currencySymbol={tenant.currencySymbol}
      currencyLocale={tenant.currencyLocale}
    />
  );
}

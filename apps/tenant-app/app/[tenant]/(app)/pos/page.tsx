import { getTenant } from "@/lib/tenant";
import { POSView } from "@/modules/pos";
import { TopbarPageBridge } from "@/components/layout/topbar-page-bridge";
import { TopbarSecondaryLinkBridge } from "@/components/layout/topbar-secondary-link-bridge";
import { PageShell } from "@/components/layout/page-shell";

interface POSPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function POSPage({ params }: POSPageProps) {
  const { tenant: tenantSlug } = await params;
  const tenant = await getTenant(tenantSlug);

  return (
    <PageShell className="h-auto min-h-full">
      <TopbarPageBridge title="Point of Sale" />
      <TopbarSecondaryLinkBridge label="Sales History" href={`/${tenantSlug}/sales`} />
      <div className="flex-1 overflow-visible 2xl:overflow-hidden">
        <POSView
          tenantSlug={tenantSlug}
          tenantId={tenant.id}
          tenantName={tenant.name}
          currencySymbol={tenant.currencySymbol}
          currencyLocale={tenant.currencyLocale}
        />
      </div>
    </PageShell>
  );
}

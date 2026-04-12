import { getTenant } from "@/lib/tenant";
import { POSView } from "@/modules/pos";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";
import { PageHeader, PageShell } from "@/components/layout/page-shell";

interface POSPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function POSPage({ params }: POSPageProps) {
  const { tenant: tenantSlug } = await params;
  const tenant = await getTenant(tenantSlug);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Storefront"
        title="Point of Sale"
        className="px-5 py-4 sm:px-6 sm:py-5"
        action={
          <Link href={`/${tenantSlug}/sales`}>
            <Button variant="outline" size="sm">
              <History className="mr-2 h-4 w-4" />
              Sales History
            </Button>
          </Link>
        }
      />
      <div className="flex-1 overflow-hidden">
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

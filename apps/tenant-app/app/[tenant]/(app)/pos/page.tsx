import { getTenant } from "@/lib/tenant";
import { POSView } from "@/modules/pos";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";

interface POSPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function POSPage({ params }: POSPageProps) {
  const { tenant: tenantSlug } = await params;
  const tenant = await getTenant(tenantSlug);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Point of Sale</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Point of sale terminal</p>
        </div>
        <Link href={`/${tenantSlug}/sales`}>
          <Button variant="outline" size="sm">
            <History className="mr-2 h-4 w-4" />
            Sales History
          </Button>
        </Link>
      </div>
      <div className="flex-1 overflow-hidden">
        <POSView
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

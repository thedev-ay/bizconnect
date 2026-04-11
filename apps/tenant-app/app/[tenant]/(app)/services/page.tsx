import { redirect } from "next/navigation";
import { prisma } from "@bizconnect/db";
import { getTenant } from "@/lib/tenant";
import { authorize } from "@/lib/authorize";
import { Card } from "@/components/ui/card";
import { ServicesList } from "@/modules/services";
import type { Service, PricingType } from "@/modules/services";

interface ServicesPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function ServicesPage({ params }: ServicesPageProps) {
  const { tenant: tenantSlug } = await params;

  const session = await authorize(tenantSlug);
  if (!session.user.modules.includes("job-orders")) redirect(`/${tenantSlug}/dashboard?error=module_disabled`);

  const tenant = await getTenant(tenantSlug);

  const raw = await (prisma as any).serviceCatalog.findMany({
    where: { tenantId: tenant.id },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const services: Service[] = raw.map((s: any) => ({
    ...s,
    price: s.price.toString(),
    pricingType: s.pricingType as PricingType,
  }));

  const activeCount = services.filter((s) => s.isActive).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Services</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {services.length} total · {activeCount} active
        </p>
      </div>

      <Card className="shadow-none border-zinc-200">
        <ServicesList
          services={services}
          tenantSlug={tenantSlug}
          tenantId={tenant.id}
          currencySymbol={tenant.currencySymbol}
          currencyLocale={tenant.currencyLocale}
        />
      </Card>
    </div>
  );
}

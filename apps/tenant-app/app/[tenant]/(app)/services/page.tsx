import { redirect } from "next/navigation";
import { prisma } from "@bizconnect/db";
import { getTenant } from "@/lib/tenant";
import { authorize } from "@/lib/authorize";
import { TopbarPageBridge } from "@/components/layout/topbar-page-bridge";
import { ContentPanel, PageShell } from "@/components/layout/page-shell";
import { ServicesList } from "@/modules/services";
import { NewServiceButton } from "@/modules/services/components/new-service-button";
import type { Service, PricingType } from "@/modules/services";

interface ServicesPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function ServicesPage({ params }: ServicesPageProps) {
  const { tenant: tenantSlug } = await params;

  const session = await authorize(tenantSlug);
  if (!session.user.modules.includes("services")) redirect(`/${tenantSlug}/dashboard?error=module_disabled`);
  const hasAppointments = session.user.modules.includes("appointments");
  const hasJobOrders = session.user.modules.includes("job-orders") || session.user.modules.includes("pos");

  const tenant = await getTenant(tenantSlug);

  const raw = await (prisma as any).service.findMany({
    where: { tenantId: tenant.id },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const services: Service[] = raw.map((s: any) => ({
    ...s,
    duration: s.duration,
    price: s.price.toString(),
    pricingType: s.pricingType as PricingType,
  }));

  const activeCount = services.filter((s) => s.isActive).length;

  return (
    <PageShell className="h-auto min-h-full">
      <TopbarPageBridge title="Services" description={`${services.length} total · ${activeCount} active`} />
      <NewServiceButton
        tenantSlug={tenantSlug}
        tenantId={tenant.id}
        currencySymbol={tenant.currencySymbol}
        showDuration={hasAppointments}
        showAppointmentsAvailability={hasAppointments}
        showJobOrdersAvailability={hasJobOrders}
        showTrigger={false}
      />

      <ContentPanel className="overflow-hidden p-0">
        <ServicesList
          services={services}
          tenantSlug={tenantSlug}
          tenantId={tenant.id}
          currencySymbol={tenant.currencySymbol}
          currencyLocale={tenant.currencyLocale}
          showDuration={hasAppointments}
          showAppointmentsAvailability={hasAppointments}
          showJobOrdersAvailability={hasJobOrders}
        />
      </ContentPanel>
    </PageShell>
  );
}

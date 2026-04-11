import { getTenant } from "@/lib/tenant";
import { authorize } from "@/lib/authorize";
import { AppointmentsView } from "@/modules/appointments/components/appointments-view";

interface AppointmentsPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function AppointmentsPage({ params }: AppointmentsPageProps) {
  const { tenant: tenantSlug } = await params;
  const [tenant] = await Promise.all([getTenant(tenantSlug), authorize(tenantSlug)]);

  return (
    <AppointmentsView
      tenantSlug={tenantSlug}
      tenantId={tenant.id}
      currencySymbol={tenant.currencySymbol}
      currencyLocale={tenant.currencyLocale}
    />
  );
}

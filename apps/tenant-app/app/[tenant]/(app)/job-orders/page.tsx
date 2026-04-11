import { getTenant } from "@/lib/tenant";
import { authorize } from "@/lib/authorize";
import { JobOrdersView } from "@/modules/job-orders/components/job-orders-view";

interface JobOrdersPageProps {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ customerId?: string }>;
}

export default async function JobOrdersPage({ params, searchParams }: JobOrdersPageProps) {
  const { tenant: tenantSlug } = await params;
  const { customerId } = await searchParams;
  const [tenant, session] = await Promise.all([getTenant(tenantSlug), authorize(tenantSlug)]);

  return (
    <JobOrdersView
      tenantSlug={tenantSlug}
      tenantId={tenant.id}
      tenantName={tenant.name}
      currencySymbol={tenant.currencySymbol}
      currencyLocale={tenant.currencyLocale}
      billingEnabled={session.user.modules.includes("billing")}
      initialCustomerId={customerId}
    />
  );
}

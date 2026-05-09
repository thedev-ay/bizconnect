import { prisma } from "@bizconnect/db";
import { getTenant } from "@/lib/tenant";
import { authorize } from "@/lib/authorize";
import { TopbarPageBridge } from "@/components/layout/topbar-page-bridge";
import { ContentPanel, PageShell } from "@/components/layout/page-shell";
import { CustomerList, AddCustomerDialog } from "@/modules/crm";
import type { Customer } from "@/modules/crm";

interface CRMPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function CRMPage({ params }: CRMPageProps) {
  const { tenant: tenantSlug } = await params;
  const [tenant, session] = await Promise.all([getTenant(tenantSlug), authorize(tenantSlug)]);
  const assetsEnabled = session.user.modules.includes("assets");

  const [customers, branches] = await Promise.all([
    prisma.customer.findMany({
      where: { tenantId: tenant.id },
      orderBy: { name: "asc" },
    }),
    prisma.branch.findMany({
      where: { tenantId: tenant.id, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  let jobOrderCounts: Array<{ customerId: string | null; _count: { customerId: number } }> = [];
  let customerAssets: Array<{ id: string; customerId: string; name: string; assetType: string; identifier: string | null; brand: string | null; model: string | null; serialNo: string | null; status: string }> = [];
  try {
    jobOrderCounts = await (prisma.jobOrder as any).groupBy({
      by: ["customerId"],
      where: { tenantId: tenant.id, customerId: { not: null } },
      _count: { customerId: true },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!message.includes("customer_id")) {
      throw error;
    }
  }
  if (assetsEnabled) {
    try {
      customerAssets = await ((prisma as any).asset).findMany({
        where: { tenantId: tenant.id },
        select: {
          id: true,
          customerId: true,
          name: true,
          assetType: true,
          identifier: true,
          brand: true,
          model: true,
          serialNo: true,
          status: true,
        },
        orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!message.includes("assets")) {
        throw error;
      }
      customerAssets = [];
    }
  }

  const typedCustomers: Customer[] = customers;
  const jobsByCustomer = Object.fromEntries(
    jobOrderCounts
      .filter((entry) => entry.customerId)
      .map((entry) => [entry.customerId as string, entry._count.customerId])
  );
  const assetsByCustomer = customerAssets.reduce<
    Record<string, Array<{ id: string; customerId: string; name: string; assetType: string; identifier: string | null; brand: string | null; model: string | null; serialNo: string | null; status: string }>>
  >((acc, asset) => {
    if (!acc[asset.customerId]) acc[asset.customerId] = [];
    acc[asset.customerId].push(asset);
    return acc;
  }, {});

  return (
    <PageShell className="h-auto min-h-full">
      <TopbarPageBridge title="Customers" description={`${customers.length} total`} />
      <AddCustomerDialog tenantSlug={tenantSlug} tenantId={tenant.id} showTrigger={false} />
      <ContentPanel className="overflow-hidden p-0">
        <CustomerList
          customers={typedCustomers}
          tenantSlug={tenantSlug}
          tenantId={tenant.id}
          dateLocale={tenant.currencyLocale}
          jobOrderCounts={jobsByCustomer}
          assetsEnabled={assetsEnabled}
          assetsByCustomer={assetsByCustomer}
          branches={branches}
        />
      </ContentPanel>
    </PageShell>
  );
}

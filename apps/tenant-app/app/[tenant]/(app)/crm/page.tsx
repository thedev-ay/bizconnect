import { prisma } from "@bizconnect/db";
import { getTenant } from "@/lib/tenant";
import { ContentPanel, PageHeader, PageShell } from "@/components/layout/page-shell";
import { CustomerList, AddCustomerDialog } from "@/modules/crm";
import type { Customer } from "@/modules/crm";

interface CRMPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function CRMPage({ params }: CRMPageProps) {
  const { tenant: tenantSlug } = await params;
  const tenant = await getTenant(tenantSlug);

  const customers = await prisma.customer.findMany({
    where: { tenantId: tenant.id },
    orderBy: { name: "asc" },
  });
  let jobOrderCounts: Array<{ customerId: string | null; _count: { customerId: number } }> = [];
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

  const typedCustomers: Customer[] = customers;
  const jobsByCustomer = Object.fromEntries(
    jobOrderCounts
      .filter((entry) => entry.customerId)
      .map((entry) => [entry.customerId as string, entry._count.customerId])
  );

  return (
    <PageShell className="h-auto min-h-full">
      <PageHeader
        eyebrow="CRM"
        title="Customers"
        description={`${customers.length} total`}
        action={<AddCustomerDialog tenantSlug={tenantSlug} tenantId={tenant.id} />}
      />
      <ContentPanel className="overflow-hidden p-0">
        <CustomerList
          customers={typedCustomers}
          tenantSlug={tenantSlug}
          tenantId={tenant.id}
          jobOrderCounts={jobsByCustomer}
        />
      </ContentPanel>
    </PageShell>
  );
}

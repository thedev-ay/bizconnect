import { prisma } from "@bizconnect/db";
import { getTenant } from "@/lib/tenant";
import { Card, CardContent } from "@/components/ui/card";
import { CustomerList, AddCustomerDialog } from "@/modules/crm";
import type { Customer } from "@/modules/crm";
import { Users, Tag, Star } from "lucide-react";

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

  const uniqueTags = new Set(customers.flatMap((c) => c.tags)).size;
  const vipCount = customers.filter((c) => c.tags.includes("vip")).length;
  const typedCustomers: Customer[] = customers;
  const jobsByCustomer = Object.fromEntries(
    jobOrderCounts
      .filter((entry) => entry.customerId)
      .map((entry) => [entry.customerId as string, entry._count.customerId])
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Customers</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{customers.length} total</p>
        </div>
        <AddCustomerDialog tenantSlug={tenantSlug} tenantId={tenant.id} />
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="shadow-none border-zinc-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">Total Customers</p>
                <p className="mt-1.5 text-2xl font-bold text-zinc-900">{customers.length}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
                <Users className="h-4 w-4 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border-zinc-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">VIP Customers</p>
                <p className="mt-1.5 text-2xl font-bold text-zinc-900">{vipCount}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
                <Star className="h-4 w-4 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border-zinc-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">Unique Tags</p>
                <p className="mt-1.5 text-2xl font-bold text-zinc-900">{uniqueTags}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <Tag className="h-4 w-4 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="shadow-none border-zinc-200">
        <CustomerList
          customers={typedCustomers}
          tenantSlug={tenantSlug}
          tenantId={tenant.id}
          jobOrderCounts={jobsByCustomer}
        />
      </Card>
    </div>
  );
}

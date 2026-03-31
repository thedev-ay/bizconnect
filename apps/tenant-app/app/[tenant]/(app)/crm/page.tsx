import { prisma } from "@bizconnect/db";
import { getTenant } from "@/lib/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerList, AddCustomerDialog } from "@/modules/crm";
import type { Customer } from "@/modules/crm";
import { Users, Tag } from "lucide-react";

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

  const allTags = customers.flatMap((c) => c.tags);
  const uniqueTags = new Set(allTags).size;

  const typedCustomers: Customer[] = customers;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">CRM</h1>
          <p className="text-muted-foreground">Customer Relationship Management</p>
        </div>
        <AddCustomerDialog tenantSlug={tenantSlug} tenantId={tenant.id} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unique Tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueTags}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Customers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <CustomerList customers={typedCustomers} tenantSlug={tenantSlug} tenantId={tenant.id} />
        </CardContent>
      </Card>
    </div>
  );
}

import { prisma } from "@bizconnect/db";
import { getTenant } from "@/lib/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InvoiceList, CreateInvoiceDialog } from "@/modules/billing";
import type { Invoice } from "@/modules/billing";
import { FileText, DollarSign, Clock, AlertCircle } from "lucide-react";

interface BillingPageProps {
  params: Promise<{ tenant: string }>;
}

async function getInvoices(tenantId: string) {
  const invoices = await prisma.invoice.findMany({
    where: { tenantId },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  const total = invoices.reduce((sum, i) => sum + Number(i.total), 0);
  const paid = invoices.filter((i) => i.status === "paid");
  const paidTotal = paid.reduce((sum, i) => sum + Number(i.total), 0);
  const overdue = invoices.filter(
    (i) => i.status !== "paid" && i.status !== "void" && new Date(i.dueDate) < new Date()
  );

  return { invoices, total, paidTotal, overdueCount: overdue.length };
}

export default async function BillingPage({ params }: BillingPageProps) {
  const { tenant: tenantSlug } = await params;
  const tenant = await getTenant(tenantSlug);
  const { invoices, total, paidTotal, overdueCount } = await getInvoices(tenant.id);

  const typedInvoices: Invoice[] = invoices.map((inv) => ({
    ...inv,
    subtotal: inv.subtotal.toString(),
    tax: inv.tax.toString(),
    total: inv.total.toString(),
    items: inv.items.map((item) => ({
      ...item,
      unitPrice: item.unitPrice.toString(),
      total: item.total.toString(),
    })),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing & Invoices</h1>
          <p className="text-muted-foreground">
            {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
          </p>
        </div>
        <CreateInvoiceDialog tenantSlug={tenantSlug} tenantId={tenant.id} />
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoiced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <DollarSign className="h-4 w-4 text-green-500" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₱{paidTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ₱{(total - paidTotal).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overdueCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Invoices</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <InvoiceList invoices={typedInvoices} tenantSlug={tenantSlug} tenantId={tenant.id} />
        </CardContent>
      </Card>
    </div>
  );
}

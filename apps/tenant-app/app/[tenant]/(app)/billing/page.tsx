import { prisma } from "@bizconnect/db";
import { getTenant } from "@/lib/tenant";
import { Card, CardContent } from "@/components/ui/card";
import { InvoiceList, CreateInvoiceDialog } from "@/modules/billing";
import type { Invoice } from "@/modules/billing";
import { FileText, TrendingUp, Clock, AlertCircle } from "lucide-react";

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
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Billing & Invoices</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
          </p>
        </div>
        <CreateInvoiceDialog tenantSlug={tenantSlug} tenantId={tenant.id} currencySymbol={tenant.currencySymbol} defaultTaxRate={Number(tenant.defaultTaxRate)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="shadow-none border-zinc-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">Total Invoiced</p>
                <p className="mt-1.5 text-2xl font-bold text-zinc-900">
                  {tenant.currencySymbol}{total.toLocaleString(tenant.currencyLocale, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100">
                <FileText className="h-4 w-4 text-zinc-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border-zinc-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">Collected</p>
                <p className="mt-1.5 text-2xl font-bold text-emerald-600">
                  {tenant.currencySymbol}{paidTotal.toLocaleString(tenant.currencyLocale, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border-zinc-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">Outstanding</p>
                <p className="mt-1.5 text-2xl font-bold text-blue-600">
                  {tenant.currencySymbol}{(total - paidTotal).toLocaleString(tenant.currencyLocale, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border-zinc-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">Overdue</p>
                <p className="mt-1.5 text-2xl font-bold text-red-600">{overdueCount}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none border-zinc-200">
        <InvoiceList invoices={typedInvoices} tenantSlug={tenantSlug} tenantId={tenant.id} currencySymbol={tenant.currencySymbol} currencyLocale={tenant.currencyLocale} />
      </Card>
    </div>
  );
}

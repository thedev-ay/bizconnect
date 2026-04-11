import { redirect } from "next/navigation";
import { prisma } from "@bizconnect/db";
import { getTenant } from "@/lib/tenant";
import { authorize } from "@/lib/authorize";
import { Card, CardContent } from "@/components/ui/card";
import { InvoiceList, CreateInvoiceDialog } from "@/modules/billing";
import type { Invoice } from "@/modules/billing";
import { FileText, TrendingUp, Clock, AlertCircle, ClipboardList } from "lucide-react";
import { createInvoiceForJobOrder } from "@/modules/job-orders/actions";
import { Button } from "@/components/ui/button";

interface BillingPageProps {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ invoiceId?: string }>;
}

async function getInvoices(tenantId: string) {
  const [invoices, customers, readyToInvoice] = await Promise.all([
    prisma.invoice.findMany({
      where: { tenantId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.customer.findMany({
      where: { tenantId },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.jobOrder.findMany({
      where: {
        tenantId,
        completedAt: { not: null },
        invoice: null,
      },
      include: {
        items: true,
      },
      orderBy: { completedAt: "desc" },
      take: 5,
    }),
  ]);

  const total = invoices.reduce((sum, i) => sum + Number(i.total), 0);
  const paid = invoices.filter((i) => i.status === "paid");
  const paidTotal = paid.reduce((sum, i) => sum + Number(i.total), 0);
  const overdue = invoices.filter(
    (i) => i.status !== "paid" && i.status !== "void" && new Date(i.dueDate) < new Date()
  );
  const readyToInvoiceValue = readyToInvoice.reduce(
    (sum, jobOrder) => sum + jobOrder.items.reduce((lineSum, item) => lineSum + Number(item.total), 0),
    0
  );

  return { invoices, customers, readyToInvoice, total, paidTotal, overdueCount: overdue.length, readyToInvoiceValue };
}

export default async function BillingPage({ params, searchParams }: BillingPageProps) {
  const { tenant: tenantSlug } = await params;
  const { invoiceId } = await searchParams;
  const [tenant, session] = await Promise.all([getTenant(tenantSlug), authorize(tenantSlug)]);
  const crmEnabled = session.user.modules.includes("crm");
  const { invoices, customers, readyToInvoice, total, paidTotal, overdueCount, readyToInvoiceValue } = await getInvoices(tenant.id);

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
        <CreateInvoiceDialog
          tenantSlug={tenantSlug}
          tenantId={tenant.id}
          currencySymbol={tenant.currencySymbol}
          defaultTaxRate={Number(tenant.defaultTaxRate)}
          customers={customers}
          crmEnabled={crmEnabled}
        />
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
                <p className="text-xs font-medium text-zinc-500">Ready to Invoice</p>
                <p className="mt-1.5 text-2xl font-bold text-violet-600">
                  {tenant.currencySymbol}{readyToInvoiceValue.toLocaleString(tenant.currencyLocale, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
                <ClipboardList className="h-4 w-4 text-violet-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none border-zinc-200">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Completed Work Ready for Billing</h2>
              <p className="text-sm text-zinc-500">
                Turn completed job orders into draft invoices without retyping line items.
              </p>
            </div>
            <div className="text-right text-sm text-zinc-500">
              {readyToInvoice.length} ready
              {overdueCount > 0 && <div className="text-xs text-red-500">{overdueCount} overdue invoices still open</div>}
            </div>
          </div>

          {readyToInvoice.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-400">
              No completed job orders are waiting for billing.
            </div>
          ) : (
            <div className="space-y-3">
              {readyToInvoice.map((jobOrder) => {
                const totalValue = jobOrder.items.reduce((sum, item) => sum + Number(item.total), 0);

                return (
                  <form
                    key={jobOrder.id}
                    action={async () => {
                      "use server";
                      const result = await createInvoiceForJobOrder(tenantSlug, tenant.id, jobOrder.id);
                      redirect(`/${tenantSlug}/billing?invoiceId=${result.invoiceId}`);
                    }}
                    className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 px-4 py-3"
                  >
                    <div>
                      <p className="font-mono text-xs text-zinc-400">{jobOrder.jobNo}</p>
                      <p className="text-sm font-semibold text-zinc-900">{jobOrder.customerName}</p>
                      <p className="text-xs text-zinc-500">
                        {jobOrder.items.length} line item{jobOrder.items.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-zinc-900">
                          {tenant.currencySymbol}{totalValue.toLocaleString(tenant.currencyLocale, { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <Button type="submit" size="sm">Create Draft</Button>
                    </div>
                  </form>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-none border-zinc-200">
        <InvoiceList
          invoices={typedInvoices}
          tenantSlug={tenantSlug}
          tenantId={tenant.id}
          currencySymbol={tenant.currencySymbol}
          currencyLocale={tenant.currencyLocale}
          highlightedInvoiceId={invoiceId}
        />
      </Card>
    </div>
  );
}

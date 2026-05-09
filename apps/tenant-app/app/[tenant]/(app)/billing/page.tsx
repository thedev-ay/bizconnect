import { redirect } from "next/navigation";
import { prisma } from "@bizconnect/db";
import { getTenant } from "@/lib/tenant";
import { authorize } from "@/lib/authorize";
import { TopbarPageBridge } from "@/components/layout/topbar-page-bridge";
import { ContentPanel, PageShell } from "@/components/layout/page-shell";
import { BillingLedger, CreateInvoiceDialog } from "@/modules/billing";
import type { Invoice } from "@/modules/billing";
import { createInvoiceForJobOrder } from "@/modules/job-orders/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BillingPageProps {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ invoiceId?: string }>;
}

async function getInvoices(tenantId: string) {
  const [invoices, customers, completedStages] = await Promise.all([
    prisma.invoice.findMany({
      where: { tenantId },
      include: {
        activities: {
          orderBy: { createdAt: "desc" },
        },
        items: true,
        payments: {
          orderBy: { receivedAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.customer.findMany({
      where: { tenantId },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.workflowStage.findMany({
      where: { tenantId, type: "completed" },
      select: { slug: true },
    }),
  ]);

  const completedStageSlugs = completedStages.map((stage) => stage.slug);
  const readyToInvoice = completedStageSlugs.length === 0
    ? []
    : await prisma.jobOrder.findMany({
      where: {
        tenantId,
        status: { in: completedStageSlugs },
        completedAt: { not: null },
        invoice: null,
      },
      include: {
        items: true,
      },
      orderBy: { completedAt: "desc" },
      take: 5,
    });

  const overdue = invoices.filter(
    (invoice) => invoice.status !== "void" && Number(invoice.balanceDue) > 0 && new Date(invoice.dueDate) < new Date()
  );
  const outstanding = invoices.filter((invoice) => invoice.status !== "void" && Number(invoice.balanceDue) > 0);
  const partial = invoices.filter((invoice) => invoice.status === "partial");
  const paid = invoices.filter((invoice) => invoice.status === "paid");
  const totalReceivables = outstanding.reduce((sum, invoice) => sum + Number(invoice.balanceDue), 0);
  const overdueTotal = overdue.reduce((sum, invoice) => sum + Number(invoice.balanceDue), 0);
  const collectedTotal = paid.reduce((sum, invoice) => sum + Number(invoice.amountPaid), 0);
  const readyToInvoiceValue = readyToInvoice.reduce(
    (sum, jobOrder) => sum + jobOrder.items.reduce((lineSum, item) => lineSum + Number(item.total), 0),
    0
  );

  return {
    invoices,
    customers,
    readyToInvoice,
    overdueCount: overdue.length,
    readyToInvoiceValue,
  };
}

export default async function BillingPage({ params, searchParams }: BillingPageProps) {
  const { tenant: tenantSlug } = await params;
  const { invoiceId } = await searchParams;
  const [tenant, session] = await Promise.all([getTenant(tenantSlug), authorize(tenantSlug)]);
  const crmEnabled = session.user.modules.includes("crm");
  const { invoices, customers, readyToInvoice, overdueCount, readyToInvoiceValue } = await getInvoices(tenant.id);

  const typedInvoices: Invoice[] = invoices.map((inv) => ({
    ...inv,
    subtotal: inv.subtotal.toString(),
    tax: inv.tax.toString(),
    total: inv.total.toString(),
    amountPaid: inv.amountPaid.toString(),
    balanceDue: inv.balanceDue.toString(),
    activities: inv.activities,
    items: inv.items.map((item) => ({
      ...item,
      unitPrice: item.unitPrice.toString(),
      total: item.total.toString(),
    })),
    payments: inv.payments.map((payment) => ({
      ...payment,
      amount: payment.amount.toString(),
    })),
  }));

  return (
    <PageShell className="h-auto min-h-full">
      <TopbarPageBridge title="Invoices" description={`${invoices.length} total${overdueCount > 0 ? ` · ${overdueCount} overdue overall` : ""}`} />
      <CreateInvoiceDialog
        tenantSlug={tenantSlug}
        tenantId={tenant.id}
        currencySymbol={tenant.currencySymbol}
        defaultTaxRate={Number(tenant.defaultTaxRate)}
        customers={customers}
        crmEnabled={crmEnabled}
        showTrigger={false}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.85fr)]">
        <BillingLedger
          invoices={typedInvoices}
          tenantSlug={tenantSlug}
          tenantId={tenant.id}
          currencySymbol={tenant.currencySymbol}
          currencyLocale={tenant.currencyLocale}
          highlightedInvoiceId={invoiceId}
        />

        <div className="content-start gap-4 xl:grid">
          <ContentPanel className="space-y-4 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 pb-4">
              <div>
                <p className="eyebrow-label text-primary">Billing</p>
                <h2 className="text-base font-semibold text-slate-950">Ready to invoice</h2>
              </div>
              <div className="text-right text-sm text-slate-500">
                <p>{readyToInvoice.length} ready</p>
                <p className="text-xs text-muted-foreground">
                  {tenant.currencySymbol}{readyToInvoiceValue.toLocaleString(tenant.currencyLocale, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {readyToInvoice.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-200/80 px-4 py-8 text-center text-sm text-muted-foreground">
                No completed job orders waiting for billing.
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
                      className="space-y-3 rounded-[24px] border border-slate-200/80 bg-white px-4 py-3 shadow-[0_14px_32px_-28px_rgba(15,23,42,0.22)]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-mono text-xs text-muted-foreground">{jobOrder.jobNo}</p>
                          <p className="truncate text-sm font-semibold text-slate-950">{jobOrder.customerName}</p>
                          <p className="text-xs text-muted-foreground">
                            {jobOrder.items.length} line item{jobOrder.items.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-slate-950">
                          {tenant.currencySymbol}{totalValue.toLocaleString(tenant.currencyLocale, { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <Button type="submit" size="sm" className="w-full rounded-full">Create Invoice</Button>
                    </form>
                  );
                })}
              </div>
            )}
          </ContentPanel>
        </div>
      </div>
    </PageShell>
  );
}

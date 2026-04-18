import { redirect } from "next/navigation";
import { prisma } from "@bizconnect/db";
import { getTenant } from "@/lib/tenant";
import { authorize } from "@/lib/authorize";
import { ContentPanel, PageHeader, PageShell } from "@/components/layout/page-shell";
import { InvoiceList, CreateInvoiceDialog } from "@/modules/billing";
import type { Invoice } from "@/modules/billing";
import { createInvoiceForJobOrder } from "@/modules/job-orders/actions";
import { Button } from "@/components/ui/button";

interface BillingPageProps {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ invoiceId?: string }>;
}

async function getInvoices(tenantId: string) {
  const [invoices, customers, completedStages] = await Promise.all([
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
  const { invoices, customers, readyToInvoice, overdueCount } = await getInvoices(tenant.id);

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
    <PageShell className="h-auto min-h-full">
      <PageHeader
        eyebrow="Billing"
        title="Invoices"
        description={`${invoices.length} total${overdueCount > 0 ? ` · ${overdueCount} overdue` : ""}`}
        action={
          <CreateInvoiceDialog
            tenantSlug={tenantSlug}
            tenantId={tenant.id}
            currencySymbol={tenant.currencySymbol}
            defaultTaxRate={Number(tenant.defaultTaxRate)}
            customers={customers}
            crmEnabled={crmEnabled}
          />
        }
      />

      <ContentPanel className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="eyebrow-label text-primary">Billing</p>
              <h2 className="text-base font-semibold text-slate-950">Ready to invoice</h2>
            </div>
            <div className="text-sm text-slate-500 sm:text-right">
              {readyToInvoice.length} ready
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
                    className="flex flex-col gap-3 rounded-[24px] border border-slate-200/80 bg-white px-4 py-3 shadow-[0_14px_32px_-28px_rgba(15,23,42,0.22)] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">{jobOrder.jobNo}</p>
                      <p className="text-sm font-semibold text-slate-950">{jobOrder.customerName}</p>
                      <p className="text-xs text-muted-foreground">
                        {jobOrder.items.length} line item{jobOrder.items.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <div className="text-left sm:text-right">
                        <p className="text-sm font-semibold text-slate-950">
                          {tenant.currencySymbol}{totalValue.toLocaleString(tenant.currencyLocale, { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <Button type="submit" size="sm" className="rounded-full">Create</Button>
                    </div>
                  </form>
                );
              })}
            </div>
          )}
      </ContentPanel>

      <ContentPanel className="overflow-hidden p-0">
        <InvoiceList
          invoices={typedInvoices}
          tenantSlug={tenantSlug}
          tenantId={tenant.id}
          currencySymbol={tenant.currencySymbol}
          currencyLocale={tenant.currencyLocale}
          highlightedInvoiceId={invoiceId}
        />
      </ContentPanel>
    </PageShell>
  );
}

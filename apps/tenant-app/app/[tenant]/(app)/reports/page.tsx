import { getTenant } from "@/lib/tenant";
import { getActiveModules } from "@/lib/module-registry";
import { getReportsSummary } from "@/modules/reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RevenueChart, PaymentMethodChart } from "@/modules/reports";
import { ReportsSummaryCards, TopItemsTable } from "@/modules/reports/components/reports-summary";
import { DateRangeFilter } from "@/modules/reports/components/date-range-filter";
import { FadeIn } from "@/components/dashboard/fade-in";
import { FileText, CheckCircle } from "lucide-react";
import { format } from "date-fns";

const toDateStr = (d: Date) => format(d, "yyyy-MM-dd");
import type { Granularity } from "@/modules/reports";

function parseGranularity(value: string | undefined): Granularity {
  if (value === "daily" || value === "weekly" || value === "monthly") return value;
  return "daily";
}

interface ReportsPageProps {
  params: Promise<{ tenant: string }>;
  searchParams?: Promise<{ section?: string; from?: string; to?: string; granularity?: string }>;
}

export default async function ReportsPage({ params, searchParams }: ReportsPageProps) {
  const { tenant: tenantSlug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rawSection = resolvedSearchParams?.section ?? "overview";

  // Date range defaults: last 30 days, daily
  const today = new Date();

  const fromStr = resolvedSearchParams?.from ?? format(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29), "yyyy-MM-dd");
  const toStr = resolvedSearchParams?.to ?? toDateStr(today);
  const granularity = parseGranularity(resolvedSearchParams?.granularity);

  const fromDate = new Date(fromStr + "T00:00:00");
  const toDate = new Date(toStr + "T00:00:00");

  const [tenant, activeModules] = await Promise.all([
    getTenant(tenantSlug),
    getActiveModules(tenantSlug),
  ]);

  const moduleSet = new Set(activeModules.map((m) => m.slug));
  const hasPos = moduleSet.has("pos");
  const hasBilling = moduleSet.has("billing");

  const section =
    (rawSection === "sales" && !hasPos) ||
    (rawSection === "payments" && !hasPos && !hasBilling)
      ? "overview"
      : rawSection;

  const summary = await getReportsSummary(tenant.id, moduleSet, {
    from: fromDate,
    to: toDate,
    granularity,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Reports & Analytics</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {section === "overview" && "Cross-module business summary"}
          {section === "sales" && "Sales performance, top sellers, and returns"}
          {section === "payments" && "Payment mix and invoice collections"}
        </p>
      </div>

      {/* Date range filter */}
      <DateRangeFilter from={fromStr} to={toStr} granularity={granularity} />

      {section === "overview" && (
        <>
          <ReportsSummaryCards
            summary={summary}
            currencySymbol={tenant.currencySymbol}
            currencyLocale={tenant.currencyLocale}
            hasPos={hasPos}
            hasBilling={hasBilling}
          />
          {(hasPos || hasBilling) && (
            <FadeIn delay={0.15}>
              <Card className="shadow-none border-zinc-200">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-zinc-900">Revenue Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <RevenueChart
                    data={summary.revenueByMonth}
                    currencySymbol={tenant.currencySymbol}
                    currencyLocale={tenant.currencyLocale}
                    hasPos={hasPos}
                    hasBilling={hasBilling}
                  />
                </CardContent>
              </Card>
            </FadeIn>
          )}
        </>
      )}

      {section === "sales" && (
        <>
          <FadeIn>
            <Card id="sales" className="scroll-mt-24 shadow-none border-zinc-200">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-zinc-900">Revenue Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <RevenueChart
                  data={summary.revenueByMonth}
                  currencySymbol={tenant.currencySymbol}
                  currencyLocale={tenant.currencyLocale}
                  hasPos={hasPos}
                  hasBilling={hasBilling}
                />
              </CardContent>
            </Card>
          </FadeIn>

          <FadeIn delay={0.1}>
            <Card className="shadow-none border-zinc-200">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-zinc-900">Top Selling Items</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <TopItemsTable
                  items={summary.topItems}
                  currencySymbol={tenant.currencySymbol}
                  currencyLocale={tenant.currencyLocale}
                />
              </CardContent>
            </Card>
          </FadeIn>

          <Card className="shadow-none border-zinc-200">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-zinc-900">Returns & Refunds</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-zinc-100 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Completed Refunds</p>
                <p className="mt-2 text-2xl font-bold text-zinc-900">{summary.refundCount}</p>
              </div>
              <div className="rounded-lg border border-zinc-100 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Refunded Value</p>
                <p className="mt-2 text-2xl font-bold text-amber-600">
                  {tenant.currencySymbol}{summary.totalRefunded.toLocaleString(tenant.currencyLocale, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-100 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Pending Returns</p>
                <p className="mt-2 text-2xl font-bold text-zinc-900">{summary.pendingReturnCount}</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {section === "payments" && (
        <div className="space-y-4">
          {hasBilling && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="shadow-none border-zinc-200">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-zinc-500">Invoiced</p>
                      <p className="mt-1.5 text-2xl font-bold text-blue-600">
                        {tenant.currencySymbol}{summary.totalInvoiced.toLocaleString(tenant.currencyLocale, { minimumFractionDigits: 2 })}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-400">from billing invoices</p>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-none border-zinc-200">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-zinc-500">Paid Invoices</p>
                      <p className="mt-1.5 text-2xl font-bold text-emerald-600">{summary.paidInvoices}</p>
                      <p className="mt-0.5 text-xs text-zinc-400">from billing invoices</p>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {hasPos && (
            <Card className="shadow-none border-zinc-200">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-zinc-900">Revenue by Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                {summary.paymentMethods.length === 0 ? (
                  <p className="py-12 text-center text-sm text-zinc-400">No sales data yet.</p>
                ) : (
                  <PaymentMethodChart data={summary.paymentMethods} currencySymbol={tenant.currencySymbol} currencyLocale={tenant.currencyLocale} />
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

import { getTenant } from "@/lib/tenant";
import { authorize } from "@/lib/authorize";
import { getReportsSummary } from "@/modules/reports";
import { ContentPanel, PageHeader, PageShell } from "@/components/layout/page-shell";
import { RevenueChart, PaymentMethodChart } from "@/modules/reports";
import { ReportsSummaryCards, TopItemsTable } from "@/modules/reports/components/reports-summary";
import { DateRangeFilter } from "@/modules/reports/components/date-range-filter";
import { FadeIn } from "@/components/dashboard/fade-in";
import { Card, CardContent } from "@/components/ui/card";
import { RotateCcw, Banknote, Clock3 } from "lucide-react";
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

  const [tenant, session] = await Promise.all([
    getTenant(tenantSlug),
    authorize(tenantSlug),
  ]);

  const moduleSet = new Set<string>(session.user.modules);
  const hasPos = moduleSet.has("pos");
  const hasBilling = moduleSet.has("billing");
  const hasAssets = moduleSet.has("assets");

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
    <PageShell className="h-auto min-h-full">
      <PageHeader
        eyebrow="Reports"
        title={section === "overview" ? "Overview" : section === "sales" ? "Sales" : "Payments"}
      />

      <ContentPanel className="p-4">
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
              <section className="pt-2">
                <div className="mb-5 border-b border-slate-200/80 pb-4">
                  <p className="eyebrow-label text-primary">Revenue</p>
                  <h2 className="text-base font-semibold text-slate-950">Over time</h2>
                </div>
                <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.25)]">
                  <RevenueChart
                    data={summary.revenueByMonth}
                    currencySymbol={tenant.currencySymbol}
                    currencyLocale={tenant.currencyLocale}
                    hasPos={hasPos}
                    hasBilling={hasBilling}
                  />
                </div>
              </section>
            </FadeIn>
          )}
        </>
      )}

      {section === "sales" && (
        <>
          <FadeIn>
            <section id="sales" className="scroll-mt-24 pt-2">
              <div className="mb-5 border-b border-slate-200/80 pb-4">
                <p className="eyebrow-label text-primary">Sales</p>
                <h2 className="text-base font-semibold text-slate-950">Revenue</h2>
              </div>
              <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.25)]">
                <RevenueChart
                  data={summary.revenueByMonth}
                  currencySymbol={tenant.currencySymbol}
                  currencyLocale={tenant.currencyLocale}
                  hasPos={hasPos}
                  hasBilling={hasBilling}
                />
              </div>
            </section>
          </FadeIn>

          <FadeIn delay={0.1}>
            <section className="pt-3">
              <div className="mb-5 border-b border-slate-200/80 pb-4">
                <p className="eyebrow-label text-primary">Sales</p>
                <h2 className="text-base font-semibold text-slate-950">Top items</h2>
              </div>
              <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_24px_60px_-42px_rgba(15,23,42,0.25)]">
                <TopItemsTable
                  items={summary.topItems}
                  currencySymbol={tenant.currencySymbol}
                  currencyLocale={tenant.currencyLocale}
                />
              </div>
            </section>
          </FadeIn>

          <section className="pt-3">
            <div className="mb-5 border-b border-slate-200/80 pb-4">
              <p className="eyebrow-label text-primary">Sales</p>
              <h2 className="text-base font-semibold text-slate-950">Returns</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              <Card className="h-full">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="eyebrow-label text-[0.64rem] tracking-[0.18em]">Refunds</p>
                      <p className="metric-value mt-2">{summary.refundCount}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 shadow-inner">
                      <RotateCcw className="h-4 w-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="h-full">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="eyebrow-label text-[0.64rem] tracking-[0.18em]">Refunded</p>
                      <p className="metric-value mt-2">
                        {tenant.currencySymbol}{summary.totalRefunded.toLocaleString(tenant.currencyLocale, { minimumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-inner">
                      <Banknote className="h-4 w-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="h-full">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="eyebrow-label text-[0.64rem] tracking-[0.18em]">Pending</p>
                      <p className="metric-value mt-2">{summary.pendingReturnCount}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 shadow-inner">
                      <Clock3 className="h-4 w-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        </>
      )}

      {section === "payments" && (
        <div className="space-y-4">
          {hasBilling && (
            <div className="grid gap-4 sm:grid-cols-2">
              <ReportsSummaryCards
                summary={summary}
                currencySymbol={tenant.currencySymbol}
                currencyLocale={tenant.currencyLocale}
                hasPos={false}
                hasBilling={true}
              />
            </div>
          )}

          {hasPos && (
            <section className="pt-2">
              <div className="mb-5 border-b border-slate-200/80 pb-4">
                <p className="eyebrow-label text-primary">Payments</p>
                <h2 className="text-base font-semibold text-slate-950">By method</h2>
              </div>
              <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.25)]">
                {summary.paymentMethods.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">No sales data yet.</p>
                ) : (
                  <PaymentMethodChart data={summary.paymentMethods} currencySymbol={tenant.currencySymbol} currencyLocale={tenant.currencyLocale} />
                )}
              </div>
            </section>
          )}
        </div>
      )}
      </ContentPanel>
    </PageShell>
  );
}

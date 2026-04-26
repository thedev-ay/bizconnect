import { getTenant } from "@/lib/tenant";
import { authorize } from "@/lib/authorize";
import { prisma } from "@bizconnect/db";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  AlertTriangle,
  Clock,
  ArrowRight,
  ClipboardList,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { RevenueChart, TransactionChart } from "@/components/dashboard/revenue-chart";
import { DashboardStatCards, type DashboardStatCardData } from "@/components/dashboard/stat-cards";
import { FadeIn } from "@/components/dashboard/fade-in";

interface DashboardPageProps {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ error?: string; range?: string }>;
}

const VALID_RANGES = ["today", "week", "month"] as const;
type RangeKey = typeof VALID_RANGES[number];

function trendPercent(current: number, prev: number | null): number | null {
  if (prev === null) return null;
  if (prev === 0) return current > 0 ? 100 : null;
  return Math.round(((current - prev) / prev) * 100);
}

const RANGE_LABELS: Record<RangeKey, { period: string; short: string }> = {
  today: { period: "Today", short: "Today" },
  week: { period: "This Week", short: "Week" },
  month: { period: "This Month", short: "Month" },
};

async function getServiceShopBillingStats(tenantId: string, modules: Set<string>) {
  if (!modules.has("job-orders")) {
    return { readyToInvoice: null, recentCompletedJobs: null };
  }

  try {
    const completedStages = await prisma.workflowStage.findMany({
      where: { tenantId, type: "completed" },
      select: { slug: true },
    });
    const completedStageSlugs = completedStages.map((stage) => stage.slug);

    const [readyToInvoice, recentCompletedJobs] = await Promise.all([
      modules.has("billing")
        ? completedStageSlugs.length === 0
          ? Promise.resolve([])
          : prisma.jobOrder.findMany({
            where: { tenantId, status: { in: completedStageSlugs }, completedAt: { not: null }, invoice: null },
            include: { items: { select: { total: true } } },
          })
        : Promise.resolve(null),
      completedStageSlugs.length === 0
        ? Promise.resolve([])
        : prisma.jobOrder.findMany({
        where: { tenantId, status: { in: completedStageSlugs }, completedAt: { not: null } },
        select: {
          id: true,
          jobNo: true,
          customerName: true,
          completedAt: true,
          invoice: { select: { id: true } },
        },
        orderBy: { completedAt: "desc" },
        take: 5,
      }),
    ]);

    return { readyToInvoice, recentCompletedJobs };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("job_order_id")) {
      return { readyToInvoice: null, recentCompletedJobs: null };
    }
    throw error;
  }
}

async function getDashboardStats(tenantId: string, modules: Set<string>, range: "today" | "week" | "month" = "month") {
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);

  let periodStart: Date;
  let prevPeriodStart: Date;
  let prevPeriodEnd: Date;

  if (range === "today") {
    periodStart = new Date(todayStart);
    prevPeriodStart = new Date(todayStart); prevPeriodStart.setDate(todayStart.getDate() - 1);
    prevPeriodEnd = new Date(todayStart); prevPeriodEnd.setMilliseconds(-1);
  } else if (range === "week") {
    periodStart = new Date(now); periodStart.setDate(now.getDate() - 6); periodStart.setHours(0, 0, 0, 0);
    prevPeriodStart = new Date(periodStart); prevPeriodStart.setDate(periodStart.getDate() - 7);
    prevPeriodEnd = new Date(periodStart); prevPeriodEnd.setMilliseconds(-1);
  } else {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    prevPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    prevPeriodEnd = new Date(periodStart); prevPeriodEnd.setMilliseconds(-1);
  }

  const monthStart = periodStart;
  const chartStart = range === "week" ? periodStart : range === "today" ? todayStart : (() => { const d = new Date(now); d.setDate(now.getDate() - 30); return d; })();

  const workflowStages = modules.has("job-orders")
    ? await prisma.workflowStage.findMany({ where: { tenantId }, select: { slug: true, type: true } })
    : [];
  const activeStages = workflowStages.filter((s) => s.type === "active").map((s) => s.slug);
  const cancelledSlug = workflowStages.find((s) => s.type === "cancelled")?.slug;

  const serviceShopBillingStatsPromise = getServiceShopBillingStats(tenantId, modules);

  const [
    todayAppointments,
    upcomingAppointments,
    totalCustomers,
    monthlySales,
    lowStockCount,
    pendingJobOrders,
    pendingLeaveRequests,
    last30DaysSales,
    pendingReturns,
    monthlyReturns,
    approvedReturns,
    recentReturns,
    activeJobOrders,
    overdueJobOrders,
    completedToday,
    monthlyInvoiced,
    monthlyCollected,
    lowStockWatchlist,
    prevSales,
    prevMonthlyInvoiced,
    prevMonthlyCollected,
  ] = await Promise.all([
    modules.has("appointments")
      ? prisma.appointment.count({ where: { tenantId, startAt: { gte: todayStart, lte: todayEnd } } })
      : Promise.resolve(null),

    modules.has("appointments")
      ? prisma.appointment.findMany({
          where: { tenantId, startAt: { gte: now }, status: { in: ["pending", "confirmed"] } },
          orderBy: { startAt: "asc" },
          take: 5,
          include: { service: { select: { name: true } }, employee: { select: { name: true } } },
        })
      : Promise.resolve(null),

    modules.has("crm")
      ? prisma.customer.count({ where: { tenantId } })
      : Promise.resolve(null),

    modules.has("pos")
      ? prisma.sale.aggregate({
          where: { tenantId, createdAt: { gte: monthStart } },
          _sum: { total: true },
          _count: true,
        })
      : Promise.resolve(null),

    modules.has("inventory")
      ? prisma.$queryRaw<{ count: bigint }[]>`
          SELECT COUNT(*)::int as count FROM inventory_items
          WHERE tenant_id = ${tenantId} AND quantity <= "reorder_at"
        `.then((r) => Number(r[0]?.count ?? 0))
      : Promise.resolve(null),

    modules.has("job-orders") && activeStages.length > 0
      ? prisma.jobOrder.count({ where: { tenantId, status: { in: activeStages } } })
      : Promise.resolve(null),

    modules.has("hr")
      ? prisma.leaveRequest.count({ where: { tenantId, status: "pending" } })
      : Promise.resolve(null),

    modules.has("pos")
      ? prisma.sale.findMany({
          where: { tenantId, createdAt: { gte: chartStart }, status: "completed" },
          select: { createdAt: true, total: true },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve(null),

    modules.has("pos")
      ? prisma.saleReturn.count({ where: { tenantId, status: "pending" } })
      : Promise.resolve(null),

    modules.has("pos")
      ? prisma.saleReturn.aggregate({
          where: { tenantId, createdAt: { gte: monthStart } },
          _sum: { refundAmount: true },
          _count: true,
        })
      : Promise.resolve(null),

    modules.has("pos")
      ? prisma.saleReturn.aggregate({
          where: { tenantId, status: "approved", createdAt: { gte: monthStart } },
          _sum: { refundAmount: true },
          _count: true,
        })
      : Promise.resolve(null),

    modules.has("pos")
      ? prisma.saleReturn.findMany({
          where: { tenantId },
          select: {
            id: true,
            referenceNo: true,
            status: true,
            refundAmount: true,
            createdAt: true,
            sale: { select: { referenceNo: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      : Promise.resolve(null),

    modules.has("job-orders")
      ? prisma.jobOrder.count({
          where: { tenantId, completedAt: null, ...(cancelledSlug ? { status: { not: cancelledSlug } } : {}) },
        })
      : Promise.resolve(null),

    modules.has("job-orders")
      ? prisma.jobOrder.count({
          where: {
            tenantId,
            completedAt: null,
            dueDate: { lt: now },
            ...(cancelledSlug ? { status: { not: cancelledSlug } } : {}),
          },
        })
      : Promise.resolve(null),

    modules.has("job-orders")
      ? prisma.jobOrder.count({
          where: {
            tenantId,
            completedAt: { gte: todayStart, lte: todayEnd },
          },
        })
      : Promise.resolve(null),

    modules.has("billing")
      ? prisma.invoice.aggregate({
          where: { tenantId, createdAt: { gte: monthStart } },
          _sum: { total: true },
          _count: true,
        })
      : Promise.resolve(null),

    modules.has("billing")
      ? prisma.invoice.aggregate({
          where: { tenantId, paidAt: { gte: monthStart }, status: "paid" },
          _sum: { total: true },
          _count: true,
        })
      : Promise.resolve(null),

    modules.has("inventory")
      ? prisma.$queryRaw<{ id: string; name: string; quantity: number; reorder_at: number }[]>`
          SELECT id, name, quantity, reorder_at
          FROM inventory_items
          WHERE tenant_id = ${tenantId} AND quantity <= reorder_at
          ORDER BY quantity ASC, name ASC
          LIMIT 5
        `
      : Promise.resolve(null),

    modules.has("pos")
      ? prisma.sale.aggregate({
          where: { tenantId, createdAt: { gte: prevPeriodStart, lte: prevPeriodEnd } },
          _sum: { total: true },
          _count: true,
        })
      : Promise.resolve(null),

    modules.has("billing")
      ? prisma.invoice.aggregate({
          where: { tenantId, createdAt: { gte: prevPeriodStart, lte: prevPeriodEnd } },
          _sum: { total: true },
          _count: true,
        })
      : Promise.resolve(null),

    modules.has("billing")
      ? prisma.invoice.aggregate({
          where: { tenantId, paidAt: { gte: prevPeriodStart, lte: prevPeriodEnd }, status: "paid" },
          _sum: { total: true },
          _count: true,
        })
      : Promise.resolve(null),
  ]);

  const { readyToInvoice, recentCompletedJobs } = await serviceShopBillingStatsPromise;

  const salesByDay = new Map<string, { revenue: number; count: number }>();
  if (last30DaysSales) {
    for (const sale of last30DaysSales) {
      const dayKey = sale.createdAt.toLocaleDateString("nl-NL", { month: "short", day: "numeric" });
      const existing = salesByDay.get(dayKey) || { revenue: 0, count: 0 };
      salesByDay.set(dayKey, {
        revenue: existing.revenue + Number(sale.total),
        count: existing.count + 1,
      });
    }
  }

  const chartData = Array.from(salesByDay.entries()).map(([day, data]) => ({
    day,
    revenue: Math.round(data.revenue),
    transactions: data.count,
  }));

  return {
    todayAppointments,
    upcomingAppointments,
    totalCustomers,
    monthlyRevenue: monthlySales ? Number(monthlySales._sum.total ?? 0) : null,
    monthlySalesCount: monthlySales?._count ?? null,
    lowStockItems: lowStockCount,
    pendingJobOrders,
    pendingLeaveRequests,
    pendingReturns,
    monthlyReturnCount: monthlyReturns?._count ?? 0,
    monthlyRefundAmount: monthlyReturns ? Number(monthlyReturns._sum.refundAmount ?? 0) : 0,
    approvedReturnCount: approvedReturns?._count ?? 0,
    approvedRefundAmount: approvedReturns ? Number(approvedReturns._sum.refundAmount ?? 0) : 0,
    recentReturns,
    activeJobOrders,
    overdueJobOrders,
    completedToday,
    readyToInvoiceCount: readyToInvoice?.length ?? 0,
    readyToInvoiceValue: readyToInvoice?.reduce(
      (sum, jobOrder) => sum + jobOrder.items.reduce((lineSum, item) => lineSum + Number(item.total), 0),
      0
    ) ?? 0,
    monthlyInvoicedTotal: monthlyInvoiced ? Number(monthlyInvoiced._sum.total ?? 0) : 0,
    monthlyInvoicedCount: monthlyInvoiced?._count ?? 0,
    monthlyCollectedTotal: monthlyCollected ? Number(monthlyCollected._sum.total ?? 0) : 0,
    prevPeriodRevenue: prevSales ? Number(prevSales._sum.total ?? 0) : null,
    prevPeriodInvoicedTotal: prevMonthlyInvoiced ? Number(prevMonthlyInvoiced._sum.total ?? 0) : null,
    prevPeriodCollectedTotal: prevMonthlyCollected ? Number(prevMonthlyCollected._sum.total ?? 0) : null,
    recentCompletedJobs,
    lowStockWatchlist: lowStockWatchlist?.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: Number(item.quantity),
      reorderAt: Number(item.reorder_at),
    })) ?? [],
    chartData,
  };
}

export default async function DashboardPage({ params, searchParams }: DashboardPageProps) {
  const { tenant: tenantSlug } = await params;
  const { error, range: rangeParam } = await searchParams;
  const range: RangeKey = VALID_RANGES.includes(rangeParam as RangeKey) ? (rangeParam as RangeKey) : "month";

  const [session, tenant] = await Promise.all([
    authorize(tenantSlug),
    getTenant(tenantSlug),
  ]);

  const moduleSet = new Set<string>(session.user.modules);
  const activeModules = session.user.moduleObjects;
  const data = await getDashboardStats(tenant.id, moduleSet, range);
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";
  const periodLabel = RANGE_LABELS[range].period;

  const opsCards = [
    moduleSet.has("job-orders") && {
      label: "Active Jobs",
      rawValue: data.activeJobOrders ?? 0,
      iconKey: "ClipboardList" as const,
      href: `/${tenantSlug}/job-orders`,
      color: "blue" as const,
    },
    moduleSet.has("job-orders") && {
      label: "Completed Today",
      rawValue: data.completedToday ?? 0,
      iconKey: "Package" as const,
      href: `/${tenantSlug}/job-orders`,
      color: "zinc" as const,
    },
    moduleSet.has("billing") && {
      label: "Ready to Invoice",
      rawValue: data.readyToInvoiceValue ?? 0,
      isCurrency: true,
      currencySymbol: tenant.currencySymbol,
      currencyLocale: tenant.currencyLocale,
      sub: `${data.readyToInvoiceCount ?? 0} completed jobs`,
      iconKey: "ReceiptText" as const,
      href: `/${tenantSlug}/billing`,
      color: "violet" as const,
    },
    moduleSet.has("billing") && {
      label: `Collected ${periodLabel}`,
      rawValue: data.monthlyCollectedTotal ?? 0,
      isCurrency: true,
      currencySymbol: tenant.currencySymbol,
      currencyLocale: tenant.currencyLocale,
      sub: `${data.monthlyInvoicedCount ?? 0} invoices raised`,
      iconKey: "ShoppingCart" as const,
      href: `/${tenantSlug}/billing`,
      color: "green" as const,
      trendPercent: trendPercent(data.monthlyCollectedTotal ?? 0, data.prevPeriodCollectedTotal),
    },
  ].filter(Boolean) as DashboardStatCardData[];

  const salesCards = [
    moduleSet.has("pos") && {
      label: `Sales ${periodLabel}`,
      rawValue: data.monthlyRevenue ?? 0,
      isCurrency: true,
      currencySymbol: tenant.currencySymbol,
      currencyLocale: tenant.currencyLocale,
      sub: `${data.monthlySalesCount ?? 0} completed sales`,
      iconKey: "ShoppingCart" as const,
      href: `/${tenantSlug}/sales`,
      color: "violet" as const,
      trendPercent: trendPercent(data.monthlyRevenue ?? 0, data.prevPeriodRevenue),
    },
    moduleSet.has("pos") && {
      label: `Refunded ${periodLabel}`,
      rawValue: data.monthlyRefundAmount ?? 0,
      isCurrency: true,
      currencySymbol: tenant.currencySymbol,
      currencyLocale: tenant.currencyLocale,
      sub: `${data.monthlyReturnCount ?? 0} return requests`,
      iconKey: "RotateCcw" as const,
      href: `/${tenantSlug}/sales`,
      color: (data.monthlyRefundAmount ?? 0) > 0 ? ("amber" as const) : ("zinc" as const),
    },
  ].filter(Boolean) as DashboardStatCardData[];

  const operationsCards = [
    moduleSet.has("appointments") && {
      label: "Today's Appointments",
      rawValue: data.todayAppointments ?? 0,
      iconKey: "Calendar" as const,
      href: `/${tenantSlug}/appointments`,
      color: "blue" as const,
    },
    moduleSet.has("crm") && {
      label: "Total Customers",
      rawValue: data.totalCustomers ?? 0,
      iconKey: "Users" as const,
      href: `/${tenantSlug}/crm`,
      color: "violet" as const,
    },
    moduleSet.has("inventory") && {
      label: "Low Stock Items",
      rawValue: data.lowStockItems ?? 0,
      iconKey: "Package" as const,
      href: `/${tenantSlug}/inventory`,
      color: (data.lowStockItems ?? 0) > 0 ? ("amber" as const) : ("zinc" as const),
      alert: (data.lowStockItems ?? 0) > 0,
    },
  ].filter(Boolean) as DashboardStatCardData[];

  const activeSections = [opsCards, salesCards, operationsCards].filter((g) => g.length > 0).length;
  const showSectionLabels = activeSections > 1;

  const attentionRows = [
    moduleSet.has("job-orders") && {
      label: "Overdue job orders",
      value: data.overdueJobOrders ?? 0,
      href: `/${tenantSlug}/job-orders`,
    },
    moduleSet.has("billing") && {
      label: "Completed work awaiting invoices",
      value: data.readyToInvoiceCount ?? 0,
      href: `/${tenantSlug}/billing`,
    },
    moduleSet.has("hr") && {
      label: "Leave requests",
      value: data.pendingLeaveRequests ?? 0,
      href: `/${tenantSlug}/hr`,
    },
    moduleSet.has("inventory") && {
      label: "Low stock items",
      value: data.lowStockItems ?? 0,
      href: `/${tenantSlug}/inventory`,
    },
    moduleSet.has("pos") && {
      label: "Pending returns",
      value: data.pendingReturns ?? 0,
      href: `/${tenantSlug}/sales`,
    },
  ].filter(Boolean) as { label: string; value: number; href: string }[];

  const hasActivityPanel =
    moduleSet.has("appointments") ||
    moduleSet.has("job-orders") ||
    (!moduleSet.has("appointments") && !moduleSet.has("job-orders") && moduleSet.has("inventory"));

  const today = new Date();
  const weekday = today.toLocaleDateString("en-US", { weekday: "long" });
  const longDate = today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="flex flex-col gap-5">
      {error === "module_disabled" && (
        <div className="flex items-center gap-2 rounded-[calc(var(--radius)+4px)] border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Module unavailable on this plan.
        </div>
      )}

      <FadeIn>
        <div className="flex flex-col gap-3 py-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow-label">{weekday} · {longDate}</p>
            <h1 className="mt-1.5 text-[1.7rem] font-semibold tracking-[-0.035em] text-foreground sm:text-[2rem]">
              Good {getTimeGreeting()}, {firstName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Here&rsquo;s what&rsquo;s happening across {tenant.name} today.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5 rounded-full border border-border/70 bg-muted/50 p-0.5">
            {VALID_RANGES.map((r) => (
              <Link
                key={r}
                href={`/${tenantSlug}/dashboard?range=${r}`}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  r === range
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {RANGE_LABELS[r].short}
              </Link>
            ))}
          </div>
        </div>
      </FadeIn>

      {activeModules.every((m: { isCore: boolean }) => m.isCore) && (
        <div className="surface flex flex-col items-center justify-center border-dashed py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Package className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-foreground">No modules enabled</h3>
        </div>
      )}

      {opsCards.length > 0 && (
        <section className="space-y-2.5">
          {showSectionLabels && <SectionLabel>Jobs &amp; Billing</SectionLabel>}
          <DashboardStatCards cards={opsCards} />
        </section>
      )}

      {salesCards.length > 0 && (
        <section className="space-y-3">
          {showSectionLabels && <SectionLabel>Sales</SectionLabel>}
          <DashboardStatCards cards={salesCards} cols={2} />
          {range !== "today" && data.chartData && data.chartData.length > 0 && (
            <FadeIn delay={0.1}>
              <div className="grid gap-4 lg:grid-cols-2">
                <RevenueChart data={data.chartData} currencySymbol={tenant.currencySymbol} />
                <TransactionChart data={data.chartData} />
              </div>
            </FadeIn>
          )}
        </section>
      )}

      {operationsCards.length > 0 && (
        <section className="space-y-2.5">
          {showSectionLabels && <SectionLabel>Operations</SectionLabel>}
          <DashboardStatCards cards={operationsCards} />
        </section>
      )}

      {(hasActivityPanel || moduleSet.has("pos") || attentionRows.length > 0) && (
        <FadeIn delay={0.15}>
          <div className="grid gap-4 lg:grid-cols-3">
            {moduleSet.has("appointments") && (
              <ActivityPanel
                title="Appointments"
                href={`/${tenantSlug}/appointments`}
                linkLabel="All"
                empty="No upcoming appointments"
                className="lg:col-span-2"
                items={data.upcomingAppointments ?? []}
                renderItem={(apt) => (
                  <div key={apt.id} className="relative flex items-center gap-3 px-5 py-3">
                    <StatusBar color={APT_STATUS_COLOR[apt.status] ?? "bg-muted-foreground/25"} />
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
                      <Clock className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {apt.customerName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {apt.service?.name ?? "—"} · {apt.employee?.name ?? "Unassigned"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-medium text-foreground">
                        {apt.startAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {apt.startAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                    <StatusDot status={apt.status} />
                  </div>
                )}
              />
            )}

            {moduleSet.has("job-orders") && !moduleSet.has("appointments") && (
              <ActivityPanel
                title="Completed jobs"
                href={`/${tenantSlug}/job-orders`}
                linkLabel="Board"
                empty="No completed jobs yet"
                className="lg:col-span-2"
                items={data.recentCompletedJobs ?? []}
                renderItem={(job) => (
                  <div key={job.id} className="relative flex items-center gap-3 px-5 py-3">
                    <StatusBar color={job.invoice ? "bg-[color:var(--success)]" : "bg-[color:var(--warning)]"} />
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
                      <ClipboardList className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                        {job.jobNo}
                      </p>
                      <p className="truncate text-sm font-medium text-foreground">
                        {job.customerName}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-foreground/80">
                        {job.completedAt?.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {job.invoice ? "Invoiced" : "Needs invoice"}
                      </p>
                    </div>
                  </div>
                )}
              />
            )}

            {!moduleSet.has("job-orders") && !moduleSet.has("appointments") && moduleSet.has("inventory") && (
              <ActivityPanel
                title="Low stock"
                href={`/${tenantSlug}/inventory`}
                linkLabel="Inventory"
                empty="Nothing needs restocking"
                className="lg:col-span-2"
                items={data.lowStockWatchlist ?? []}
                renderItem={(item) => (
                  <div key={item.id} className="relative flex items-center gap-3 px-5 py-3">
                    <StatusBar color="bg-[color:var(--warning)]" />
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_oklch,var(--warning)_18%,transparent)] text-[color:var(--warning)] ring-1 ring-[color-mix(in_oklch,var(--warning)_25%,transparent)]">
                      <Package className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Reorder at {item.reorderAt}</p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums text-[color:var(--warning)]">
                      {item.quantity} left
                    </p>
                  </div>
                )}
              />
            )}

            {(moduleSet.has("pos") || attentionRows.length > 0) && (
              <div className={`space-y-4 ${!hasActivityPanel ? "lg:col-span-3" : ""}`}>
                {moduleSet.has("pos") && (
                  <ActivityPanel
                    title="Returns"
                    href={`/${tenantSlug}/sales`}
                    linkLabel="Sales"
                    empty="No returns"
                    items={data.recentReturns ?? []}
                    renderItem={(ret) => (
                      <div key={ret.id} className="relative flex items-center gap-3 px-5 py-3">
                        <StatusBar color={RETURN_STATUS_COLOR[ret.status] ?? "bg-muted-foreground/25"} />
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground ring-1 ring-border/70">
                          <RotateCcw className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                            {ret.referenceNo}
                          </p>
                          <p className="truncate text-sm font-medium text-foreground">
                            {ret.sale.referenceNo}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[11px] capitalize text-muted-foreground">{ret.status}</p>
                          <p className="text-sm font-semibold tabular-nums text-foreground">
                            {tenant.currencySymbol}
                            {Number(ret.refundAmount ?? 0).toLocaleString(tenant.currencyLocale, {
                              minimumFractionDigits: 2,
                            })}
                          </p>
                        </div>
                      </div>
                    )}
                  />
                )}

                {attentionRows.length > 0 && (
                  <div className="surface overflow-hidden">
                    <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
                      <h3 className="text-sm font-semibold tracking-tight text-foreground">
                        Needs attention
                      </h3>
                    </div>
                    <div className="divide-y divide-border/50">
                      {attentionRows.map((row) => (
                        <AttentionRow key={row.label} {...row} warn={row.value > 0} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </FadeIn>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-1">
      <p className="eyebrow-label">{children}</p>
      <div className="h-px flex-1 bg-gradient-to-r from-border/60 to-transparent" />
    </div>
  );
}

function ActivityPanel<T>({
  title,
  href,
  linkLabel,
  items,
  renderItem,
  empty,
  className,
}: {
  title: string;
  href: string;
  linkLabel: string;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  empty: string;
  className?: string;
}) {
  return (
    <div className={`surface overflow-hidden ${className ?? ""}`}>
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          {linkLabel} <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {items.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-muted-foreground">{empty}</div>
      ) : (
        <div className="divide-y divide-border/50">{items.map(renderItem)}</div>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-[color:var(--warning)]",
    confirmed: "bg-[color:var(--info)]",
    "in-progress": "bg-primary",
    done: "bg-[color:var(--success)]",
  };
  return <div className={`h-2 w-2 shrink-0 rounded-full ${colors[status] ?? "bg-muted-foreground/40"}`} />;
}

function StatusBar({ color }: { color: string }) {
  return <span className={`absolute inset-y-2.5 left-0 w-[3px] rounded-r-full ${color}`} />;
}

const APT_STATUS_COLOR: Record<string, string> = {
  pending: "bg-[color:var(--warning)]",
  confirmed: "bg-[color:var(--info)]",
  "in-progress": "bg-primary",
  done: "bg-[color:var(--success)]",
};

const RETURN_STATUS_COLOR: Record<string, string> = {
  pending: "bg-[color:var(--warning)]",
  approved: "bg-[color:var(--success)]",
  rejected: "bg-destructive",
};

function AttentionRow({
  label,
  value,
  href,
  warn,
}: {
  label: string;
  value: number;
  href: string;
  warn: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-muted/40"
    >
      <span className="text-sm text-foreground/90">{label}</span>
      <Badge
        variant={warn ? "destructive" : "secondary"}
        className="min-w-[1.5rem] justify-center tabular-nums"
      >
        {value}
      </Badge>
    </Link>
  );
}

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

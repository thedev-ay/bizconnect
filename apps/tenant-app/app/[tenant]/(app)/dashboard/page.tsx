import { getTenant } from "@/lib/tenant";
import { authorize } from "@/lib/authorize";
import { prisma } from "@bizconnect/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, AlertTriangle, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { RevenueChart, TransactionChart } from "@/components/dashboard/revenue-chart";
import { DashboardStatCards, type DashboardStatCardData } from "@/components/dashboard/stat-cards";
import { FadeIn } from "@/components/dashboard/fade-in";

interface DashboardPageProps {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ error?: string }>;
}

async function getServiceShopBillingStats(tenantId: string, modules: Set<string>) {
  if (!modules.has("job-orders")) {
    return { readyToInvoice: null, recentCompletedJobs: null };
  }

  try {
    const [readyToInvoice, recentCompletedJobs] = await Promise.all([
      modules.has("billing")
        ? prisma.jobOrder.findMany({
            where: { tenantId, completedAt: { not: null }, invoice: null },
            include: { items: { select: { total: true } } },
          })
        : Promise.resolve(null),
      prisma.jobOrder.findMany({
        where: { tenantId, completedAt: { not: null } },
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

async function getDashboardStats(tenantId: string, modules: Set<string>) {
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 30);

  // Fetch workflow stages to avoid hardcoded slug assumptions
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
          where: { tenantId, createdAt: { gte: thirtyDaysAgo }, status: "completed" },
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
  ]);

  const { readyToInvoice, recentCompletedJobs } = await serviceShopBillingStatsPromise;

  // Aggregate sales by day for charting
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
  const { error } = await searchParams;

  const [session, tenant] = await Promise.all([
    authorize(tenantSlug),
    getTenant(tenantSlug),
  ]);

  const moduleSet = new Set<string>(session.user.modules);
  const activeModules = session.user.moduleObjects;
  const data = await getDashboardStats(tenant.id, moduleSet);
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  // Job Orders & Billing stats
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
      label: "Collected This Month",
      rawValue: data.monthlyCollectedTotal ?? 0,
      isCurrency: true,
      currencySymbol: tenant.currencySymbol,
      currencyLocale: tenant.currencyLocale,
      sub: `${data.monthlyInvoicedCount ?? 0} invoices raised`,
      iconKey: "ShoppingCart" as const,
      href: `/${tenantSlug}/billing`,
      color: "green" as const,
    },
  ].filter(Boolean) as DashboardStatCardData[];

  // POS / Sales stats
  const salesCards = [
    moduleSet.has("pos") && {
      label: "Sales This Month",
      rawValue: data.monthlyRevenue ?? 0,
      isCurrency: true,
      currencySymbol: tenant.currencySymbol,
      currencyLocale: tenant.currencyLocale,
      sub: `${data.monthlySalesCount ?? 0} completed sales`,
      iconKey: "ShoppingCart" as const,
      href: `/${tenantSlug}/sales`,
      color: "blue" as const,
    },
    moduleSet.has("pos") && {
      label: "Refunded This Month",
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

  // Operations stats (appointments, CRM, inventory)
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

  // Build attention rows only for active modules
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

  // Which main activity panel to show in the bottom grid
  const hasActivityPanel =
    moduleSet.has("appointments") ||
    moduleSet.has("job-orders") ||
    (!moduleSet.has("appointments") && !moduleSet.has("job-orders") && moduleSet.has("inventory"));

  return (
    <div className="space-y-8">
      {error === "module_disabled" && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          That module is not available on your current plan.
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Good {getTimeGreeting()}, {firstName}
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {new Date().toLocaleDateString("nl-NL", {
            weekday: "long", month: "long", day: "numeric", year: "numeric",
          })}
        </p>
      </div>

      {/* No modules fallback */}
      {activeModules.every((m: { isCore: boolean }) => m.isCore) && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
            <Package className="h-6 w-6 text-zinc-400" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-zinc-700">No business modules enabled</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Contact your administrator to enable modules for your workspace.
          </p>
        </div>
      )}

      {/* Job Orders & Billing */}
      {opsCards.length > 0 && (
        <section className="space-y-3">
          {showSectionLabels && (
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Job Orders & Billing</p>
          )}
          <DashboardStatCards cards={opsCards} />
        </section>
      )}

      {/* Sales — stat cards with charts directly below */}
      {salesCards.length > 0 && (
        <section className="space-y-3">
          {showSectionLabels && (
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Sales</p>
          )}
          <DashboardStatCards cards={salesCards} cols={2} />
          {data.chartData && data.chartData.length > 0 && (
            <FadeIn delay={0.1}>
              <div className="grid gap-4 lg:grid-cols-2">
                <RevenueChart data={data.chartData} currencySymbol={tenant.currencySymbol} />
                <TransactionChart data={data.chartData} />
              </div>
            </FadeIn>
          )}
        </section>
      )}

      {/* Operations — appointments, CRM, inventory */}
      {operationsCards.length > 0 && (
        <section className="space-y-3">
          {showSectionLabels && (
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Operations</p>
          )}
          <DashboardStatCards cards={operationsCards} />
        </section>
      )}

      {/* Activity grid — main panel (2/3) + stacked sidebar (1/3) */}
      {(hasActivityPanel || moduleSet.has("pos") || attentionRows.length > 0) && (
        <FadeIn delay={0.15}>
          <div className="grid gap-4 lg:grid-cols-3">

            {/* Main activity panel — first available from: appointments › recent jobs › low stock */}
            {moduleSet.has("appointments") && (
              <div className="lg:col-span-2">
                <Card className="shadow-none border-zinc-200">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-sm font-semibold text-zinc-700">Upcoming Appointments</CardTitle>
                    <Link
                      href={`/${tenantSlug}/appointments`}
                      className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                    >
                      View all <ArrowRight className="h-3 w-3" />
                    </Link>
                  </CardHeader>
                  <CardContent className="p-0">
                    {!data.upcomingAppointments?.length ? (
                      <div className="px-6 py-8 text-center text-sm text-zinc-400">No upcoming appointments</div>
                    ) : (
                      <div className="divide-y divide-zinc-100">
                        {data.upcomingAppointments.map((apt) => (
                          <div key={apt.id} className="flex items-center gap-3 px-6 py-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                              <Clock className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-zinc-800">{apt.customerName}</p>
                              <p className="truncate text-xs text-zinc-400">
                                {apt.service?.name ?? "—"} · {apt.employee?.name ?? "Unassigned"}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs font-medium text-zinc-700">
                                {apt.startAt.toLocaleDateString("nl-NL", { month: "short", day: "numeric" })}
                              </p>
                              <p className="text-xs text-zinc-400">
                                {apt.startAt.toLocaleTimeString("nl-NL", { hour: "numeric", minute: "2-digit" })}
                              </p>
                            </div>
                            <StatusDot status={apt.status} />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {moduleSet.has("job-orders") && !moduleSet.has("appointments") && (
              <div className="lg:col-span-2">
                <Card className="shadow-none border-zinc-200">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-sm font-semibold text-zinc-700">Recently Completed Jobs</CardTitle>
                    <Link
                      href={`/${tenantSlug}/job-orders`}
                      className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                    >
                      View board <ArrowRight className="h-3 w-3" />
                    </Link>
                  </CardHeader>
                  <CardContent className="p-0">
                    {!data.recentCompletedJobs?.length ? (
                      <div className="px-6 py-8 text-center text-sm text-zinc-400">No completed jobs yet</div>
                    ) : (
                      <div className="divide-y divide-zinc-100">
                        {data.recentCompletedJobs.map((job) => (
                          <div key={job.id} className="flex items-center justify-between gap-3 px-6 py-3">
                            <div>
                              <p className="font-mono text-xs text-zinc-400">{job.jobNo}</p>
                              <p className="text-sm font-medium text-zinc-800">{job.customerName}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-zinc-500">
                                {job.completedAt?.toLocaleDateString("nl-NL", { month: "short", day: "numeric" })}
                              </p>
                              <p className="text-[11px] text-zinc-400">{job.invoice ? "Invoiced" : "Needs invoice"}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {!moduleSet.has("job-orders") && !moduleSet.has("appointments") && moduleSet.has("inventory") && (
              <div className="lg:col-span-2">
                <Card className="shadow-none border-zinc-200">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-sm font-semibold text-zinc-700">Low Stock Watchlist</CardTitle>
                    <Link
                      href={`/${tenantSlug}/inventory`}
                      className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                    >
                      View inventory <ArrowRight className="h-3 w-3" />
                    </Link>
                  </CardHeader>
                  <CardContent className="p-0">
                    {!data.lowStockWatchlist?.length ? (
                      <div className="px-6 py-8 text-center text-sm text-zinc-400">No urgent restocks right now</div>
                    ) : (
                      <div className="divide-y divide-zinc-100">
                        {data.lowStockWatchlist.map((item) => (
                          <div key={item.id} className="flex items-center justify-between gap-3 px-6 py-3">
                            <div>
                              <p className="text-sm font-medium text-zinc-800">{item.name}</p>
                              <p className="text-xs text-zinc-400">Reorder at {item.reorderAt}</p>
                            </div>
                            <p className="text-sm font-semibold text-amber-600">{item.quantity} left</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Right sidebar — recent returns + needs attention stacked */}
            {(moduleSet.has("pos") || attentionRows.length > 0) && (
              <div className={`space-y-4 ${!hasActivityPanel ? "lg:col-span-3" : ""}`}>
                {moduleSet.has("pos") && (
                  <Card className="shadow-none border-zinc-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                      <CardTitle className="text-sm font-semibold text-zinc-700">Recent Returns</CardTitle>
                      <Link
                        href={`/${tenantSlug}/sales`}
                        className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                      >
                        Sales history <ArrowRight className="h-3 w-3" />
                      </Link>
                    </CardHeader>
                    <CardContent className="p-0">
                      {!data.recentReturns?.length ? (
                        <div className="px-6 py-8 text-center text-sm text-zinc-400">No return activity yet</div>
                      ) : (
                        <div className="divide-y divide-zinc-100">
                          {data.recentReturns.map((saleReturn) => (
                            <div key={saleReturn.id} className="flex items-center justify-between gap-3 px-6 py-3">
                              <div>
                                <p className="font-mono text-xs text-zinc-400">{saleReturn.referenceNo}</p>
                                <p className="text-sm font-medium text-zinc-800">{saleReturn.sale.referenceNo}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs capitalize text-zinc-500">{saleReturn.status}</p>
                                <p className="text-sm font-semibold text-zinc-800">
                                  {tenant.currencySymbol}{Number(saleReturn.refundAmount ?? 0).toLocaleString(tenant.currencyLocale, { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {attentionRows.length > 0 && (
                  <Card className="shadow-none border-zinc-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-zinc-700">Needs Attention</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {attentionRows.map((row) => (
                        <AttentionRow key={row.label} {...row} warn={row.value > 0} />
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

          </div>
        </FadeIn>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-amber-400",
    confirmed: "bg-blue-400",
    "in-progress": "bg-violet-400",
    done: "bg-emerald-400",
  };
  return <div className={`h-2 w-2 shrink-0 rounded-full ${colors[status] ?? "bg-zinc-300"}`} />;
}

function AttentionRow({ label, value, href, warn }: { label: string; value: number; href: string; warn: boolean }) {
  return (
    <Link href={href} className="flex items-center justify-between hover:opacity-75 transition-opacity">
      <span className="text-sm text-zinc-600">{label}</span>
      <Badge variant={warn ? "destructive" : "secondary"} className="text-xs min-w-[1.5rem] justify-center">
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

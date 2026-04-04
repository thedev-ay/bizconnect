import { auth } from "@/lib/auth";
import { getTenant } from "@/lib/tenant";
import { getActiveModules } from "@/lib/module-registry";
import { prisma } from "@bizconnect/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Users,
  ShoppingCart,
  Package,
  AlertTriangle,
  Clock,
  ArrowRight,
  RotateCcw,
  ClipboardList,
  ReceiptText,
} from "lucide-react";
import Link from "next/link";
import { RevenueChart, TransactionChart } from "@/components/dashboard/revenue-chart";

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
    activeJobOrders,
    overdueJobOrders,
    completedToday,
    monthlyInvoiced,
    monthlyCollected,
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

    modules.has("job-orders")
      ? prisma.jobOrder.count({ where: { tenantId, status: { in: ["pending", "in-progress"] } } })
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

    modules.has("job-orders")
      ? prisma.jobOrder.count({
          where: { tenantId, completedAt: null, status: { not: "cancelled" } },
        })
      : Promise.resolve(null),

    modules.has("job-orders")
      ? prisma.jobOrder.count({
          where: {
            tenantId,
            completedAt: null,
            status: { not: "cancelled" },
            dueDate: { lt: now },
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
    chartData,
  };
}

export default async function DashboardPage({ params, searchParams }: DashboardPageProps) {
  const { tenant: tenantSlug } = await params;
  const { error } = await searchParams;

  const [session, tenant, activeModules] = await Promise.all([
    auth(),
    getTenant(tenantSlug),
    getActiveModules(tenantSlug),
  ]);

  const moduleSet = new Set(activeModules.map((m) => m.slug));
  const data = await getDashboardStats(tenant.id, moduleSet);
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  // Build stat cards only for active modules
  const statCards = [
    moduleSet.has("job-orders") && {
      label: "Active Jobs",
      value: data.activeJobOrders ?? 0,
      icon: ClipboardList,
      href: `/${tenantSlug}/job-orders`,
      color: "blue" as const,
    },
    moduleSet.has("job-orders") && {
      label: "Completed Today",
      value: data.completedToday ?? 0,
      icon: Package,
      href: `/${tenantSlug}/job-orders`,
      color: "zinc" as const,
    },
    moduleSet.has("billing") && {
      label: "Ready to Invoice",
      value: `${tenant.currencySymbol}${(data.readyToInvoiceValue ?? 0).toLocaleString(tenant.currencyLocale, { minimumFractionDigits: 0 })}`,
      sub: `${data.readyToInvoiceCount ?? 0} completed jobs`,
      icon: ReceiptText,
      href: `/${tenantSlug}/billing`,
      color: "violet" as const,
    },
    moduleSet.has("billing") && {
      label: "Collected This Month",
      value: `${tenant.currencySymbol}${(data.monthlyCollectedTotal ?? 0).toLocaleString(tenant.currencyLocale, { minimumFractionDigits: 0 })}`,
      sub: `${data.monthlyInvoicedCount ?? 0} invoices raised`,
      icon: ShoppingCart,
      href: `/${tenantSlug}/billing`,
      color: "green" as const,
    },
    moduleSet.has("appointments") && {
      label: "Today's Appointments",
      value: data.todayAppointments ?? 0,
      icon: Calendar,
      href: `/${tenantSlug}/appointments`,
      color: "blue" as const,
    },
    moduleSet.has("crm") && {
      label: "Total Customers",
      value: data.totalCustomers ?? 0,
      icon: Users,
      href: `/${tenantSlug}/crm`,
      color: "violet" as const,
    },
    moduleSet.has("inventory") && {
      label: "Low Stock Items",
      value: data.lowStockItems ?? 0,
      icon: Package,
      href: `/${tenantSlug}/inventory`,
      color: (data.lowStockItems ?? 0) > 0 ? ("amber" as const) : ("zinc" as const),
      alert: (data.lowStockItems ?? 0) > 0,
    },
  ].filter(Boolean) as StatCardProps[];

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
      href: `/${tenantSlug}/pos/returns`,
    },
  ].filter(Boolean) as { label: string; value: number; href: string }[];

  return (
    <div className="space-y-6">
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
      {activeModules.every((m) => m.isCore) && (
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

      {/* Stat cards — only rendered if tenant has relevant modules */}
      {statCards.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>
      )}

      {/* Charts — only rendered if POS module is active */}
      {moduleSet.has("pos") && data.chartData && data.chartData.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <RevenueChart data={data.chartData} currencySymbol={tenant.currencySymbol} />
          <TransactionChart data={data.chartData} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Upcoming appointments — only if module is active */}
        {moduleSet.has("appointments") && (
          <div className="lg:col-span-2">
            <Card className="shadow-none border-zinc-200">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-semibold text-zinc-700">
                  Upcoming Appointments
                </CardTitle>
                <Link
                  href={`/${tenantSlug}/appointments`}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                >
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {!data.upcomingAppointments?.length ? (
                  <div className="px-6 py-8 text-center text-sm text-zinc-400">
                    No upcoming appointments
                  </div>
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
                <CardTitle className="text-sm font-semibold text-zinc-700">
                  Recently Completed Jobs
                </CardTitle>
                <Link
                  href={`/${tenantSlug}/job-orders`}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                >
                  View board <ArrowRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {!data.recentCompletedJobs?.length ? (
                  <div className="px-6 py-8 text-center text-sm text-zinc-400">
                    No completed jobs yet
                  </div>
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
                          <p className="text-[11px] text-zinc-400">
                            {job.invoice ? "Invoiced" : "Needs invoice"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Needs Attention — only shown if at least one row exists */}
        {attentionRows.length > 0 && (
          <div className={moduleSet.has("appointments") ? "" : "lg:col-span-3"}>
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
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

const colorMap = {
  blue:   { bg: "bg-blue-50",    text: "text-blue-600" },
  green:  { bg: "bg-emerald-50", text: "text-emerald-600" },
  violet: { bg: "bg-violet-50",  text: "text-violet-600" },
  amber:  { bg: "bg-amber-50",   text: "text-amber-600" },
  zinc:   { bg: "bg-zinc-100",   text: "text-zinc-500" },
};

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  href: string;
  color?: keyof typeof colorMap;
  alert?: boolean;
}

function StatCard({ label, value, sub, icon: Icon, href, color = "zinc", alert = false }: StatCardProps) {
  const c = colorMap[color];
  return (
    <Link href={href}>
      <Card className="shadow-none border-zinc-200 hover:border-zinc-300 transition-colors cursor-pointer">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-500">{label}</p>
              <p className="mt-1.5 text-2xl font-bold text-zinc-900">{value}</p>
              {sub && <p className="mt-0.5 text-xs text-zinc-400">{sub}</p>}
            </div>
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${c.bg}`}>
              <Icon className={`h-4.5 w-4.5 ${c.text}`} />
            </div>
          </div>
          {alert && (
            <div className="mt-3 flex items-center gap-1 text-xs text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              Needs restocking
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
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

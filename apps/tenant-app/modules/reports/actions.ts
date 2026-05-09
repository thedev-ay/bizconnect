"use server";

import { prisma } from "@bizconnect/db";
import {
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  format,
  getISOWeek,
  getISOWeekYear,
  startOfWeek,
} from "date-fns";
import type { ReportsSummary, RevenueDataPoint, TopItem, PaymentMethodBreakdown, Granularity } from "./types";

function getBucketKey(date: Date, granularity: Granularity): string {
  if (granularity === "daily") return format(date, "yyyy-MM-dd");
  if (granularity === "weekly") {
    const week = String(getISOWeek(date)).padStart(2, "0");
    return `${getISOWeekYear(date)}-W${week}`;
  }
  return format(date, "yyyy-MM");
}

function getBucketLabel(date: Date, granularity: Granularity): string {
  if (granularity === "daily")   return format(date, "MMM d");
  if (granularity === "weekly")  return `W${String(getISOWeek(date)).padStart(2, "0")} '${format(date, "yy")}`;
  return format(date, "MMM yyyy");
}

function buildBucketMap(from: Date, to: Date, granularity: Granularity): Map<string, RevenueDataPoint> {
  const map = new Map<string, RevenueDataPoint>();

  const dates =
    granularity === "daily"
      ? eachDayOfInterval({ start: from, end: to })
      : granularity === "weekly"
        ? eachWeekOfInterval({ start: from, end: to }, { weekStartsOn: 1 })
        : eachMonthOfInterval({ start: from, end: to });

  for (const date of dates) {
    const key = getBucketKey(date, granularity);
    if (!map.has(key)) {
      map.set(key, { label: getBucketLabel(date, granularity), sales: 0, invoices: 0 });
    }
  }
  return map;
}

export async function getReportsSummary(
  tenantId: string,
  modules: Set<string>,
  options: { from: Date; to: Date; granularity: Granularity }
): Promise<ReportsSummary> {
  const { from, to, granularity } = options;
  const toEnd = new Date(to);
  toEnd.setHours(23, 59, 59, 999);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setHours(23, 59, 59, 999);

  const hasPos = modules.has("pos");
  const hasBilling = modules.has("billing");
  const hasAssets = modules.has("assets");

  const workflowStagesPromise = hasAssets && modules.has("job-orders")
    ? prisma.workflowStage.findMany({
        where: { tenantId },
        select: { slug: true, type: true },
      })
    : Promise.resolve([]);

  const [sales, invoices, saleItems, saleReturns, assets, workflowStages] = await Promise.all([
    hasPos
      ? prisma.sale.findMany({
          where: { tenantId, createdAt: { gte: from, lte: toEnd } },
          select: {
            total: true,
            paymentMethod: true,
            createdAt: true,
            status: true,
            items: { select: { name: true, quantity: true, total: true } },
          },
        })
      : Promise.resolve([]),
    hasBilling
      ? prisma.invoice.findMany({
          where: { tenantId, createdAt: { gte: from, lte: toEnd } },
          select: { total: true, status: true, createdAt: true },
        })
      : Promise.resolve([]),
    hasPos
      ? prisma.saleItem.findMany({
          where: { sale: { tenantId, createdAt: { gte: from, lte: toEnd } } },
          select: { name: true, quantity: true, total: true },
        })
      : Promise.resolve([]),
    hasPos
      ? prisma.saleReturn.findMany({
          where: { tenantId, createdAt: { gte: from, lte: toEnd } },
          select: { status: true, refundAmount: true },
        })
      : Promise.resolve([]),
    hasAssets
      ? (prisma as any).asset.findMany({
          where: { tenantId },
          select: {
            id: true,
            createdAt: true,
            jobOrders: {
              select: {
                id: true,
                status: true,
                createdAt: true,
                completedAt: true,
              },
            },
          },
        }).catch(() => [])
      : Promise.resolve([]),
    workflowStagesPromise,
  ]);

  // Bucket revenue by granularity
  const bucketMap = buildBucketMap(from, to, granularity);

  for (const sale of sales) {
    if (sale.status !== "completed") continue;
    const key = getBucketKey(
      granularity === "weekly" ? startOfWeek(new Date(sale.createdAt), { weekStartsOn: 1 }) : new Date(sale.createdAt),
      granularity
    );
    const entry = bucketMap.get(key);
    if (entry) entry.sales += Number(sale.total);
  }

  for (const inv of invoices) {
    if (inv.status !== "paid") continue;
    const key = getBucketKey(
      granularity === "weekly" ? startOfWeek(new Date(inv.createdAt), { weekStartsOn: 1 }) : new Date(inv.createdAt),
      granularity
    );
    const entry = bucketMap.get(key);
    if (entry) entry.invoices += Number(inv.total);
  }

  // Top items
  const itemMap = new Map<string, { qty: number; rev: number }>();
  for (const item of saleItems) {
    const existing = itemMap.get(item.name) ?? { qty: 0, rev: 0 };
    existing.qty += item.quantity;
    existing.rev += Number(item.total);
    itemMap.set(item.name, existing);
  }
  const topItems: TopItem[] = [...itemMap.entries()]
    .sort((a, b) => b[1].rev - a[1].rev)
    .slice(0, 5)
    .map(([name, { qty, rev }]) => ({ name, quantitySold: qty, revenue: rev }));

  // Payment methods
  const pmMap = new Map<string, { count: number; total: number }>();
  for (const sale of sales) {
    if (sale.status !== "completed") continue;
    const existing = pmMap.get(sale.paymentMethod) ?? { count: 0, total: 0 };
    existing.count += 1;
    existing.total += Number(sale.total);
    pmMap.set(sale.paymentMethod, existing);
  }
  const paymentMethods: PaymentMethodBreakdown[] = [...pmMap.entries()].map(
    ([method, { count, total }]) => ({ method, count, total })
  );

  const totalSales = sales
    .filter((s) => s.status === "completed")
    .reduce((sum, s) => sum + Number(s.total), 0);
  const salesCompletedCount = sales.filter((s) => s.status === "completed").length;
  const salesVoidedCount = sales.filter((s) => s.status === "voided").length;
  const todayCompletedSales = sales.filter((s) => {
    if (s.status !== "completed") return false;
    const createdAt = new Date(s.createdAt);
    return createdAt >= todayStart && createdAt <= todayEnd;
  });
  const todaySalesRevenue = todayCompletedSales.reduce((sum, s) => sum + Number(s.total), 0);
  const todaySalesCount = todayCompletedSales.length;
  const totalInvoiced = invoices.reduce((sum, i) => sum + Number(i.total), 0);
  const paidInvoices = invoices.filter((i) => i.status === "paid").length;
  const refundedReturns = saleReturns.filter((r) => r.status === "refunded");
  const totalRefunded = refundedReturns.reduce((sum, r) => sum + Number(r.refundAmount ?? 0), 0);
  const refundCount = refundedReturns.length;
  const pendingReturnCount = saleReturns.filter((r) => r.status === "pending").length;
  const activeStageSlugs = new Set(workflowStages.filter((stage) => stage.type === "active").map((stage) => stage.slug));
  const totalAssets = assets.length;
  const assetsWithOpenJobs = assets.filter((asset: any) =>
    asset.jobOrders.some((job: any) => activeStageSlugs.size === 0 ? !job.completedAt : activeStageSlugs.has(job.status))
  ).length;
  const recentServicedAssets = assets.filter((asset: any) =>
    asset.jobOrders.some((job: any) => {
      const createdAt = new Date(job.createdAt);
      return createdAt >= from && createdAt <= toEnd;
    })
  ).length;

  return {
    totalRevenue: totalSales + invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + Number(i.total), 0),
    totalSales,
    salesCompletedCount,
    salesVoidedCount,
    todaySalesRevenue,
    todaySalesCount,
    totalInvoiced,
    paidInvoices,
    totalRefunded,
    refundCount,
    pendingReturnCount,
    totalAssets,
    assetsWithOpenJobs,
    recentServicedAssets,
    revenueByMonth: [...bucketMap.values()],
    topItems,
    paymentMethods,
  };
}

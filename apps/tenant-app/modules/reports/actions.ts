"use server";

import { prisma } from "@bizconnect/db";
import type { ReportsSummary, RevenueDataPoint, TopItem, PaymentMethodBreakdown } from "./types";

export async function getReportsSummary(tenantId: string): Promise<ReportsSummary> {
  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [sales, invoices, saleItems] = await Promise.all([
    prisma.sale.findMany({
      where: { tenantId, createdAt: { gte: twelveMonthsAgo } },
      select: {
        total: true,
        paymentMethod: true,
        createdAt: true,
        status: true,
        items: { select: { name: true, quantity: true, total: true } },
      },
    }),
    prisma.invoice.findMany({
      where: { tenantId, createdAt: { gte: twelveMonthsAgo } },
      select: { total: true, status: true, createdAt: true },
    }),
    prisma.saleItem.findMany({
      where: { sale: { tenantId, createdAt: { gte: twelveMonthsAgo } } },
      select: { name: true, quantity: true, total: true },
    }),
  ]);

  // Monthly revenue
  const monthMap = new Map<string, RevenueDataPoint>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("nl-NL", { month: "short", year: "numeric" });
    monthMap.set(key, { month: label, sales: 0, invoices: 0 });
  }

  for (const sale of sales) {
    if (sale.status !== "completed") continue;
    const d = new Date(sale.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const entry = monthMap.get(key);
    if (entry) entry.sales += Number(sale.total);
  }

  for (const inv of invoices) {
    if (inv.status !== "paid") continue;
    const d = new Date(inv.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const entry = monthMap.get(key);
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
  const totalInvoiced = invoices.reduce((sum, i) => sum + Number(i.total), 0);
  const paidInvoices = invoices.filter((i) => i.status === "paid").length;

  return {
    totalRevenue: totalSales + invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + Number(i.total), 0),
    totalSales,
    totalInvoiced,
    paidInvoices,
    revenueByMonth: [...monthMap.values()],
    topItems,
    paymentMethods,
  };
}

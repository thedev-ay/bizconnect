import { NextResponse } from "next/server";
import { prisma } from "@bizconnect/db";
import { authorize } from "@/lib/authorize";
import { getActiveBranchId } from "@/lib/branch";
import type { Prisma } from "@bizconnect/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant: tenantSlug } = await params;
  const [session, branchId] = await Promise.all([
    authorize(tenantSlug),
    getActiveBranchId(),
  ]);
  const { searchParams } = new URL(req.url);

  const SOURCE_BY_MODULE: Record<string, string> = {
    pos: "pos",
    "job-orders": "job-order",
    appointments: "appointment",
  };
  const enabledSources = session.user.modules
    .filter((m) => m in SOURCE_BY_MODULE)
    .map((m) => SOURCE_BY_MODULE[m]);

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true },
  });
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const requestedPageSize = Number.parseInt(searchParams.get("pageSize") ?? "25", 10) || 25;
  const pageSize = Math.min(100, Math.max(1, requestedPageSize));
  const search = searchParams.get("search")?.trim() ?? "";
  const payment = searchParams.get("payment") ?? "all";
  const status = searchParams.get("status") ?? "all";
  const source = searchParams.get("source") ?? "all";

  const saleWhere: Prisma.SaleWhereInput = {
    tenantId: tenant.id,
    ...(branchId ? { branchId } : {}),
    source: { in: enabledSources },
    ...(search
      ? {
          referenceNo: {
            contains: search,
            mode: "insensitive",
          },
        }
      : {}),
    ...(payment !== "all" ? { paymentMethod: payment } : {}),
    ...(status !== "all" ? { status } : {}),
    ...(source !== "all" ? { source } : {}),
  };

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const [
    totalItems,
    sales,
    totalRevenueAgg,
    todayRevenueAgg,
    todayCount,
    completedCount,
    voidedCount,
    filteredReturns,
  ] = await Promise.all([
    prisma.sale.count({ where: saleWhere }),
    prisma.sale.findMany({
      where: saleWhere,
      include: {
        items: {
          select: { id: true, name: true, quantity: true, unitPrice: true, total: true },
        },
        returns: {
          include: {
            items: { select: { id: true, saleItemId: true, quantity: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.sale.aggregate({
      where: { ...saleWhere, status: "completed" },
      _sum: { total: true },
    }),
    prisma.sale.aggregate({
      where: {
        ...saleWhere,
        status: "completed",
        createdAt: { gte: todayStart, lte: todayEnd },
      },
      _sum: { total: true },
    }),
    prisma.sale.count({
      where: {
        ...saleWhere,
        status: "completed",
        createdAt: { gte: todayStart, lte: todayEnd },
      },
    }),
    prisma.sale.count({ where: { ...saleWhere, status: "completed" } }),
    prisma.sale.count({ where: { ...saleWhere, status: "voided" } }),
    prisma.saleReturn.count({
      where: {
        sale: saleWhere,
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return NextResponse.json(
    {
      items: sales.map((s) => ({
        ...s,
        subtotal: s.subtotal.toString(),
        discount: s.discount.toString(),
        total: s.total.toString(),
        amountPaid: s.amountPaid.toString(),
        change: s.change.toString(),
        servedByName: null,
        createdAt: s.createdAt.toISOString(),
        items: s.items.map((i) => ({
          ...i,
          unitPrice: i.unitPrice.toString(),
          total: i.total.toString(),
        })),
        returns: s.returns.map((r) => ({
          ...r,
          refundAmount: r.refundAmount?.toString() ?? null,
          approvedAt: r.approvedAt?.toISOString() ?? null,
          refundedAt: r.refundedAt?.toISOString() ?? null,
          createdAt: r.createdAt.toISOString(),
          items: r.items,
        })),
      })),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
      },
      summary: {
        totalRevenue: Number(totalRevenueAgg._sum.total ?? 0),
        todayRevenue: Number(todayRevenueAgg._sum.total ?? 0),
        todayCount,
        completedCount,
        voidedCount,
        filteredCount: totalItems,
        filteredReturns,
      },
    }
  );
}

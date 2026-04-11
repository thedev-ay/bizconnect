import { NextResponse } from "next/server";
import { prisma } from "@bizconnect/db";
import { authorize } from "@/lib/authorize";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant: tenantSlug } = await params;
  const session = await authorize(tenantSlug);

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

  const sales = await prisma.sale.findMany({
    where: { tenantId: tenant.id, source: { in: enabledSources } },
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
  });

  return NextResponse.json(
    sales.map((s) => ({
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
    }))
  );
}

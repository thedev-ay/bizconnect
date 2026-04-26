import { NextResponse } from "next/server";
import { prisma } from "@bizconnect/db";
import { authorize } from "@/lib/authorize";
import type { NotificationItem } from "@/components/layout/notification-bell";

export async function GET(_req: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantSlug } = await params;
  const session = await authorize(tenantSlug);
  const tenantId = session.user.tenantId;
  const moduleSet = new Set(session.user.modules as string[]);

  const cancelledSlug = moduleSet.has("job-orders")
    ? await prisma.workflowStage
        .findFirst({ where: { tenantId, type: "cancelled" }, select: { slug: true } })
        .then((s) => s?.slug ?? null)
    : null;

  const [overdueJobs, pendingLeave, lowStock, pendingReturns] = await Promise.all([
    moduleSet.has("job-orders")
      ? prisma.jobOrder.count({
          where: {
            tenantId,
            completedAt: null,
            dueDate: { lt: new Date() },
            ...(cancelledSlug ? { status: { not: cancelledSlug } } : {}),
          },
        })
      : null,
    moduleSet.has("hr")
      ? prisma.leaveRequest.count({ where: { tenantId, status: "pending" } })
      : null,
    moduleSet.has("inventory")
      ? prisma.$queryRaw<{ count: bigint }[]>`
          SELECT COUNT(*)::int as count FROM inventory_items
          WHERE tenant_id = ${tenantId} AND quantity <= reorder_at
        `.then((r) => Number(r[0]?.count ?? 0))
      : null,
    moduleSet.has("pos")
      ? prisma.saleReturn.count({ where: { tenantId, status: "pending" } })
      : null,
  ]);

  const items: NotificationItem[] = [
    overdueJobs != null && overdueJobs > 0
      ? { label: "Overdue job orders", count: overdueJobs, href: `/${tenantSlug}/job-orders` }
      : null,
    pendingLeave != null && pendingLeave > 0
      ? { label: "Pending leave requests", count: pendingLeave, href: `/${tenantSlug}/hr` }
      : null,
    lowStock != null && lowStock > 0
      ? { label: "Low stock items", count: lowStock, href: `/${tenantSlug}/inventory` }
      : null,
    pendingReturns != null && pendingReturns > 0
      ? { label: "Pending returns", count: pendingReturns, href: `/${tenantSlug}/sales` }
      : null,
  ].filter((item): item is NotificationItem => item !== null);

  return NextResponse.json({ items });
}

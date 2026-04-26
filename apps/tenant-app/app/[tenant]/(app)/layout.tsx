import { getTenant } from "@/lib/tenant";
import { authorize } from "@/lib/authorize";
import { getBranches } from "@/modules/branches/actions";
import { OfflineBanner } from "@/components/layout/offline-banner";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/layout/app-shell";
import { NotificationBell, type NotificationItem } from "@/components/layout/notification-bell";
import { prisma } from "@bizconnect/db";

interface TenantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}

async function getNotifications(tenantId: string, modules: string[], tenantSlug: string): Promise<NotificationItem[]> {
  const moduleSet = new Set(modules);

  const cancelledSlug = moduleSet.has("job-orders")
    ? await prisma.workflowStage.findFirst({ where: { tenantId, type: "cancelled" }, select: { slug: true } })
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

  return [
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
}

export async function generateMetadata({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const tenant = await getTenant(slug);
  return { title: `${tenant.name} — BizConnect` };
}

export default async function TenantLayout({ children, params }: TenantLayoutProps) {
  const { tenant: slug } = await params;
  const [tenant, session, branches] = await Promise.all([
    getTenant(slug),
    authorize(slug),
    getBranches(slug),
  ]);
  const currentBranchId = session.user.currentBranchId ?? null;
  const notifications = await getNotifications(
    tenant.id,
    session.user.modules as string[],
    slug
  );

  return (
    <Providers>
      <OfflineBanner />
      <AppShell
        tenant={tenant}
        modules={session.user.moduleObjects}
        branches={branches}
        currentBranchId={currentBranchId}
        notificationSlot={<NotificationBell items={notifications} tenantSlug={slug} />}
      >
        {children}
      </AppShell>
    </Providers>
  );
}

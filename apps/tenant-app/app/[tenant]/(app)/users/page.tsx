import { prisma } from "@bizconnect/db";
import { getTenant } from "@/lib/tenant";
import { authorize } from "@/lib/authorize";
import { ContentPanel, PageHeader, PageShell } from "@/components/layout/page-shell";
import { UserTable, CreateUserDialog } from "@/modules/users";

interface UsersPageProps {
  params: Promise<{ tenant: string }>;
}

async function getUsers(tenantId: string) {
  return prisma.user.findMany({
    where: { tenantId, isSuperAdmin: false },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      permissions: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export default async function UsersPage({ params }: UsersPageProps) {
  const { tenant: tenantSlug } = await params;
  const [tenant, session] = await Promise.all([
    getTenant(tenantSlug),
    authorize(tenantSlug),
  ]);
  const users = await getUsers(tenant.id);

  const activeModuleSlugs = session.user.modules;
  const canManage = session.user.role === "owner" || session.user.role === "admin";

  return (
    <PageShell className="h-auto min-h-full">
      <PageHeader
        eyebrow="Users"
        title="Workspace"
        description={`${users.length} members`}
        action={
          canManage ? (
            <CreateUserDialog
              tenantSlug={tenantSlug}
              tenantId={tenant.id}
              activeModuleSlugs={activeModuleSlugs}
            />
          ) : undefined
        }
      />

      <ContentPanel className="p-0">
        <section className="py-4">
          <UserTable
            users={users.map((u) => ({ ...u, permissions: (u.permissions as Record<string, boolean>) ?? {} }))}
            tenantSlug={tenantSlug}
            tenantId={tenant.id}
            currentUserId={session?.user?.id ?? ""}
            activeModuleSlugs={activeModuleSlugs}
          />
        </section>
      </ContentPanel>
    </PageShell>
  );
}

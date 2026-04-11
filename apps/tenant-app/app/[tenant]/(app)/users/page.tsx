import { prisma } from "@bizconnect/db";
import { getTenant } from "@/lib/tenant";
import { authorize } from "@/lib/authorize";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Users</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{users.length} members in this workspace</p>
        </div>
        {canManage && (
          <CreateUserDialog
            tenantSlug={tenantSlug}
            tenantId={tenant.id}
            activeModuleSlugs={activeModuleSlugs}
          />
        )}
      </div>

      <Card className="shadow-none border-zinc-200">
        <CardContent className="p-0">
          <UserTable
            users={users.map((u) => ({ ...u, permissions: (u.permissions as Record<string, boolean>) ?? {} }))}
            tenantSlug={tenantSlug}
            tenantId={tenant.id}
            currentUserId={session?.user?.id ?? ""}
            activeModuleSlugs={activeModuleSlugs}
          />
        </CardContent>
      </Card>
    </div>
  );
}

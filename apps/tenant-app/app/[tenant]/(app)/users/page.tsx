import { prisma } from "@bizconnect/db";
import { auth } from "@/lib/auth";
import { getTenant } from "@/lib/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export default async function UsersPage({ params }: UsersPageProps) {
  const { tenant: tenantSlug } = await params;
  const [tenant, session] = await Promise.all([getTenant(tenantSlug), auth()]);
  const users = await getUsers(tenant.id);

  const canManage = session?.user?.role === "owner" || session?.user?.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">{users.length} members in this workspace</p>
        </div>
        {canManage && <CreateUserDialog tenantSlug={tenantSlug} tenantId={tenant.id} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Members</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <UserTable
            users={users}
            tenantSlug={tenantSlug}
            tenantId={tenant.id}
            currentUserId={session?.user?.id ?? ""}
          />
        </CardContent>
      </Card>
    </div>
  );
}

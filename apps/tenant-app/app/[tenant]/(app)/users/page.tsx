import { prisma } from "@bizconnect/db";
import Link from "next/link";
import { getTenant } from "@/lib/tenant";
import { authorize } from "@/lib/authorize";
import { ContentPanel, PageHeader, PageShell } from "@/components/layout/page-shell";
import { cn } from "@/lib/utils";
import {
  UserTable,
  CreateUserDialog,
  CreateUserGroupDialogTrigger,
  UserGroupsMatrix,
} from "@/modules/users";

interface UsersPageProps {
  params: Promise<{ tenant: string }>;
  searchParams?: Promise<{ tab?: string }>;
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
      userGroupId: true,
      userGroup: { select: { name: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

async function getUserGroups(tenantId: string) {
  return prisma.userGroup.findMany({
    where: { tenantId },
    select: {
      id: true,
      name: true,
      description: true,
      permissions: true,
      createdAt: true,
      _count: { select: { users: true } },
    },
    orderBy: [{ name: "asc" }],
  });
}

export default async function UsersPage({ params, searchParams }: UsersPageProps) {
  const { tenant: tenantSlug } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const [tenant, session] = await Promise.all([getTenant(tenantSlug), authorize(tenantSlug)]);
  const [users, userGroups] = await Promise.all([getUsers(tenant.id), getUserGroups(tenant.id)]);

  const activeModuleSlugs = session.user.modules;
  const canManage = session.user.role === "owner" || session.user.role === "admin";
  const tab = resolvedSearchParams.tab === "groups" ? "groups" : "members";
  const tabs = [
    { key: "members", label: "Users" },
    { key: "groups", label: "User Groups" },
  ] as const;
  const normalizedUserGroups = userGroups.map((group) => ({
    ...group,
    permissions: (group.permissions as Record<string, boolean>) ?? {},
    userCount: group._count.users,
  }));
  const normalizedUsers = users.map((u) => ({
    ...u,
    permissions: (u.permissions as Record<string, boolean>) ?? {},
    userGroupName: u.userGroup?.name ?? null,
  }));

  return (
    <PageShell className="h-auto min-h-full">
      <PageHeader
        eyebrow="Users"
        title="Access Control"
        description={
          tab === "groups"
            ? `${userGroups.length} group${userGroups.length === 1 ? "" : "s"}`
            : `${users.length} member${users.length === 1 ? "" : "s"}`
        }
        action={
          canManage && tab === "members" ? (
            <CreateUserDialog
              tenantSlug={tenantSlug}
              tenantId={tenant.id}
              activeModuleSlugs={activeModuleSlugs}
              userGroups={normalizedUserGroups}
            />
          ) : canManage && tab === "groups" ? (
            <CreateUserGroupDialogTrigger
              tenantSlug={tenantSlug}
              tenantId={tenant.id}
              activeModuleSlugs={activeModuleSlugs}
            />
          ) : undefined
        }
      />

      <ContentPanel className="p-0">
        <div className="flex gap-2 border-b border-slate-200/80 px-4 pt-3">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={`/${tenantSlug}/users?tab=${t.key}`}
              className={cn(
                "rounded-t-2xl border border-transparent px-4 py-2 text-sm font-medium transition-colors",
                tab === t.key
                  ? "border-slate-200/80 border-b-white bg-white text-slate-950 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.35)]"
                  : "text-slate-500 hover:bg-white/70 hover:text-slate-900"
              )}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {tab === "members" && (
          <>
            <section className="py-4">
              <UserTable
                users={normalizedUsers}
                tenantSlug={tenantSlug}
                tenantId={tenant.id}
                currentUserId={session?.user?.id ?? ""}
                activeModuleSlugs={activeModuleSlugs}
                userGroups={normalizedUserGroups}
              />
            </section>
          </>
        )}

        {tab === "groups" && (
          <UserGroupsMatrix
            tenantSlug={tenantSlug}
            tenantId={tenant.id}
            activeModuleSlugs={activeModuleSlugs}
            userGroups={normalizedUserGroups}
            canManage={canManage}
          />
        )}
      </ContentPanel>
    </PageShell>
  );
}

import { prisma } from "@bizconnect/db";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ModuleToggle } from "@/components/tenants/module-toggle";
import { TenantStatusToggle } from "@/components/tenants/tenant-status-toggle";
import { Users, Puzzle, Calendar } from "lucide-react";
import { format } from "date-fns";

interface TenantDetailPageProps {
  params: Promise<{ tenantId: string }>;
}

async function getTenantDetail(tenantId: string) {
  const [tenant, allModules] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        _count: { select: { users: true } },
        tenantModules: { include: { module: true } },
      },
    }),
    prisma.module.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return { tenant, allModules };
}

export default async function TenantDetailPage({ params }: TenantDetailPageProps) {
  const { tenantId } = await params;
  const { tenant, allModules } = await getTenantDetail(tenantId);
  if (!tenant) notFound();

  const tenantModuleMap = new Map(tenant.tenantModules.map((tm) => [tm.moduleId, tm]));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{tenant.name}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{tenant.slug}</code>
            <span>·</span>
            <span className="capitalize">{tenant.plan} plan</span>
            <span>·</span>
            <span>Created {format(new Date(tenant.createdAt), "MMM d, yyyy")}</span>
          </div>
        </div>
        <TenantStatusToggle tenantId={tenant.id} isActive={tenant.isActive} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenant._count.users}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Puzzle className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Modules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tenant.tenantModules.filter((tm) => tm.isEnabled).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={tenant.isActive ? "default" : "secondary"} className="text-sm">
              {tenant.isActive ? "Active" : "Suspended"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module Access</CardTitle>
          <CardDescription>
            Toggle which modules this tenant can access. Changes take effect immediately — no
            deployment required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {allModules.map((module) => {
            const tenantModule = tenantModuleMap.get(module.id);
            const isEnabled = tenantModule?.isEnabled ?? false;

            return (
              <div key={module.id}>
                <ModuleToggle
                  tenantId={tenant.id}
                  moduleId={module.id}
                  moduleName={module.name}
                  moduleDescription={module.description ?? ""}
                  isCore={module.isCore}
                  isEnabled={isEnabled}
                  enabledAt={tenantModule?.enabledAt ?? null}
                />
                <Separator className="mt-4" />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

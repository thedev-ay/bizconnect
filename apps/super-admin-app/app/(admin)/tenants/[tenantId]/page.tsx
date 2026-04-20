import { prisma } from "@bizconnect/db";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EditTenantProfileDialog } from "@/components/tenants/edit-tenant-profile-dialog";
import { ModuleToggle } from "@/components/tenants/module-toggle";
import { TenantStatusToggle } from "@/components/tenants/tenant-status-toggle";
import {
  TENANT_COMPANY_SIZE_LABELS,
  TENANT_INDUSTRY_LABELS,
} from "@/lib/tenant-options";
import { Building2, Calendar, Mail, MapPin, Phone, Puzzle, Tags, Users } from "lucide-react";
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
  const profileItems = [
    {
      label: "Industry",
      value: tenant.industry
        ? TENANT_INDUSTRY_LABELS[tenant.industry as keyof typeof TENANT_INDUSTRY_LABELS] ?? tenant.industry
        : null,
      icon: Building2,
    },
    {
      label: "Company Size",
      value: tenant.companySize
        ? TENANT_COMPANY_SIZE_LABELS[tenant.companySize as keyof typeof TENANT_COMPANY_SIZE_LABELS] ?? tenant.companySize
        : null,
      icon: Users,
    },
    { label: "Address", value: tenant.address, icon: MapPin },
    { label: "Phone", value: tenant.phone, icon: Phone },
    { label: "Email", value: tenant.email, icon: Mail },
    { label: "Website", value: tenant.website, icon: Building2 },
  ];

  return (
    <div className="space-y-6">
      <div className="admin-surface flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="admin-eyebrow">Tenant</p>
          <h1 className="admin-page-title mt-2">{tenant.name}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <code className="rounded-full border border-border/70 bg-muted px-2.5 py-1 text-xs">{tenant.slug}</code>
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
            <CardTitle className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-primary/70">Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-[-0.05em]">{tenant._count.users}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Puzzle className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-primary/70">
              Active Modules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-[-0.05em]">
              {tenant.tenantModules.filter((tm) => tm.isEnabled).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-primary/70">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={tenant.isActive ? "default" : "secondary"} className="text-sm">
              {tenant.isActive ? "Active" : "Suspended"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 border-b border-border/60 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Tenant Profile</CardTitle>
            <CardDescription>Business details captured during provisioning.</CardDescription>
          </div>
          <EditTenantProfileDialog
            tenant={{
              id: tenant.id,
              name: tenant.name,
              country: tenant.country,
              plan: tenant.plan,
              address: tenant.address,
              phone: tenant.phone,
              email: tenant.email,
              website: tenant.website,
              industry: tenant.industry,
              companySize: tenant.companySize,
              tags: tenant.tags,
            }}
          />
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {profileItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-2xl border border-border/70 bg-muted/25 p-3">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </div>
                  <p className="mt-2 break-words text-sm font-medium text-foreground">
                    {item.value || "Not set"}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/25 p-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <Tags className="h-3.5 w-3.5" />
              Tags
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {tenant.tags.length > 0 ? (
                tenant.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No tags</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border/60">
          <CardTitle>Module Access</CardTitle>
          <CardDescription>Enable tenant access.</CardDescription>
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
                <Separator className="mt-4 last:hidden" />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

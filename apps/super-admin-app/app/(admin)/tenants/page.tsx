import { prisma } from "@bizconnect/db";
import { CreateTenantDialog } from "@/components/tenants/create-tenant-dialog";
import { TenantDirectory } from "@/components/tenants/tenant-directory";
import {
  TENANT_COMPANY_SIZE_LABELS,
  TENANT_COUNTRY_LABELS,
  TENANT_INDUSTRY_LABELS,
} from "@/lib/tenant-options";

async function getTenants() {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      country: true,
      plan: true,
      isActive: true,
      industry: true,
      companySize: true,
      email: true,
      phone: true,
      website: true,
      tags: true,
      createdAt: true,
      _count: { select: { users: true, tenantModules: { where: { isEnabled: true } } } },
    },
  });

  return tenants.map((tenant) => ({
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    country: tenant.country,
    countryLabel: TENANT_COUNTRY_LABELS[tenant.country as keyof typeof TENANT_COUNTRY_LABELS] ?? tenant.country.toUpperCase(),
    plan: tenant.plan,
    isActive: tenant.isActive,
    industry: tenant.industry,
    industryLabel: tenant.industry ? TENANT_INDUSTRY_LABELS[tenant.industry as keyof typeof TENANT_INDUSTRY_LABELS] ?? tenant.industry : null,
    companySize: tenant.companySize,
    companySizeLabel: tenant.companySize ? TENANT_COMPANY_SIZE_LABELS[tenant.companySize as keyof typeof TENANT_COMPANY_SIZE_LABELS] ?? tenant.companySize : null,
    email: tenant.email,
    phone: tenant.phone,
    website: tenant.website,
    tags: tenant.tags,
    createdAt: tenant.createdAt.toISOString(),
    userCount: tenant._count.users,
    moduleCount: tenant._count.tenantModules,
  }));
}

export default async function TenantsPage() {
  const tenants = await getTenants();

  return (
    <div className="space-y-5">
      <div className="admin-surface flex flex-col gap-4 px-6 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="admin-eyebrow">Platform</p>
          <h1 className="admin-page-title mt-2">Tenants</h1>
          <p className="mt-2 text-sm text-muted-foreground">Provisioned businesses and access.</p>
        </div>
        <CreateTenantDialog />
      </div>

      <TenantDirectory tenants={tenants} />
    </div>
  );
}

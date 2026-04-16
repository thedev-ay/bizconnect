import { prisma } from "@bizconnect/db";
import { getTenant } from "@/lib/tenant";
import { authorize } from "@/lib/authorize";
import { ContentPanel, PageHeader, PageShell } from "@/components/layout/page-shell";
import { AssetDialog } from "@/modules/assets/components/asset-dialog";
import { AssetsList } from "@/modules/assets/components/assets-list";
import type { Asset } from "@/modules/assets";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

interface AssetsPageProps {
  params: Promise<{ tenant: string }>;
  searchParams?: Promise<{ customerId?: string }>;
}

export default async function AssetsPage({ params, searchParams }: AssetsPageProps) {
  const { tenant: tenantSlug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const initialCustomerId = resolvedSearchParams?.customerId;
  const [tenant] = await Promise.all([
    getTenant(tenantSlug),
    authorize(tenantSlug, "assets.view"),
  ]);

  const [customers, branches, rawAssets] = await Promise.all([
    prisma.customer.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
    }),
    prisma.branch.findMany({
      where: { tenantId: tenant.id, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.asset.findMany({
      where: { tenantId: tenant.id },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        branch: { select: { id: true, name: true } },
        jobOrders: {
          select: {
            id: true,
            jobNo: true,
            status: true,
            customerName: true,
            createdAt: true,
            completedAt: true,
            invoice: { select: { id: true, status: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    }),
  ]);

  const assets: Asset[] = rawAssets.map((asset: any) => ({
    id: asset.id,
    tenantId: asset.tenantId,
    branchId: asset.branchId ?? null,
    customerId: asset.customerId,
    name: asset.name,
    assetType: asset.assetType,
    brand: asset.brand ?? null,
    model: asset.model ?? null,
    identifier: asset.identifier ?? null,
    serialNo: asset.serialNo ?? null,
    status: asset.status,
    notes: asset.notes ?? null,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
    customer: asset.customer,
    branch: asset.branch ?? null,
    openJobCount: asset.jobOrders.filter((job: any) => !job.completedAt).length,
    invoiceCount: asset.jobOrders.filter((job: any) => job.invoice?.id).length,
    recentJobOrders: asset.jobOrders.map((job: any) => ({
      id: job.id,
      jobNo: job.jobNo,
      status: job.status,
      customerName: job.customerName,
      createdAt: job.createdAt,
      invoiceId: job.invoice?.id ?? null,
      invoiceStatus: job.invoice?.status ?? null,
    })),
  }));

  return (
    <PageShell className="h-auto min-h-full">
      <PageHeader
        eyebrow="Assets"
        title="Customer Assets"
        description={`${assets.length} tracked`}
        action={
          <AssetDialog
            tenantSlug={tenantSlug}
            tenantId={tenant.id}
            customers={customers}
            branches={branches}
            initialCustomerId={initialCustomerId}
          />
        }
      />
      <ContentPanel className="p-4 sm:p-5">
        <AssetsList
          tenantSlug={tenantSlug}
          tenantId={tenant.id}
          assets={assets}
          customers={customers}
          branches={branches}
          initialCustomerId={initialCustomerId}
        />
      </ContentPanel>
    </PageShell>
  );
}

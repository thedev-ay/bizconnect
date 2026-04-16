"use client";

import { useQuery } from "@tanstack/react-query";
import { JobOrderBoard, CreateJobOrderDialog, WorkflowStageEditor } from "@/modules/job-orders";
import type { JobOrder, WorkflowStage } from "../types";
import { db } from "@/lib/local-db";
import { ContentPanel, PageHeader, PageShell } from "@/components/layout/page-shell";
import { DataSurfaceLoading } from "@/components/ui/data-surface-loading";

interface JobOrdersViewProps {
  tenantSlug: string;
  tenantId: string;
  tenantName: string;
  currencySymbol: string;
  currencyLocale: string;
  billingEnabled: boolean;
  initialCustomerId?: string;
}

interface JobOrdersData {
  crmEnabled: boolean;
  assetsEnabled: boolean;
  jobOrders: JobOrder[];
  stages: WorkflowStage[];
  services: { id: string; name: string; pricingType: "per_piece" | "per_kilo" | "flat"; price: number; category: string | null }[];
  customers: { id: string; name: string; phone: string | null }[];
  assets: { id: string; customerId: string; name: string; assetType: string; identifier: string | null; brand: string | null; model: string | null; status: string }[];
  employees: { id: string; name: string }[];
}

export function JobOrdersView({
  tenantSlug,
  tenantId,
  tenantName,
  currencySymbol,
  currencyLocale,
  billingEnabled,
  initialCustomerId,
}: JobOrdersViewProps) {
  const { data, isPending } = useQuery<JobOrdersData>({
    queryKey: ["job-orders", tenantSlug],
    queryFn: async () => {
      const cacheKey = `job-orders:${tenantSlug}`;
      const cached = await db.jobOrdersSnapshots.get(cacheKey);

      let r: Response;
      try {
        r = await fetch(`/api/${tenantSlug}/job-orders`);
      } catch {
        if (cached) return JSON.parse(cached.data) as JobOrdersData;
        throw new Error("You're offline and no cached data is available.");
      }
      if (!r.ok) {
        if (cached) return JSON.parse(cached.data) as JobOrdersData;
        throw new Error(r.statusText);
      }

      const fresh: JobOrdersData = await r.json();
      await db.jobOrdersSnapshots.put({ key: cacheKey, tenantId, data: JSON.stringify(fresh), savedAt: Date.now() });
      return fresh;
    },
  });

  const jobOrders = data?.jobOrders ?? [];
  const stages = data?.stages ?? [];
  const services = data?.services ?? [];
  const customers = data?.customers ?? [];
  const crmEnabled = data?.crmEnabled ?? false;
  const assetsEnabled = data?.assetsEnabled ?? false;
  const assets = data?.assets ?? [];
  const employees = data?.employees ?? [];

  const activeStages = stages.filter((s) => s.type === "active");
  const firstActiveSlug = activeStages[0]?.slug;

  const activeOrders = jobOrders.filter((j) => activeStages.some((s) => s.slug === j.status));

  return (
    <PageShell className="h-auto min-h-full">
      <PageHeader
        eyebrow="Workflow"
        title="Job Orders"
        description={isPending ? "Loading" : `${activeOrders.length} active`}
        action={
          <div className="flex items-center gap-2">
            <WorkflowStageEditor
              tenantSlug={tenantSlug}
              tenantId={tenantId}
              stages={stages}
              stageCounts={Object.fromEntries(stages.map((s) => [s.slug, jobOrders.filter((j) => j.status === s.slug).length]))}
            />
            <CreateJobOrderDialog
              tenantSlug={tenantSlug}
              tenantId={tenantId}
              services={services}
              crmEnabled={crmEnabled}
              customers={customers}
              assetsEnabled={assetsEnabled}
              assets={assets}
              employees={employees}
              currencySymbol={currencySymbol}
              currencyLocale={currencyLocale}
              firstStageSlug={firstActiveSlug ?? "received"}
              initialCustomerId={initialCustomerId}
              disabled={activeStages.length === 0}
            />
          </div>
        }
        className="py-4 sm:py-5"
      />

      <ContentPanel className="min-h-0 flex-1 overflow-visible p-3 sm:p-4 lg:overflow-hidden lg:p-5">
        {isPending ? (
          <DataSurfaceLoading label="Loading board" variant="kanban" className="min-h-[420px]" />
        ) : (
          <JobOrderBoard
            jobOrders={jobOrders}
            stages={stages}
            tenantSlug={tenantSlug}
            tenantId={tenantId}
            tenantName={tenantName}
            currencySymbol={currencySymbol}
            currencyLocale={currencyLocale}
            services={services}
            customers={customers}
            assetsEnabled={assetsEnabled}
            assets={assets}
            employees={employees}
            billingEnabled={billingEnabled}
          />
        )}
      </ContentPanel>
    </PageShell>
  );
}

"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { JobOrderBoard, CreateJobOrderDialog, WorkflowStageEditor } from "@/modules/job-orders";
import { StatCards } from "./stat-cards";
import type { JobOrder, WorkflowStage } from "../types";
import { db } from "@/lib/local-db";

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
  jobOrders: JobOrder[];
  stages: WorkflowStage[];
  services: { id: string; name: string; pricingType: "per_piece" | "per_kilo" | "flat"; price: number; category: string | null }[];
  customers: { id: string; name: string; phone: string | null }[];
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
  const queryClient = useQueryClient();

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
  const employees = data?.employees ?? [];

  const completedStage = stages.find((s) => s.type === "completed");
  const activeStages = stages.filter((s) => s.type === "active");
  const firstActiveSlug = activeStages[0]?.slug;

  const activeOrders = jobOrders.filter((j) => activeStages.some((s) => s.slug === j.status));
  const completedToday = jobOrders.filter((j) => {
    if (!completedStage || j.status !== completedStage.slug || !j.completedAt) return false;
    const d = new Date(j.completedAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  const today = jobOrders.filter((j) => new Date(j.createdAt).toDateString() === new Date().toDateString());

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["job-orders", tenantSlug] });
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Job Orders</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {isPending ? "Loading..." : `${activeOrders.length} active orders`}
          </p>
        </div>
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
            customers={customers}
            employees={employees}
            currencySymbol={currencySymbol}
            currencyLocale={currencyLocale}
            firstStageSlug={firstActiveSlug ?? "received"}
            initialCustomerId={initialCustomerId}
            disabled={activeStages.length === 0}
          />
        </div>
      </div>

      <StatCards
        active={activeOrders.length}
        completedToday={completedToday.length}
        receivedToday={today.length}
      />

      <div className="min-h-0 flex-1">
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
          employees={employees}
          billingEnabled={billingEnabled}
        />
      </div>
    </div>
  );
}

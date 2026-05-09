"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { SalesList } from "./sales-list";
import type { LocalSale } from "@/lib/local-db";
import { useTopbarPage } from "@/components/layout/topbar-cta-context";
import { ContentPanel, PageShell } from "@/components/layout/page-shell";
import { DataSurfaceLoading } from "@/components/ui/data-surface-loading";

interface SalesViewProps {
  tenantSlug: string;
  tenantId: string;
  tenantName: string;
  currencySymbol: string;
  currencyLocale: string;
  highlightedSaleId?: string;
}

interface SalesResponse {
  items: LocalSale[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  summary: {
    totalRevenue: number;
    todayRevenue: number;
    todayCount: number;
    completedCount: number;
    voidedCount: number;
    filteredCount: number;
    filteredReturns: number;
  };
}

export function SalesView({
  tenantSlug,
  tenantId,
  tenantName,
  currencySymbol,
  currencyLocale,
  highlightedSaleId,
}: SalesViewProps) {
  const searchParams = useSearchParams();
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const search = searchParams.get("search") ?? "";
  const payment = searchParams.get("payment") ?? "all";
  const status = searchParams.get("status") ?? "all";
  const source = searchParams.get("source") ?? "all";

  const { data, isPending } = useQuery<SalesResponse>({
    queryKey: ["sales", tenantSlug, page, search, payment, status, source],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", "25");
      if (search) params.set("search", search);
      if (payment !== "all") params.set("payment", payment);
      if (status !== "all") params.set("status", status);
      if (source !== "all") params.set("source", source);

      const r = await fetch(`/api/${tenantSlug}/sales?${params.toString()}`);
      if (!r.ok) {
        throw new Error(r.statusText);
      }
      return r.json();
    },
  });

  const sales = data?.items ?? [];
  const pagination = data?.pagination ?? {
    page: 1,
    pageSize: 25,
    totalItems: 0,
    totalPages: 1,
  };
  const summary = data?.summary ?? {
    totalRevenue: 0,
    todayRevenue: 0,
    todayCount: 0,
    completedCount: 0,
    voidedCount: 0,
    filteredCount: 0,
    filteredReturns: 0,
  };

  useTopbarPage({
    title: "Sales History",
    description: isPending ? "Loading transactions." : `${pagination.totalItems} transactions`,
  });

  return (
    <PageShell className="h-auto min-h-full gap-5">
      <ContentPanel className="overflow-hidden p-0">
        {isPending ? (
          <div className="p-4 sm:p-5">
            <DataSurfaceLoading label="Loading transactions" variant="table" rows={6} className="min-h-[420px]" />
          </div>
        ) : (
          <SalesList
            sales={sales}
            tenantSlug={tenantSlug}
            tenantId={tenantId}
            tenantName={tenantName}
            currencySymbol={currencySymbol}
            currencyLocale={currencyLocale}
            highlightedSaleId={highlightedSaleId}
            pagination={pagination}
            summary={summary}
          />
        )}
      </ContentPanel>
    </PageShell>
  );
}

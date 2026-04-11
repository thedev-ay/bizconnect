"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingBag, TrendingUp, XCircle, Banknote } from "lucide-react";
import { SalesList } from "./sales-list";
import { db } from "@/lib/local-db";
import type { LocalSale } from "@/lib/local-db";

interface SalesViewProps {
  tenantSlug: string;
  tenantId: string;
  tenantName: string;
  currencySymbol: string;
  currencyLocale: string;
  highlightedSaleId?: string;
}

export function SalesView({
  tenantSlug,
  tenantId,
  tenantName,
  currencySymbol,
  currencyLocale,
  highlightedSaleId,
}: SalesViewProps) {
  const { data: sales = [], isPending } = useQuery<LocalSale[]>({
    queryKey: ["sales", tenantSlug],
    queryFn: async () => {
      const cached = await db.sales.where("tenantId").equals(tenantId).toArray();

      let r: Response;
      try {
        r = await fetch(`/api/${tenantSlug}/sales`);
      } catch {
        if (cached.length > 0) return cached;
        throw new Error("You're offline and no cached data is available.");
      }
      if (!r.ok) {
        if (cached.length > 0) return cached;
        throw new Error(r.statusText);
      }

      const fresh: LocalSale[] = await r.json();

      await db.transaction("rw", db.sales, db.syncMeta, async () => {
        await db.sales.where("tenantId").equals(tenantId).delete();
        await db.sales.bulkPut(fresh.map((s) => ({ ...s, tenantId })));
        await db.syncMeta.put({ key: `sales:${tenantSlug}`, syncedAt: Date.now() });
      });

      return fresh;
    },
  });

  const fmt = (v: number) =>
    `${currencySymbol}${v.toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}`;

  const completed = sales.filter((s) => s.status === "completed");
  const voided = sales.filter((s) => s.status === "voided");
  const totalRevenue = completed.reduce((sum, s) => sum + Number(s.total), 0);
  const todaySales = completed.filter(
    (s) => new Date(s.createdAt).toDateString() === new Date().toDateString()
  );
  const todayRevenue = todaySales.reduce((sum, s) => sum + Number(s.total), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Sales History</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {isPending ? "Loading..." : `${sales.length} total transactions`}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="shadow-none border-zinc-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">Total Revenue</p>
                <p className="mt-1.5 text-2xl font-bold text-zinc-900">{fmt(totalRevenue)}</p>
                <p className="mt-0.5 text-xs text-zinc-400">all time</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border-zinc-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">Today's Revenue</p>
                <p className="mt-1.5 text-2xl font-bold text-zinc-900">{fmt(todayRevenue)}</p>
                <p className="mt-0.5 text-xs text-zinc-400">{todaySales.length} transactions</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <Banknote className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border-zinc-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">Completed</p>
                <p className="mt-1.5 text-2xl font-bold text-zinc-900">{completed.length}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100">
                <ShoppingBag className="h-4 w-4 text-zinc-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border-zinc-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">Voided</p>
                <p className="mt-1.5 text-2xl font-bold text-zinc-400">{voided.length}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100">
                <XCircle className="h-4 w-4 text-zinc-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none border-zinc-200">
        <SalesList
          sales={sales}
          tenantSlug={tenantSlug}
          tenantId={tenantId}
          tenantName={tenantName}
          currencySymbol={currencySymbol}
          currencyLocale={currencyLocale}
          highlightedSaleId={highlightedSaleId}
        />
      </Card>
    </div>
  );
}

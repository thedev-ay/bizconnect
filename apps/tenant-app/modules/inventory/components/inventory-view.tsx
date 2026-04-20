"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock3 } from "lucide-react";
import { InventoryList } from "./inventory-list";
import { LowStockPanel } from "./low-stock-panel";
import { RecentActivityPanel } from "./recent-activity-panel";
import { AddItemDialog } from "./add-item-dialog";
import type { InventoryItem } from "../types";
import { db } from "@/lib/local-db";
import { ContentPanel, PageHeader, PageShell } from "@/components/layout/page-shell";
import { DashboardStatCards, type DashboardStatCardData } from "@/components/dashboard/stat-cards";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DataSurfaceLoading } from "@/components/ui/data-surface-loading";

interface InventoryViewProps {
  tenantSlug: string;
  tenantId: string;
  currencySymbol: string;
  currencyLocale: string;
}

interface InventoryData {
  items: InventoryItem[];
  recentAdjustments: {
    id: string;
    itemId: string;
    quantityChange: number;
    reason: string;
    notes: string | null;
    createdAt: string;
    item: { name: string };
  }[];
}

export function InventoryView({ tenantSlug, tenantId, currencySymbol, currencyLocale }: InventoryViewProps) {
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const { data, isPending } = useQuery<InventoryData>({
    queryKey: ["inventory", tenantSlug],
    queryFn: async () => {
      // 1. Serve from IndexedDB instantly if cached
      const cached = await db.inventoryItems.where("tenantId").equals(tenantId).toArray();
      const cachedAdj = await db.inventoryAdjustments.where("tenantId").equals(tenantId).toArray();

      // 2. Fetch fresh data from API
      let r: Response;
      try {
        r = await fetch(`/api/${tenantSlug}/inventory`);
      } catch {
        if (cached.length > 0) {
          return {
            items: cached as unknown as InventoryItem[],
            recentAdjustments: cachedAdj.map((a) => ({ ...a, item: { name: a.itemName } })),
          };
        }
        throw new Error("You're offline and no cached data is available.");
      }
      if (!r.ok) {
        if (cached.length > 0) {
          return {
            items: cached as unknown as InventoryItem[],
            recentAdjustments: cachedAdj.map((a) => ({ ...a, item: { name: a.itemName } })),
          };
        }
        throw new Error(r.statusText);
      }

      const fresh: InventoryData = await r.json();

      // 3. Write fresh data into IndexedDB
      await db.transaction("rw", db.inventoryItems, db.inventoryAdjustments, db.syncMeta, async () => {
        await db.inventoryItems.where("tenantId").equals(tenantId).delete();
        await db.inventoryItems.bulkPut(
          fresh.items.map((i) => ({ ...i, tenantId }))
        );
        await db.inventoryAdjustments.where("tenantId").equals(tenantId).delete();
        await db.inventoryAdjustments.bulkPut(
          fresh.recentAdjustments.map((a) => ({
            id: a.id,
            tenantId,
            itemId: a.itemId,
            quantityChange: a.quantityChange,
            reason: a.reason,
            notes: a.notes,
            createdAt: a.createdAt,
            itemName: a.item.name,
          }))
        );
        await db.syncMeta.put({ key: `inventory:${tenantSlug}`, syncedAt: Date.now() });
      });

      return fresh;
    },
  });

  const items = data?.items ?? [];
  const recentAdjustments = data?.recentAdjustments ?? [];
  const lowStock = items.filter((i) => i.quantity <= i.reorderAt);
  const lowStockCount = lowStock.length;
  const totalValue = items.reduce((sum, i) => sum + Number(i.unitCost) * i.quantity, 0);
  const retailValue = items.reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0);
  const stats: DashboardStatCardData[] = [
    {
      label: "Items",
      rawValue: items.length,
      iconKey: "Package",
      href: `/${tenantSlug}/inventory`,
      color: "blue",
    },
    {
      label: "Cost value",
      rawValue: totalValue,
      isCurrency: true,
      currencySymbol,
      currencyLocale,
      sub: "At cost",
      iconKey: "ReceiptText",
      href: `/${tenantSlug}/inventory`,
      color: "green",
    },
    {
      label: "Retail",
      rawValue: retailValue,
      isCurrency: true,
      currencySymbol,
      currencyLocale,
      sub: "At price",
      iconKey: "ShoppingCart",
      href: `/${tenantSlug}/inventory`,
      color: "violet",
    },
    {
      label: "Low stock",
      rawValue: lowStockCount,
      sub: lowStockCount > 0 ? "Restock" : "Stable",
      iconKey: "ClipboardList",
      href: `/${tenantSlug}/inventory`,
      color: lowStockCount > 0 ? "amber" : "zinc",
      alert: lowStockCount > 0,
    },
  ];

  return (
    <PageShell className="h-auto min-h-full">
      <PageHeader
        eyebrow="Stock"
        title="Inventory"
        description={isPending ? "Loading" : `${items.length} tracked`}
        action={<AddItemDialog tenantSlug={tenantSlug} tenantId={tenantId} currencySymbol={currencySymbol} />}
        className="py-4 sm:py-5"
      />

      <DashboardStatCards cards={stats} mobileCols={2} />

      {lowStockCount > 0 && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-amber-200/70 bg-amber-50/85 px-4 py-3 text-sm text-amber-900 shadow-[0_12px_32px_-24px_rgba(217,119,6,0.4)]">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            {lowStockCount} low
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:hidden">
        <Button
          className="justify-start rounded-full px-4"
          onClick={() => setWatchlistOpen(true)}
        >
          <AlertTriangle className="mr-2 h-4 w-4" />
          Low Stocks
        </Button>
        <Button
          className="justify-start rounded-full px-4"
          onClick={() => setActivityOpen(true)}
        >
          <Clock3 className="mr-2 h-4 w-4" />
          Recent Activity
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.85fr)]">
        <ContentPanel className="overflow-hidden p-0">
          {isPending ? (
            <div className="p-4 sm:p-5">
              <DataSurfaceLoading label="Loading inventory" variant="table" rows={6} className="min-h-[420px]" />
            </div>
          ) : (
            <InventoryList
              items={items}
              tenantSlug={tenantSlug}
              tenantId={tenantId}
              currencySymbol={currencySymbol}
              currencyLocale={currencyLocale}
            />
          )}
        </ContentPanel>

        <div className="hidden content-start gap-4 sm:grid">
          {isPending ? (
            <>
              <DataSurfaceLoading label="Loading watchlist" variant="panel" rows={3} className="min-h-[220px]" />
              <DataSurfaceLoading label="Loading activity" variant="panel" rows={4} className="min-h-[260px]" />
            </>
          ) : (
            <>
              <LowStockPanel items={lowStock} />
              <RecentActivityPanel adjustments={recentAdjustments} />
            </>
          )}
        </div>
      </div>

      <Sheet open={watchlistOpen} onOpenChange={setWatchlistOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="max-h-[88dvh] overflow-hidden rounded-t-[28px] border-t-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(236,253,250,0.92)_100%)] p-0 sm:hidden"
        >
          <div className="flex justify-center pt-3">
            <span className="h-1.5 w-12 rounded-full bg-foreground/15" />
          </div>
          <SheetHeader className="border-b border-border/60 px-4 py-4">
            <p className="eyebrow-label">Inventory / Watchlist</p>
            <SheetTitle className="mt-1">Low stock</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto p-4">
            <LowStockPanel items={lowStock} embedded />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={activityOpen} onOpenChange={setActivityOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="max-h-[88dvh] overflow-hidden rounded-t-[28px] border-t-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(236,253,250,0.92)_100%)] p-0 sm:hidden"
        >
          <div className="flex justify-center pt-3">
            <span className="h-1.5 w-12 rounded-full bg-foreground/15" />
          </div>
          <SheetHeader className="border-b border-border/60 px-4 py-4">
            <p className="eyebrow-label">Inventory / Activity</p>
            <SheetTitle className="mt-1">Recent activity</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto p-4">
            <RecentActivityPanel adjustments={recentAdjustments} embedded />
          </div>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}

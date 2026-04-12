"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { InventoryList } from "./inventory-list";
import { LowStockPanel } from "./low-stock-panel";
import { RecentActivityPanel } from "./recent-activity-panel";
import { AddItemDialog } from "./add-item-dialog";
import type { InventoryItem } from "../types";
import { db } from "@/lib/local-db";
import { ContentPanel, PageHeader, PageShell } from "@/components/layout/page-shell";
import { DashboardStatCards, type DashboardStatCardData } from "@/components/dashboard/stat-cards";

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
      label: "Retail value",
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

      <DashboardStatCards cards={stats} />

      {lowStockCount > 0 && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-amber-200/70 bg-amber-50/85 px-4 py-3 text-sm text-amber-900 shadow-[0_12px_32px_-24px_rgba(217,119,6,0.4)]">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            {lowStockCount} low
          </span>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.85fr)]">
        <ContentPanel className="overflow-hidden p-0">
          <InventoryList
            items={items}
            tenantSlug={tenantSlug}
            tenantId={tenantId}
            currencySymbol={currencySymbol}
            currencyLocale={currencyLocale}
          />
        </ContentPanel>

        <div className="grid content-start gap-4">
          <LowStockPanel items={lowStock} />
          <RecentActivityPanel adjustments={recentAdjustments} />
        </div>
      </div>
    </PageShell>
  );
}

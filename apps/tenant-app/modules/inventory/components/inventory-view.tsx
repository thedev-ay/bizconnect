"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Package, AlertTriangle, TrendingDown, DollarSign } from "lucide-react";
import { InventoryList } from "./inventory-list";
import { LowStockPanel } from "./low-stock-panel";
import { RecentActivityPanel } from "./recent-activity-panel";
import { AddItemDialog } from "./add-item-dialog";
import type { InventoryItem } from "../types";
import { db } from "@/lib/local-db";

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Inventory</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {isPending ? "Loading..." : `${items.length} items tracked`}
          </p>
        </div>
        <AddItemDialog tenantSlug={tenantSlug} tenantId={tenantId} currencySymbol={currencySymbol} />
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="shadow-none border-zinc-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">Total Items</p>
                <p className="mt-1.5 text-2xl font-bold text-zinc-900">{items.length}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <Package className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border-zinc-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">Inventory Value</p>
                <p className="mt-1.5 text-2xl font-bold text-zinc-900">
                  {currencySymbol}{totalValue.toLocaleString(currencyLocale, { minimumFractionDigits: 0 })}
                </p>
                <p className="mt-0.5 text-xs text-zinc-400">at cost</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border-zinc-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">Low Stock</p>
                <p className={`mt-1.5 text-2xl font-bold ${lowStockCount > 0 ? "text-amber-600" : "text-zinc-900"}`}>
                  {lowStockCount}
                </p>
                {lowStockCount > 0 && (
                  <p className="mt-0.5 text-xs text-amber-600">Needs restocking</p>
                )}
              </div>
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${lowStockCount > 0 ? "bg-amber-50" : "bg-zinc-100"}`}>
                <TrendingDown className={`h-4 w-4 ${lowStockCount > 0 ? "text-amber-600" : "text-zinc-400"}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low stock alert banner */}
      {lowStockCount > 0 && (
        <div className="flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          <span>
            <strong>{lowStockCount}</strong> item{lowStockCount > 1 ? "s are" : " is"} at or below reorder level.
          </span>
        </div>
      )}

      {/* Main content: table + sidebar panels */}
      <div className="grid gap-4 sm:grid-cols-6">
        <Card className="shadow-none border-zinc-200 col-span-4">
          <InventoryList
            items={items}
            tenantSlug={tenantSlug}
            tenantId={tenantId}
            currencySymbol={currencySymbol}
            currencyLocale={currencyLocale}
          />
        </Card>

        <div className="col-span-2 grid sm:grid-rows-2 gap-4 content-start">
          <LowStockPanel items={lowStock} />
          <RecentActivityPanel adjustments={recentAdjustments} />
        </div>
      </div>
    </div>
  );
}

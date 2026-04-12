"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { POSTerminal } from "./pos-terminal";
import type { PromoType } from "@/modules/promotions";
import { db } from "@/lib/local-db";
import { flushPendingSales, getPendingSaleCount } from "@/lib/offline-sale";
import { ContentPanel } from "@/components/layout/page-shell";

interface POSViewProps {
  tenantSlug: string;
  tenantId: string;
  tenantName: string;
  currencySymbol: string;
  currencyLocale: string;
}

interface POSData {
  products: {
    id: string;
    name: string;
    unitPrice: number;
    quantity: number;
    sku: string | null;
    category: string | null;
    promotions: {
      id: string;
      type: PromoType;
      value: number;
      buyQty: number | null;
      getQty: number | null;
      daysOfWeek: number[] | null;
      startTime: string | null;
      endTime: string | null;
    }[];
  }[];
  services: {
    id: string;
    name: string;
    pricingType: "per_piece" | "per_kilo" | "flat";
    price: number;
    category: string | null;
  }[];
  servicesEnabled: boolean;
}

export function POSView({ tenantSlug, tenantId, tenantName, currencySymbol, currencyLocale }: POSViewProps) {
  const queryClient = useQueryClient();
  const [pendingCount, setPendingCount] = useState(0);

  // Auto-flush queue when device comes back online (or if already online on mount)
  useEffect(() => {
    async function flush() {
      const count = await getPendingSaleCount(tenantId);
      setPendingCount(count);
      if (count === 0 || !navigator.onLine) return;

      toast.loading(`Syncing ${count} offline sale${count > 1 ? "s" : ""}...`, { id: "sync" });
      const { succeeded, failed } = await flushPendingSales(tenantSlug, tenantId);

      if (succeeded > 0) {
        queryClient.invalidateQueries({ queryKey: ["pos-products", tenantSlug] });
        queryClient.invalidateQueries({ queryKey: ["inventory", tenantSlug] });
      }

      if (failed === 0) {
        toast.success(`${succeeded} sale${succeeded > 1 ? "s" : ""} synced`, { id: "sync" });
      } else {
        toast.warning(`${succeeded} synced, ${failed} failed — will retry when online again`, { id: "sync" });
      }

      setPendingCount(await getPendingSaleCount(tenantId));
    }

    flush(); // runs on mount — syncs immediately if already online
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, tenantSlug]);

  const { data, isPending } = useQuery<POSData>({
    queryKey: ["pos-products", tenantSlug],
    queryFn: async () => {
      // 1. Serve from IndexedDB instantly if cached
      const cachedProducts = await db.posProducts.where("tenantId").equals(tenantId).toArray();
      const cachedServices = await db.posServices.where("tenantId").equals(tenantId).toArray();

      // 2. Fetch fresh data from API
      let r: Response;
      try {
        r = await fetch(`/api/${tenantSlug}/pos/products`);
      } catch {
        if (cachedProducts.length > 0) {
          return { products: cachedProducts, services: cachedServices, servicesEnabled: cachedServices.length > 0 } as POSData;
        }
        throw new Error("You're offline and no cached data is available.");
      }
      if (!r.ok) {
        if (cachedProducts.length > 0) {
          return { products: cachedProducts, services: cachedServices, servicesEnabled: cachedServices.length > 0 } as POSData;
        }
        throw new Error(r.statusText);
      }

      const fresh: POSData = await r.json();

      // 3. Write fresh data into IndexedDB
      await db.transaction("rw", db.posProducts, db.posServices, db.syncMeta, async () => {
        await db.posProducts.where("tenantId").equals(tenantId).delete();
        await db.posProducts.bulkPut(fresh.products.map((p) => ({ ...p, tenantId })));
        await db.posServices.where("tenantId").equals(tenantId).delete();
        await db.posServices.bulkPut(fresh.services.map((s) => ({ ...s, tenantId })));
        await db.syncMeta.put({ key: `pos-products:${tenantSlug}`, syncedAt: Date.now() });
      });

      return fresh;
    },
  });

  const products = data?.products ?? [];
  const services = data?.services ?? [];
  const servicesEnabled = data?.servicesEnabled ?? false;

  if (isPending) {
    return (
      <ContentPanel className="flex h-full items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Loading products...</p>
      </ContentPanel>
    );
  }

  return (
    <div className="flex h-full flex-col gap-2">
      {pendingCount > 0 && (
        <div className="app-panel-subtle flex items-center gap-2 rounded-2xl border-amber-200/70 bg-amber-50/90 px-4 py-3 text-sm text-amber-900">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          {pendingCount} sale{pendingCount > 1 ? "s" : ""} saved offline — will sync when back online
        </div>
      )}
      <ContentPanel className="min-h-0 flex-1 overflow-hidden p-2 sm:p-3">
        <POSTerminal
          products={products}
          services={services}
          servicesEnabled={servicesEnabled}
          tenantSlug={tenantSlug}
          tenantId={tenantId}
          tenantName={tenantName}
          currencySymbol={currencySymbol}
          currencyLocale={currencyLocale}
        />
      </ContentPanel>
    </div>
  );
}

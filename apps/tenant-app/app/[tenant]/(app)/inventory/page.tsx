import { prisma } from "@bizconnect/db";
import { getTenant } from "@/lib/tenant";
import { Card, CardContent } from "@/components/ui/card";
import { InventoryList, AddItemDialog } from "@/modules/inventory";
import { LowStockPanel } from "@/modules/inventory/components/low-stock-panel";
import { RecentActivityPanel } from "@/modules/inventory/components/recent-activity-panel";
import { Package, AlertTriangle, TrendingDown, DollarSign } from "lucide-react";

interface InventoryPageProps {
  params: Promise<{ tenant: string }>;
}

async function getInventoryData(tenantId: string) {
  const [items, recentAdjustments] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { tenantId },
      include: { category: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.inventoryAdjustment.findMany({
      where: { tenantId },
      select: {
        id: true,
        itemId: true,
        quantityChange: true,
        reason: true,
        notes: true,
        createdAt: true,
        item: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  const lowStock = items.filter((i) => i.quantity <= i.reorderAt);
  const totalValue = items.reduce((sum, i) => sum + Number(i.unitCost) * i.quantity, 0);
  return { items, lowStock, lowStockCount: lowStock.length, totalValue, recentAdjustments };
}

export default async function InventoryPage({ params }: InventoryPageProps) {
  const { tenant: tenantSlug } = await params;
  const tenant = await getTenant(tenantSlug);
  const { items, lowStock, lowStockCount, totalValue, recentAdjustments } = await getInventoryData(tenant.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Inventory</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{items.length} items tracked</p>
        </div>
        <AddItemDialog tenantSlug={tenantSlug} tenantId={tenant.id} currencySymbol={tenant.currencySymbol} />
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
                  {tenant.currencySymbol}{totalValue.toLocaleString(tenant.currencyLocale, { minimumFractionDigits: 0 })}
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
            items={items.map((i) => ({
              ...i,
              unitCost: i.unitCost.toString(),
              unitPrice: i.unitPrice.toString(),
            }))}
            tenantSlug={tenantSlug}
            tenantId={tenant.id}
            currencySymbol={tenant.currencySymbol}
            currencyLocale={tenant.currencyLocale}
          />
        </Card>

        <div className="col-span-2 grid sm:grid-rows-2 gap-4 content-start">
          <LowStockPanel
            items={lowStock.map((i) => ({
              ...i,
              unitCost: i.unitCost.toString(),
              unitPrice: i.unitPrice.toString(),
            }))}
          />
          <RecentActivityPanel adjustments={recentAdjustments} />
        </div>
      </div>
    </div>
  );
}

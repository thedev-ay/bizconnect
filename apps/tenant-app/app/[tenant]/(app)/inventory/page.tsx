import { prisma } from "@bizconnect/db";
import { getTenant } from "@/lib/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InventoryList, AddItemDialog } from "@/modules/inventory";
import { Package, AlertTriangle } from "lucide-react";

interface InventoryPageProps {
  params: Promise<{ tenant: string }>;
}

async function getInventoryData(tenantId: string) {
  const items = await prisma.inventoryItem.findMany({
    where: { tenantId },
    include: { category: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  });
  const lowStock = items.filter((i) => i.quantity <= i.reorderAt);
  return { items, lowStockCount: lowStock.length };
}

export default async function InventoryPage({ params }: InventoryPageProps) {
  const { tenant: tenantSlug } = await params;
  const tenant = await getTenant(tenantSlug);
  const { items, lowStockCount } = await getInventoryData(tenant.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">
            {items.length} items · {lowStockCount} low stock
          </p>
        </div>
        <AddItemDialog tenantSlug={tenantSlug} tenantId={tenant.id} />
      </div>

      {lowStockCount > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4" />
          <span>
            <strong>{lowStockCount}</strong> item{lowStockCount > 1 ? "s are" : " is"} at or below
            reorder level.
          </span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{lowStockCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Inventory Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₱
              {items
                .reduce((sum, i) => sum + Number(i.unitCost) * i.quantity, 0)
                .toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <InventoryList
            items={items.map((i) => ({
              ...i,
              unitCost: i.unitCost.toString(),
              unitPrice: i.unitPrice.toString(),
            }))}
            tenantSlug={tenantSlug}
            tenantId={tenant.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}

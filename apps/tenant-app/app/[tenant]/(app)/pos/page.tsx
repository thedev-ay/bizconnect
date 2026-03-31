import { prisma } from "@bizconnect/db";
import { getTenant } from "@/lib/tenant";
import { POSTerminal } from "@/modules/pos";

interface POSPageProps {
  params: Promise<{ tenant: string }>;
}

async function getProducts(tenantId: string) {
  return prisma.inventoryItem.findMany({
    where: { tenantId, quantity: { gt: 0 } },
    select: {
      id: true,
      name: true,
      unitPrice: true,
      quantity: true,
      sku: true,
    },
    orderBy: { name: "asc" },
  });
}

export default async function POSPage({ params }: POSPageProps) {
  const { tenant: tenantSlug } = await params;
  const tenant = await getTenant(tenantSlug);
  const products = await getProducts(tenant.id);

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Point of Sale</h1>
        <p className="text-muted-foreground">{products.length} products available</p>
      </div>
      <div className="flex-1 overflow-hidden">
        <POSTerminal
          products={products.map((p) => ({
            ...p,
            unitPrice: Number(p.unitPrice),
          }))}
          tenantSlug={tenantSlug}
          tenantId={tenant.id}
        />
      </div>
    </div>
  );
}

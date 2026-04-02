import { prisma } from "@bizconnect/db";
import { getTenant } from "@/lib/tenant";
import { JobOrderBoard, CreateJobOrderDialog } from "@/modules/job-orders";
import type { JobOrder } from "@/modules/job-orders";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, Waves, CheckCircle, Star } from "lucide-react";

interface JobOrdersPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function JobOrdersPage({ params }: JobOrdersPageProps) {
  const { tenant: tenantSlug } = await params;
  const tenant = await getTenant(tenantSlug);

  const [rawOrders, rawServices] = await Promise.all([
    prisma.jobOrder.findMany({
      where: { tenantId: tenant.id },
      include: {
        items: {
          select: {
            id: true,
            name: true,
            quantity: true,
            weight: true,
            unitPrice: true,
            total: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma as any).serviceCatalog.findMany({
      where: { tenantId: tenant.id, isActive: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
  ]);

  const jobOrders: JobOrder[] = rawOrders.map((jo) => ({
    id: jo.id,
    jobNo: jo.jobNo,
    customerName: jo.customerName,
    contactNo: (jo as any).contactNo ?? null,
    notes: (jo as any).notes ?? null,
    status: jo.status,
    priority: jo.priority,
    assignedTo: jo.assignedTo,
    dueDate: jo.dueDate,
    completedAt: jo.completedAt,
    claimedAt: (jo as any).claimedAt ?? null,
    createdAt: jo.createdAt,
    items: jo.items.map((i) => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity,
      weight: i.weight?.toString() ?? null,
      unitPrice: i.unitPrice.toString(),
      total: i.total.toString(),
    })),
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const services = (rawServices as any[]).map((s) => ({
    id: s.id as string,
    name: s.name as string,
    pricingType: s.pricingType as "per_piece" | "per_kilo" | "flat",
    price: Number(s.price),
    category: s.category as string | null,
  }));

  const active = jobOrders.filter((j) => !["claimed", "cancelled"].includes(j.status));
  const ready = jobOrders.filter((j) => j.status === "ready");
  const claimed = jobOrders.filter((j) => j.status === "claimed");
  const today = jobOrders.filter((j) => {
    const d = new Date(j.createdAt);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
  });

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Job Orders</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{active.length} active orders</p>
        </div>
        <CreateJobOrderDialog
          tenantSlug={tenantSlug}
          tenantId={tenant.id}
          services={services}
          currencySymbol={tenant.currencySymbol}
          currencyLocale={tenant.currencyLocale}
        />
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-4 shrink-0">
        {[
          { label: "Active", value: active.length, icon: Waves, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Ready for Pickup", value: ready.length, icon: Star, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Claimed Today", value: claimed.filter((j) => {
            const d = j.claimedAt ? new Date(j.claimedAt) : null;
            const now = new Date();
            return d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
          }).length, icon: CheckCircle, color: "text-zinc-600", bg: "bg-zinc-100" },
          { label: "Received Today", value: today.length, icon: ClipboardList, color: "text-amber-600", bg: "bg-amber-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="shadow-none border-zinc-200">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-zinc-500">{label}</p>
                  <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
                </div>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Board */}
      <div className="min-h-0 flex-1">
        <JobOrderBoard
          jobOrders={jobOrders}
          tenantSlug={tenantSlug}
          tenantId={tenant.id}
          currencySymbol={tenant.currencySymbol}
          currencyLocale={tenant.currencyLocale}
          services={services}
        />
      </div>
    </div>
  );
}

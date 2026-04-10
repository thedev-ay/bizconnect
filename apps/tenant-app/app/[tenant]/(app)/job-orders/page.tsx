import { prisma } from "@bizconnect/db";
import { getTenant } from "@/lib/tenant";
import { getActiveModules } from "@/lib/module-registry";
import { JobOrderBoard, CreateJobOrderDialog, WorkflowStageEditor } from "@/modules/job-orders";
import { StatCards } from "@/modules/job-orders/components/stat-cards";
import type { JobOrder, WorkflowStage } from "@/modules/job-orders";

interface JobOrdersPageProps {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ customerId?: string }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export default async function JobOrdersPage({ params, searchParams }: JobOrdersPageProps) {
  const { tenant: tenantSlug } = await params;
  const { customerId } = await searchParams;
  const [tenant, activeModules] = await Promise.all([
    getTenant(tenantSlug),
    getActiveModules(tenantSlug),
  ]);
  const billingEnabled = activeModules.some((module) => module.slug === "billing");
  const hrEnabled = activeModules.some((module) => module.slug === "hr");
  const crmEnabled = activeModules.some((module) => module.slug === "crm");

  let rawOrders: any[] = [];
  try {
    rawOrders = await prisma.jobOrder.findMany({
      where: { tenantId: tenant.id },
      select: {
        id: true,
        customerId: true,
        jobNo: true,
        customerName: true,
        contactNo: true,
        notes: true,
        status: true,
        priority: true,
        dueDate: true,
        completedAt: true,
        claimedAt: true,
        createdAt: true,
        invoice: { select: { id: true, status: true } },
        assignments: { select: { employeeId: true, employeeName: true } },
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
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!message.includes("customer_id") && !message.includes("job_order_id")) {
      throw error;
    }

    rawOrders = await prisma.jobOrder.findMany({
      where: { tenantId: tenant.id },
      select: {
        id: true,
        jobNo: true,
        customerName: true,
        contactNo: true,
        notes: true,
        status: true,
        priority: true,
        dueDate: true,
        completedAt: true,
        claimedAt: true,
        createdAt: true,
        assignments: { select: { employeeId: true, employeeName: true } },
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
    });
  }

  const [rawServices, rawStages, rawCustomers, rawEmployees] = await Promise.all([
    db.serviceCatalog.findMany({
      where: { tenantId: tenant.id, isActive: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    db.workflowStage.findMany({
      where: { tenantId: tenant.id },
      orderBy: { sortOrder: "asc" },
    }),
    crmEnabled
      ? prisma.customer.findMany({
          where: { tenantId: tenant.id },
          select: { id: true, name: true, phone: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    hrEnabled
      ? prisma.employee.findMany({
          where: { tenantId: tenant.id, isActive: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const stages: WorkflowStage[] = rawStages.map((s: any) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    sortOrder: s.sortOrder,
    type: s.type as "active" | "completed" | "cancelled",
  }));

  const jobOrders: JobOrder[] = rawOrders.map((jo: any) => ({
    id: jo.id,
    jobNo: jo.jobNo,
    customerId: jo.customerId ?? null,
    customerName: jo.customerName,
    contactNo: jo.contactNo ?? null,
    notes: jo.notes ?? null,
    status: jo.status,
    priority: jo.priority,
    assignedStaff: (jo.assignments ?? []).map((a: any) => ({ employeeId: a.employeeId, name: a.employeeName })),
    dueDate: jo.dueDate,
    completedAt: jo.completedAt,
    claimedAt: jo.claimedAt ?? null,
    createdAt: jo.createdAt,
    invoiceId: jo.invoice?.id ?? null,
    invoiceStatus: jo.invoice?.status ?? null,
    items: jo.items.map((i: any) => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity,
      weight: i.weight?.toString() ?? null,
      unitPrice: i.unitPrice.toString(),
      total: i.total.toString(),
    })),
  }));

  const services = rawServices.map((s: any) => ({
    id: s.id as string,
    name: s.name as string,
    pricingType: s.pricingType as "per_piece" | "per_kilo" | "flat",
    price: Number(s.price),
    category: s.category as string | null,
  }));
  const customers = rawCustomers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
  }));
  const employees = rawEmployees.map((e: any) => ({ id: e.id as string, name: e.name as string }));

  const completedStage = stages.find((s) => s.type === "completed");
  const activeStages = stages.filter((s) => s.type === "active");
  const firstActiveSlug = activeStages[0]?.slug;

  const activeOrders = jobOrders.filter((j) => activeStages.some((s) => s.slug === j.status));
  const completedToday = jobOrders.filter((j) => {
    if (!completedStage || j.status !== completedStage.slug || !j.completedAt) return false;
    const d = new Date(j.completedAt);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  });
  const today = jobOrders.filter((j) => {
    const d = new Date(j.createdAt);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  });


  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Job Orders</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{activeOrders.length} active orders</p>
        </div>
        <div className="flex items-center gap-2">
          <WorkflowStageEditor
            tenantSlug={tenantSlug}
            tenantId={tenant.id}
            stages={stages}
            stageCounts={Object.fromEntries(stages.map((s) => [s.slug, jobOrders.filter((j) => j.status === s.slug).length]))}
          />
          <CreateJobOrderDialog
            tenantSlug={tenantSlug}
            tenantId={tenant.id}
            services={services}
            customers={customers}
            employees={employees}
            currencySymbol={tenant.currencySymbol}
            currencyLocale={tenant.currencyLocale}
            firstStageSlug={firstActiveSlug ?? "received"}
            initialCustomerId={customerId}
            disabled={activeStages.length === 0}
          />
        </div>
      </div>

      {/* Stat cards */}
      <StatCards
        active={activeOrders.length}
        completedToday={completedToday.length}
        receivedToday={today.length}
      />

      {/* Board */}
      <div className="min-h-0 flex-1">
        <JobOrderBoard
          jobOrders={jobOrders}
          stages={stages}
          tenantSlug={tenantSlug}
          tenantId={tenant.id}
          tenantName={tenant.name}
          currencySymbol={tenant.currencySymbol}
          currencyLocale={tenant.currencyLocale}
          services={services}
          customers={customers}
          employees={employees}
          billingEnabled={billingEnabled}
        />
      </div>
    </div>
  );
}

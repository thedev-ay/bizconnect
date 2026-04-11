import { NextResponse } from "next/server";
import { prisma } from "@bizconnect/db";
import { authorize } from "@/lib/authorize";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant: tenantSlug } = await params;
  const session = await authorize(tenantSlug);

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true },
  });
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tenantId = tenant.id;
  const hrEnabled = session.user.modules.includes("hr");
  const crmEnabled = session.user.modules.includes("crm");

  let rawOrders: any[] = [];
  try {
    rawOrders = await prisma.jobOrder.findMany({
      where: { tenantId },
      select: {
        id: true, customerId: true, jobNo: true, customerName: true,
        contactNo: true, notes: true, status: true, priority: true,
        dueDate: true, completedAt: true, claimedAt: true, createdAt: true,
        invoice: { select: { id: true, status: true } },
        assignments: { select: { employeeId: true, employeeName: true } },
        items: { select: { id: true, name: true, quantity: true, weight: true, unitPrice: true, total: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    rawOrders = await prisma.jobOrder.findMany({
      where: { tenantId },
      select: {
        id: true, jobNo: true, customerName: true, contactNo: true,
        notes: true, status: true, priority: true, dueDate: true,
        completedAt: true, claimedAt: true, createdAt: true,
        assignments: { select: { employeeId: true, employeeName: true } },
        items: { select: { id: true, name: true, quantity: true, weight: true, unitPrice: true, total: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  const [rawServices, rawStages, rawCustomers, rawEmployees] = await Promise.all([
    db.serviceCatalog.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    db.workflowStage.findMany({
      where: { tenantId },
      orderBy: { sortOrder: "asc" },
    }),
    crmEnabled
      ? prisma.customer.findMany({
          where: { tenantId },
          select: { id: true, name: true, phone: true },
          orderBy: { name: "asc" },
        })
      : [],
    hrEnabled
      ? prisma.employee.findMany({
          where: { tenantId, isActive: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : [],
  ]);

  return NextResponse.json({
    jobOrders: rawOrders.map((jo: any) => ({
      id: jo.id,
      jobNo: jo.jobNo,
      customerId: jo.customerId ?? null,
      customerName: jo.customerName,
      contactNo: jo.contactNo ?? null,
      notes: jo.notes ?? null,
      status: jo.status,
      priority: jo.priority,
      assignedStaff: (jo.assignments ?? []).map((a: any) => ({ employeeId: a.employeeId, name: a.employeeName })),
      dueDate: jo.dueDate?.toISOString() ?? null,
      completedAt: jo.completedAt?.toISOString() ?? null,
      claimedAt: jo.claimedAt?.toISOString() ?? null,
      createdAt: jo.createdAt.toISOString(),
      invoiceId: jo.invoice?.id ?? null,
      invoiceStatus: jo.invoice?.status ?? null,
      items: jo.items.map((i: any) => ({
        id: i.id, name: i.name, quantity: i.quantity,
        weight: i.weight?.toString() ?? null,
        unitPrice: i.unitPrice.toString(),
        total: i.total.toString(),
      })),
    })),
    stages: rawStages.map((s: any) => ({
      id: s.id, name: s.name, slug: s.slug,
      sortOrder: s.sortOrder, type: s.type,
    })),
    services: rawServices.map((s: any) => ({
      id: s.id, name: s.name,
      pricingType: s.pricingType,
      price: Number(s.price),
      category: s.category ?? null,
    })),
    customers: rawCustomers.map((c: any) => ({ id: c.id, name: c.name, phone: c.phone })),
    employees: rawEmployees.map((e: any) => ({ id: e.id, name: e.name })),
  });
}

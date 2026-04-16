import { NextResponse } from "next/server";
import { prisma } from "@bizconnect/db";
import { authorize } from "@/lib/authorize";
import { getActiveBranchId } from "@/lib/branch";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant: tenantSlug } = await params;

  const [session, branchId] = await Promise.all([
    authorize(tenantSlug),
    getActiveBranchId(),
  ]);

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true },
  });
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tenantId = tenant.id;
  const hrEnabled = session.user.modules.includes("hr");
  const crmEnabled = session.user.modules.includes("crm");
  const assetsEnabled = session.user.modules.includes("assets");
  const branchFilter = branchId ? { branchId } : {};
  const employeeBranchFilter = branchId
    ? { OR: [{ homeBranchId: branchId }, { branchAssignments: { some: { branchId, endDate: null } } }] }
    : {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rawOrders: any[] = [];
  try {
    rawOrders = await db.jobOrder.findMany({
      where: { tenantId, ...branchFilter },
      select: {
        id: true, customerId: true, jobNo: true, customerName: true,
        assetId: true,
        contactNo: true, notes: true, status: true, priority: true,
        dueDate: true, completedAt: true, claimedAt: true, createdAt: true,
        asset: { select: { id: true, name: true, assetType: true, identifier: true, brand: true, model: true } },
        invoice: { select: { id: true, status: true } },
        assignments: { select: { employeeId: true, employeeName: true } },
        items: { select: { id: true, name: true, quantity: true, weight: true, unitPrice: true, total: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    rawOrders = await db.jobOrder.findMany({
      where: { tenantId, ...branchFilter },
      select: {
        id: true, jobNo: true, customerName: true, contactNo: true,
        assetId: true,
        notes: true, status: true, priority: true, dueDate: true,
        completedAt: true, claimedAt: true, createdAt: true,
        asset: { select: { id: true, name: true, assetType: true, identifier: true, brand: true, model: true } },
        assignments: { select: { employeeId: true, employeeName: true } },
        items: { select: { id: true, name: true, quantity: true, weight: true, unitPrice: true, total: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  const [rawServices, rawStages, rawCustomers, rawEmployees, rawAssets] = await Promise.all([
    db.serviceCatalog.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    db.workflowStage.findMany({
      where: { tenantId, ...branchFilter },
      orderBy: { sortOrder: "asc" },
    }),
    crmEnabled
      ? prisma.customer.findMany({
          where: { tenantId, ...branchFilter },
          select: { id: true, name: true, phone: true },
          orderBy: { name: "asc" },
        })
      : [],
    hrEnabled
      ? prisma.employee.findMany({
          where: { tenantId, isActive: true, ...employeeBranchFilter },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : [],
    assetsEnabled
      ? db.asset.findMany({
          where: { tenantId, ...branchFilter, status: { not: "archived" } },
          select: {
            id: true,
            customerId: true,
            name: true,
            assetType: true,
            identifier: true,
            brand: true,
            model: true,
            status: true,
          },
          orderBy: [{ name: "asc" }],
        })
      : [],
  ]);

  return NextResponse.json({
    assetsEnabled,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jobOrders: rawOrders.map((jo: any) => ({
      id: jo.id,
      jobNo: jo.jobNo,
      customerId: jo.customerId ?? null,
      assetId: jo.assetId ?? null,
      customerName: jo.customerName,
      contactNo: jo.contactNo ?? null,
      notes: jo.notes ?? null,
      status: jo.status,
      priority: jo.priority,
      asset: assetsEnabled && jo.asset
        ? {
            id: jo.asset.id,
            name: jo.asset.name,
            assetType: jo.asset.assetType,
            identifier: jo.asset.identifier ?? null,
            brand: jo.asset.brand ?? null,
            model: jo.asset.model ?? null,
          }
        : null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assignedStaff: (jo.assignments ?? []).map((a: any) => ({ employeeId: a.employeeId, name: a.employeeName })),
      dueDate: jo.dueDate?.toISOString() ?? null,
      completedAt: jo.completedAt?.toISOString() ?? null,
      claimedAt: jo.claimedAt?.toISOString() ?? null,
      createdAt: jo.createdAt.toISOString(),
      invoiceId: jo.invoice?.id ?? null,
      invoiceStatus: jo.invoice?.status ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items: jo.items.map((i: any) => ({
        id: i.id, name: i.name, quantity: i.quantity,
        weight: i.weight?.toString() ?? null,
        unitPrice: i.unitPrice.toString(),
        total: i.total.toString(),
      })),
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stages: rawStages.map((s: any) => ({
      id: s.id, name: s.name, slug: s.slug,
      sortOrder: s.sortOrder, type: s.type,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    services: rawServices.map((s: any) => ({
      id: s.id, name: s.name,
      pricingType: s.pricingType,
      price: Number(s.price),
      category: s.category ?? null,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    customers: rawCustomers.map((c: any) => ({ id: c.id, name: c.name, phone: c.phone })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    employees: rawEmployees.map((e: any) => ({ id: e.id, name: e.name })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assets: rawAssets.map((asset: any) => ({
      id: asset.id,
      customerId: asset.customerId,
      name: asset.name,
      assetType: asset.assetType,
      identifier: asset.identifier ?? null,
      brand: asset.brand ?? null,
      model: asset.model ?? null,
      status: asset.status,
    })),
  });
}

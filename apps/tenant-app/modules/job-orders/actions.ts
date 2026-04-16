"use server";

import { revalidatePath } from "next/cache";
import { Prisma, prisma } from "@bizconnect/db";
import { authorize } from "@/lib/authorize";
import { getActiveBranchId } from "@/lib/branch";
import { createJobOrderSchema, type CreateJobOrderInput } from "./schema";
import { toast } from "sonner";

function isMissingLinkedCustomerColumn(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return message.includes("customer_id") || message.includes("job_order_id") || message.includes("asset_id");
}

function generateJobNo() {
  const date = new Date();
  const prefix = `JO-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${rand}`;
}

function normalizeCustomerName(value: string) {
  return value.trim().toLowerCase();
}

function normalizeCustomerPhone(value: string | null | undefined) {
  return (value ?? "").trim();
}

export async function createJobOrder(
  tenantSlug: string,
  tenantId: string,
  input: CreateJobOrderInput,
  firstStageSlug = "received"
) {
  const session = await authorize(tenantSlug, "job-orders.create");
  const parsed = createJobOrderSchema.parse(input);
  const assetsEnabled = session.user.modules.includes("assets");
  const crmEnabled = session.user.modules.includes("crm");
  const branchId = await getActiveBranchId();
  let customer = parsed.customerId
    ? await prisma.customer.findFirst({
        where: { id: parsed.customerId, tenantId },
        select: { id: true, name: true, phone: true },
      })
    : null;

  if (parsed.customerId && !customer) {
    throw new Error("Customer not found");
  }

  if (!customer && crmEnabled) {
    if (parsed.customerResolution === "use_existing") {
      if (!parsed.matchedCustomerId) {
        throw new Error("Select an existing customer or choose create new.");
      }

      const matchedCustomer = await prisma.customer.findFirst({
        where: { id: parsed.matchedCustomerId, tenantId },
        select: { id: true, name: true, phone: true, branchId: true },
      });

      if (!matchedCustomer) {
        throw new Error("Matched customer no longer exists.");
      }

      const nameMatches = normalizeCustomerName(matchedCustomer.name) === normalizeCustomerName(parsed.customerName);
      const phoneMatches = normalizeCustomerPhone(matchedCustomer.phone) === normalizeCustomerPhone(parsed.contactNo);

      if (!nameMatches || !phoneMatches) {
        throw new Error("Matched customer details changed. Review the customer before saving.");
      }

      customer = matchedCustomer;
    } else {
      customer = await prisma.customer.create({
        data: {
          tenantId,
          branchId: branchId ?? null,
          name: parsed.customerName.trim(),
          phone: parsed.contactNo?.trim() || null,
        },
        select: { id: true, name: true, phone: true },
      });
    }
  }

  if (parsed.assetId && !assetsEnabled) {
    throw new Error("Assets module is not enabled for this tenant");
  }

  const asset = parsed.assetId
    ? await db.asset.findFirst({
        where: { id: parsed.assetId, tenantId },
        select: { id: true, customerId: true },
      })
    : null;

  if (parsed.assetId && !asset) {
    throw new Error("Asset not found");
  }
  if (asset && customer && asset.customerId !== customer.id) {
    throw new Error("Selected asset does not belong to the selected customer");
  }
  if (asset && !customer) {
    throw new Error("Select a customer before attaching an asset");
  }

  const assignedEmployees = parsed.assignedStaffIds.length > 0
    ? await prisma.employee.findMany({
        where: { id: { in: parsed.assignedStaffIds }, tenantId },
        select: { id: true, name: true },
      })
    : [];

  const itemsCreate = parsed.items.length > 0
    ? { create: parsed.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        weight: item.weight ?? null,
        unitPrice: item.unitPrice,
        total: item.total,
      })) }
    : undefined;

  let createdId: string;
  try {
    const created = await prisma.jobOrder.create({
      data: {
        tenantId,
        branchId: branchId ?? null,
        customerId: customer?.id ?? null,
        assetId: asset?.id ?? null,
        jobNo: generateJobNo(),
        customerName: customer?.name ?? parsed.customerName,
        contactNo: customer?.phone ?? parsed.contactNo ?? null,
        notes: parsed.notes || null,
        priority: parsed.priority,
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
        status: firstStageSlug,
        items: itemsCreate,
      } as any,
    });
    createdId = created.id;
  } catch (error) {
    if (!isMissingLinkedCustomerColumn(error)) throw error;

    const created = await prisma.jobOrder.create({
      data: {
        tenantId,
        branchId: branchId ?? null,
        assetId: asset?.id ?? null,
        jobNo: generateJobNo(),
        customerName: customer?.name ?? parsed.customerName,
        contactNo: customer?.phone ?? parsed.contactNo ?? null,
        notes: parsed.notes || null,
        priority: parsed.priority,
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
        status: firstStageSlug,
        items: itemsCreate,
      } as any,
    });
    createdId = created.id;
  }

  if (assignedEmployees.length > 0) {
    await db.jobOrderAssignment.createMany({
      data: assignedEmployees.map((e) => ({
        jobOrderId: createdId,
        employeeId: e.id,
        employeeName: e.name,
      })),
    });
  }

  revalidatePath(`/${tenantSlug}/crm`);
  revalidatePath(`/${tenantSlug}/job-orders`);
}

export async function updateJobOrderStatus(
  tenantSlug: string,
  tenantId: string,
  jobOrderId: string,
  status: string,
  stageType?: "active" | "completed" | "cancelled"
) {
  await authorize(tenantSlug, "job-orders.status");

  const data: Record<string, unknown> = { status };
  if (stageType === "completed") {
    data.completedAt = new Date();
  }

  await prisma.jobOrder.update({
    where: { id: jobOrderId, tenantId },
    data,
  });

  revalidatePath(`/${tenantSlug}/job-orders`);
}

export async function updateJobOrder(
  tenantSlug: string,
  tenantId: string,
  jobOrderId: string,
  input: CreateJobOrderInput
) {
  const session = await authorize(tenantSlug, "job-orders.edit");
  const parsed = createJobOrderSchema.parse(input);
  const assetsEnabled = session.user.modules.includes("assets");
  const customer = parsed.customerId
    ? await prisma.customer.findFirst({
        where: { id: parsed.customerId, tenantId },
        select: { id: true, name: true, phone: true },
      })
    : null;

  if (parsed.customerId && !customer) {
    throw new Error("Customer not found");
  }

  if (parsed.assetId && !assetsEnabled) {
    throw new Error("Assets module is not enabled for this tenant");
  }

  const asset = parsed.assetId
    ? await db.asset.findFirst({
        where: { id: parsed.assetId, tenantId },
        select: { id: true, customerId: true },
      })
    : null;

  if (parsed.assetId && !asset) {
    throw new Error("Asset not found");
  }
  if (asset && customer && asset.customerId !== customer.id) {
    throw new Error("Selected asset does not belong to the selected customer");
  }
  if (asset && !customer) {
    throw new Error("Select a customer before attaching an asset");
  }

  const assignedEmployees = parsed.assignedStaffIds.length > 0
    ? await prisma.employee.findMany({
        where: { id: { in: parsed.assignedStaffIds }, tenantId },
        select: { id: true, name: true },
      })
    : [];

  try {
    await prisma.$transaction(async (tx) => {
      await (tx as any).jobOrder.update({
        where: { id: jobOrderId, tenantId },
        data: {
          customerId: customer?.id ?? null,
          assetId: asset?.id ?? null,
          customerName: customer?.name ?? parsed.customerName,
          contactNo: customer?.phone ?? parsed.contactNo ?? null,
          notes: parsed.notes || null,
          priority: parsed.priority,
          dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
        },
      });
      await tx.jobOrderItem.deleteMany({ where: { jobOrderId } });
      if (parsed.items.length > 0) {
        await tx.jobOrderItem.createMany({
          data: parsed.items.map((item) => ({
            jobOrderId,
            name: item.name,
            quantity: item.quantity,
            weight: item.weight ?? null,
            unitPrice: item.unitPrice,
            total: item.total,
          })),
        });
      }
    });
  } catch (error) {
    if (!isMissingLinkedCustomerColumn(error)) throw error;

    await prisma.$transaction(async (tx) => {
      await (tx as any).jobOrder.update({
        where: { id: jobOrderId, tenantId },
        data: {
          customerName: customer?.name ?? parsed.customerName,
          assetId: asset?.id ?? null,
          contactNo: customer?.phone ?? parsed.contactNo ?? null,
          notes: parsed.notes || null,
          priority: parsed.priority,
          dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
        },
      });
      await tx.jobOrderItem.deleteMany({ where: { jobOrderId } });
      if (parsed.items.length > 0) {
        await tx.jobOrderItem.createMany({
          data: parsed.items.map((item) => ({
            jobOrderId,
            name: item.name,
            quantity: item.quantity,
            weight: item.weight ?? null,
            unitPrice: item.unitPrice,
            total: item.total,
          })),
        });
      }
    });
  }

  // Update assignments (replace all)
  await db.jobOrderAssignment.deleteMany({ where: { jobOrderId } });
  if (assignedEmployees.length > 0) {
    await db.jobOrderAssignment.createMany({
      data: assignedEmployees.map((e) => ({
        jobOrderId,
        employeeId: e.id,
        employeeName: e.name,
      })),
    });
  }

  revalidatePath(`/${tenantSlug}/job-orders`);
}

export async function deleteJobOrder(tenantSlug: string, tenantId: string, jobOrderId: string) {
  await authorize(tenantSlug, "job-orders.edit");
  await prisma.jobOrder.delete({ where: { id: jobOrderId, tenantId } });
  revalidatePath(`/${tenantSlug}/job-orders`);
}

export async function createInvoiceForJobOrder(
  tenantSlug: string,
  tenantId: string,
  jobOrderId: string
) {
  await authorize(tenantSlug, "billing.create");

  let jobOrder: any;
  try {
    jobOrder = await prisma.jobOrder.findFirst({
      where: { id: jobOrderId, tenantId },
      include: {
        items: true,
        customer: { select: { id: true, name: true, email: true } },
        invoice: { select: { id: true } },
      },
    });
  } catch (error) {
    if (!isMissingLinkedCustomerColumn(error)) throw error;
    throw new Error("Apply the latest database migration to create invoices from job orders.");
  }

  if (!jobOrder) throw new Error("Job order not found");
  if (!jobOrder.completedAt) throw new Error("Only completed job orders can be invoiced");
  if (jobOrder.invoice) throw new Error("This job order already has an invoice");
  if (jobOrder.items.length === 0) throw new Error("Add charges before invoicing this job order");

  const subtotal = jobOrder.items.reduce(
    (sum: number, item: { total: unknown }) => sum + Number(item.total),
    0
  );
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);

  const invoice = await prisma.invoice.create({
    data: {
      tenantId,
      customerId: jobOrder.customerId,
      jobOrderId: jobOrder.id,
      invoiceNo: generateInvoiceNo(),
      customerName: jobOrder.customer?.name ?? jobOrder.customerName,
      customerEmail: jobOrder.customer?.email ?? null,
      dueDate,
      subtotal,
      tax: 0,
      total: subtotal,
      notes: `Generated from job order ${jobOrder.jobNo}`,
      status: "draft",
      items: {
        create: jobOrder.items.map((item: { name: string; quantity: number; unitPrice: unknown; total: unknown }) => ({
          description: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
      },
    },
  });

  revalidatePath(`/${tenantSlug}/job-orders`);
  revalidatePath(`/${tenantSlug}/billing`);
  return { invoiceId: invoice.id };
}

function generateReferenceNo() {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `JO-TXN-${date}-${rand}`;
}

function generateInvoiceNo() {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `INV-${date}-${rand}`;
}

export async function claimJobOrder(
  tenantSlug: string,
  tenantId: string,
  jobOrderId: string,
  payment: { method: string; amountPaid: number; total: number }
) {
  const session = await authorize(tenantSlug, "job-orders.status");

  await prisma.$transaction(async (tx) => {
    const jobOrder = await tx.jobOrder.findUnique({
      where: { id: jobOrderId, tenantId },
      include: { items: true },
    });
    if (!jobOrder) throw new Error("Job order not found");

    const now = new Date();

    // Mark claimed
    await tx.jobOrder.update({
      where: { id: jobOrderId },
      data: { status: "claimed", claimedAt: now, completedAt: now },
    });

    // Create sale record — source: "job-order" keeps it distinct from POS sales
    await tx.sale.create({
      data: {
        tenantId,
        referenceNo: generateReferenceNo(),
        source: "job-order",
        subtotal: payment.total,
        discount: 0,
        total: payment.total,
        amountPaid: payment.amountPaid,
        change: Math.max(0, payment.amountPaid - payment.total),
        paymentMethod: payment.method,
        status: "completed",
        servedById: session.user.id,
        items: {
          create: jobOrder.items.map((item) => ({
            itemId: null,
            itemType: "service",
            name: item.name,
            quantity: item.quantity,
            weight: item.weight ?? null,
            unitPrice: item.unitPrice,
            originalPrice: item.unitPrice,
            promoDiscount: 0,
            total: item.total,
          })),
        },
      },
    });
  });

  revalidatePath(`/${tenantSlug}/job-orders`);
  revalidatePath(`/${tenantSlug}/sales`);
}

// ─── Workflow stage management ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function saveWorkflowStages(
  tenantSlug: string,
  tenantId: string,
  stages: Array<{ id: string; name: string; slug: string; sortOrder: number; type: "active" | "completed" | "cancelled" }>
) {
  await authorize(tenantSlug, "job-orders.edit");

  try {

    await prisma.$transaction(async (tx) => {
      for (const stage of stages) {
        await tx.workflowStage.upsert({
          where: { tenantId, id: stage.id },
          update: { name: stage.name, slug: stage.slug, sortOrder: stage.sortOrder, type: stage.type },
          create: { id: stage.id, tenantId, name: stage.name, slug: stage.slug, sortOrder: stage.sortOrder, type: stage.type },
        });
      }
    });
  } catch (err) {
    let errorMessage = "Failed to save workflow stages. Please contact support."
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      errorMessage = "Duplicate stages found. Ensure stage names are unique"
    }
    toast.error(errorMessage)
  }

  revalidatePath(`/${tenantSlug}/job-orders`);
}

export async function deleteWorkflowStage(tenantSlug: string, tenantId: string, stageId: string) {
  await authorize(tenantSlug, "job-orders.edit");
  await db.workflowStage.delete({ where: { id: stageId, tenantId } });
  revalidatePath(`/${tenantSlug}/job-orders`);
}

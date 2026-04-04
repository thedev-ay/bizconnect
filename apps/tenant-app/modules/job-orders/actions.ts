"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bizconnect/db";
import { authorize } from "@/lib/authorize";
import { createJobOrderSchema, type CreateJobOrderInput } from "./schema";

function isMissingLinkedCustomerColumn(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return message.includes("customer_id") || message.includes("job_order_id");
}

function generateJobNo() {
  const date = new Date();
  const prefix = `JO-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${rand}`;
}

export async function createJobOrder(
  tenantSlug: string,
  tenantId: string,
  input: CreateJobOrderInput,
  firstStageSlug = "received"
) {
  await authorize(tenantSlug, "job-orders.create");
  const parsed = createJobOrderSchema.parse(input);
  const customer = parsed.customerId
    ? await prisma.customer.findFirst({
        where: { id: parsed.customerId, tenantId },
        select: { id: true, name: true, phone: true },
      })
    : null;

  if (parsed.customerId && !customer) {
    throw new Error("Customer not found");
  }

  try {
    await prisma.jobOrder.create({
      data: {
        tenantId,
        customerId: customer?.id ?? null,
        jobNo: generateJobNo(),
        customerName: customer?.name ?? parsed.customerName,
        contactNo: customer?.phone ?? parsed.contactNo ?? null,
        notes: parsed.notes || null,
        priority: parsed.priority,
        assignedTo: parsed.assignedTo || null,
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
        status: firstStageSlug,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items: parsed.items.length > 0 ? { create: parsed.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          weight: item.weight ?? null,
          unitPrice: item.unitPrice,
          total: item.total,
        })) } : undefined,
      } as any,
    });
  } catch (error) {
    if (!isMissingLinkedCustomerColumn(error)) throw error;

    await prisma.jobOrder.create({
      data: {
        tenantId,
        jobNo: generateJobNo(),
        customerName: customer?.name ?? parsed.customerName,
        contactNo: customer?.phone ?? parsed.contactNo ?? null,
        notes: parsed.notes || null,
        priority: parsed.priority,
        assignedTo: parsed.assignedTo || null,
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
        status: firstStageSlug,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items: parsed.items.length > 0 ? { create: parsed.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          weight: item.weight ?? null,
          unitPrice: item.unitPrice,
          total: item.total,
        })) } : undefined,
      } as any,
    });
  }

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
  await authorize(tenantSlug, "job-orders.edit");
  const parsed = createJobOrderSchema.parse(input);
  const customer = parsed.customerId
    ? await prisma.customer.findFirst({
        where: { id: parsed.customerId, tenantId },
        select: { id: true, name: true, phone: true },
      })
    : null;

  if (parsed.customerId && !customer) {
    throw new Error("Customer not found");
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.jobOrder.update({
        where: { id: jobOrderId, tenantId },
        data: {
          customerId: customer?.id ?? null,
          customerName: customer?.name ?? parsed.customerName,
          contactNo: customer?.phone ?? parsed.contactNo ?? null,
          notes: parsed.notes || null,
          priority: parsed.priority,
          assignedTo: parsed.assignedTo || null,
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
      await tx.jobOrder.update({
        where: { id: jobOrderId, tenantId },
        data: {
          customerName: customer?.name ?? parsed.customerName,
          contactNo: customer?.phone ?? parsed.contactNo ?? null,
          notes: parsed.notes || null,
          priority: parsed.priority,
          assignedTo: parsed.assignedTo || null,
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

    // Create sale record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (tx as any).sale.create({
      data: {
        tenantId,
        referenceNo: generateReferenceNo(),
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          })) as any,
        },
      },
    });
  });

  revalidatePath(`/${tenantSlug}/job-orders`);
  revalidatePath(`/${tenantSlug}/pos/sales`);
}

// ─── Workflow stage management ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function saveWorkflowStages(
  tenantSlug: string,
  tenantId: string,
  stages: Array<{ id?: string; name: string; slug: string; color: string; sortOrder: number; type: "active" | "completed" | "cancelled" }>
) {
  await authorize(tenantSlug, "job-orders.edit");

  // Upsert each stage
  for (const stage of stages) {
    if (stage.id) {
      await db.workflowStage.update({
        where: { id: stage.id },
        data: { name: stage.name, color: stage.color, sortOrder: stage.sortOrder, type: stage.type },
      });
    } else {
      await db.workflowStage.create({
        data: { tenantId, name: stage.name, slug: stage.slug, color: stage.color, sortOrder: stage.sortOrder, type: stage.type },
      });
    }
  }

  revalidatePath(`/${tenantSlug}/job-orders`);
}

export async function deleteWorkflowStage(tenantSlug: string, tenantId: string, stageId: string) {
  await authorize(tenantSlug, "job-orders.edit");
  await db.workflowStage.delete({ where: { id: stageId, tenantId } });
  revalidatePath(`/${tenantSlug}/job-orders`);
}

// ─── Time tracking ────────────────────────────────────────────────────────────

export async function startTimeLog(
  tenantSlug: string,
  tenantId: string,
  jobOrderId: string,
  taskName: string
) {
  const session = await authorize(tenantSlug, "job-orders.edit");
  if (!session.user.id) throw new Error("Unauthorized");

  const log = await prisma.jobOrderTimeLog.create({
    data: {
      tenantId,
      jobOrderId,
      taskName,
      startedAt: new Date(),
      recordedBy: session.user.id,
    },
  });

  revalidatePath(`/${tenantSlug}/job-orders`);
  return log;
}

export async function endTimeLog(tenantSlug: string, tenantId: string, logId: string) {
  await authorize(tenantSlug, "job-orders.edit");

  const log = await prisma.jobOrderTimeLog.findUnique({ where: { id: logId } });
  if (!log) throw new Error("Time log not found");
  if (log.endedAt) throw new Error("Time log already ended");

  const endedAt = new Date();
  const duration = Math.round((endedAt.getTime() - log.startedAt.getTime()) / 1000);

  const updated = await prisma.jobOrderTimeLog.update({
    where: { id: logId },
    data: { endedAt, duration },
  });

  revalidatePath(`/${tenantSlug}/job-orders`);
  return updated;
}

export async function getJobOrderTimeLogs(tenantSlug: string, tenantId: string, jobOrderId: string) {
  await authorize(tenantSlug, "job-orders.view");

  const logs = await prisma.jobOrderTimeLog.findMany({
    where: { tenantId, jobOrderId },
    orderBy: { createdAt: "desc" },
  });

  return logs;
}

export async function updateTimeLogNotes(
  tenantSlug: string,
  tenantId: string,
  logId: string,
  notes: string
) {
  await authorize(tenantSlug, "job-orders.edit");

  const updated = await prisma.jobOrderTimeLog.update({
    where: { id: logId, tenantId },
    data: { notes },
  });

  revalidatePath(`/${tenantSlug}/job-orders`);
  return updated;
}

export async function deleteTimeLog(tenantSlug: string, tenantId: string, logId: string) {
  await authorize(tenantSlug, "job-orders.edit");

  await prisma.jobOrderTimeLog.delete({
    where: { id: logId, tenantId },
  });

  revalidatePath(`/${tenantSlug}/job-orders`);
}

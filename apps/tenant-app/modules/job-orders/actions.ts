"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bizconnect/db";
import { authorize } from "@/lib/authorize";
import { createJobOrderSchema, type CreateJobOrderInput } from "./schema";

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

  await prisma.jobOrder.create({
    data: {
      tenantId,
      jobNo: generateJobNo(),
      customerName: parsed.customerName,
      contactNo: parsed.contactNo || null,
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
    data.claimedAt = new Date();
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

  await prisma.$transaction(async (tx) => {
    await tx.jobOrder.update({
      where: { id: jobOrderId, tenantId },
      data: {
        customerName: parsed.customerName,
        contactNo: parsed.contactNo || null,
        notes: parsed.notes || null,
        priority: parsed.priority,
        assignedTo: parsed.assignedTo || null,
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
      },
    });
    // Replace items
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

  revalidatePath(`/${tenantSlug}/job-orders`);
}

export async function deleteJobOrder(tenantSlug: string, tenantId: string, jobOrderId: string) {
  await authorize(tenantSlug, "job-orders.edit");
  await prisma.jobOrder.delete({ where: { id: jobOrderId, tenantId } });
  revalidatePath(`/${tenantSlug}/job-orders`);
}

function generateReferenceNo() {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `JO-TXN-${date}-${rand}`;
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

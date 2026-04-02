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
  input: CreateJobOrderInput
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
      status: "received",
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
  status: string
) {
  await authorize(tenantSlug, "job-orders.status");

  const data: Record<string, unknown> = { status };
  if (status === "claimed") {
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

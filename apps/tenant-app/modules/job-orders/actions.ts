"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bizconnect/db";
import { auth } from "@/lib/auth";
import { createJobOrderSchema, type CreateJobOrderInput } from "./schema";

async function authorize(tenantSlug: string) {
  const session = await auth();
  if (!session?.user || session.user.tenantSlug !== tenantSlug) {
    throw new Error("Unauthorized");
  }
  return session;
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
  input: CreateJobOrderInput
) {
  await authorize(tenantSlug);
  const parsed = createJobOrderSchema.parse(input);

  const jobOrder = await prisma.jobOrder.create({
    data: {
      tenantId,
      jobNo: generateJobNo(),
      customerName: parsed.customerName,
      description: parsed.description,
      priority: parsed.priority,
      assignedTo: parsed.assignedTo || null,
      dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
      status: "pending",
    },
  });

  revalidatePath(`/${tenantSlug}/job-orders`);
  return jobOrder;
}

export async function updateJobOrderStatus(
  tenantSlug: string,
  tenantId: string,
  jobOrderId: string,
  status: string
) {
  await authorize(tenantSlug);

  const data: Record<string, unknown> = { status };
  if (status === "completed") data.completedAt = new Date();

  const jobOrder = await prisma.jobOrder.update({
    where: { id: jobOrderId, tenantId },
    data,
  });

  revalidatePath(`/${tenantSlug}/job-orders`);
  return jobOrder;
}

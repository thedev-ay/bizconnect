"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bizconnect/db";
import { authorize } from "@/lib/authorize";
import { getActiveBranchId } from "@/lib/branch";
import { createCustomerSchema, type CreateCustomerInput } from "./schema";

export async function createCustomer(
  tenantSlug: string,
  tenantId: string,
  input: CreateCustomerInput
) {
  await authorize(tenantSlug, "crm.create");
  const parsed = createCustomerSchema.parse(input);
  const branchId = await getActiveBranchId();

  const tags = parsed.tags
    ? parsed.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const customer = await prisma.customer.create({
    data: {
      tenantId,
      branchId: branchId ?? null,
      name: parsed.name,
      email: parsed.email || null,
      phone: parsed.phone || null,
      address: parsed.address || null,
      notes: parsed.notes || null,
      tags,
    },
  });

  revalidatePath(`/${tenantSlug}/crm`);
  revalidatePath(`/${tenantSlug}/job-orders`);
  return customer;
}

export async function updateCustomer(
  tenantSlug: string,
  tenantId: string,
  customerId: string,
  input: CreateCustomerInput
) {
  await authorize(tenantSlug, "crm.edit");
  const parsed = createCustomerSchema.parse(input);

  const tags = parsed.tags
    ? parsed.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const customer = await prisma.customer.update({
    where: { id: customerId, tenantId },
    data: {
      name: parsed.name,
      email: parsed.email || null,
      phone: parsed.phone || null,
      address: parsed.address || null,
      notes: parsed.notes || null,
      tags,
    },
  });

  revalidatePath(`/${tenantSlug}/crm`);
  revalidatePath(`/${tenantSlug}/job-orders`);
  return customer;
}

export async function deleteCustomer(
  tenantSlug: string,
  tenantId: string,
  customerId: string
) {
  await authorize(tenantSlug, "crm.delete");

  const linkedAssets = await (prisma as any).asset.count({
    where: { tenantId, customerId },
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("assets")) return 0;
    throw error;
  });

  if (linkedAssets > 0) {
    throw new Error("This customer has linked assets. Reassign or archive them before deleting the customer.");
  }

  await prisma.customer.delete({ where: { id: customerId, tenantId } });

  revalidatePath(`/${tenantSlug}/crm`);
  revalidatePath(`/${tenantSlug}/job-orders`);
}

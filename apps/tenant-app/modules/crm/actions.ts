"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bizconnect/db";
import { authorize } from "@/lib/authorize";
import { createCustomerSchema, type CreateCustomerInput } from "./schema";

export async function createCustomer(
  tenantSlug: string,
  tenantId: string,
  input: CreateCustomerInput
) {
  await authorize(tenantSlug, "crm.create");
  const parsed = createCustomerSchema.parse(input);

  const tags = parsed.tags
    ? parsed.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const customer = await prisma.customer.create({
    data: {
      tenantId,
      name: parsed.name,
      email: parsed.email || null,
      phone: parsed.phone || null,
      address: parsed.address || null,
      notes: parsed.notes || null,
      tags,
    },
  });

  revalidatePath(`/${tenantSlug}/crm`);
  return customer;
}

export async function deleteCustomer(
  tenantSlug: string,
  tenantId: string,
  customerId: string
) {
  await authorize(tenantSlug, "crm.delete");

  await prisma.customer.delete({ where: { id: customerId, tenantId } });

  revalidatePath(`/${tenantSlug}/crm`);
}

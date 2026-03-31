"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bizconnect/db";
import { auth } from "@/lib/auth";
import { createCustomerSchema, type CreateCustomerInput } from "./schema";

async function authorize(tenantSlug: string) {
  const session = await auth();
  if (!session?.user || session.user.tenantSlug !== tenantSlug) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function createCustomer(
  tenantSlug: string,
  tenantId: string,
  input: CreateCustomerInput
) {
  await authorize(tenantSlug);
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
  await authorize(tenantSlug);

  await prisma.customer.delete({ where: { id: customerId, tenantId } });

  revalidatePath(`/${tenantSlug}/crm`);
}

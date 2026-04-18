"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bizconnect/db";
import { authorize } from "@/lib/authorize";
import { serviceSchema, updateServiceSchema } from "./schema";
import type { ServiceInput, UpdateServiceInput } from "./schema";

export async function createService(tenantSlug: string, tenantId: string, input: ServiceInput) {
  await authorize(tenantSlug, "services.create");
  const parsed = serviceSchema.parse(input);

  await (prisma as any).service.create({
    data: { tenantId, ...parsed },
  });

  revalidatePath(`/${tenantSlug}/services`);
  revalidatePath(`/${tenantSlug}/appointments`);
  revalidatePath(`/${tenantSlug}/hr`);
  revalidatePath(`/${tenantSlug}/job-orders`);
  revalidatePath(`/${tenantSlug}/pos`);
}

export async function updateService(
  tenantSlug: string,
  tenantId: string,
  serviceId: string,
  input: UpdateServiceInput
) {
  await authorize(tenantSlug, "services.edit");
  const parsed = updateServiceSchema.parse(input);

  await (prisma as any).service.update({
    where: { id: serviceId, tenantId },
    data: parsed,
  });

  revalidatePath(`/${tenantSlug}/services`);
  revalidatePath(`/${tenantSlug}/appointments`);
  revalidatePath(`/${tenantSlug}/hr`);
  revalidatePath(`/${tenantSlug}/job-orders`);
  revalidatePath(`/${tenantSlug}/pos`);
}

export async function toggleService(tenantSlug: string, tenantId: string, serviceId: string, isActive: boolean) {
  await authorize(tenantSlug, "services.edit");

  await (prisma as any).service.update({
    where: { id: serviceId, tenantId },
    data: { isActive },
  });

  revalidatePath(`/${tenantSlug}/services`);
  revalidatePath(`/${tenantSlug}/appointments`);
  revalidatePath(`/${tenantSlug}/hr`);
  revalidatePath(`/${tenantSlug}/job-orders`);
  revalidatePath(`/${tenantSlug}/pos`);
}

export async function deleteService(tenantSlug: string, tenantId: string, serviceId: string) {
  await authorize(tenantSlug, "services.delete");
  await prisma.service.delete({ where: { id: serviceId, tenantId } });
  revalidatePath(`/${tenantSlug}/services`);
  revalidatePath(`/${tenantSlug}/appointments`);
  revalidatePath(`/${tenantSlug}/hr`);
  revalidatePath(`/${tenantSlug}/job-orders`);
  revalidatePath(`/${tenantSlug}/pos`);
}

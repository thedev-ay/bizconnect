"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bizconnect/db";
import { auth } from "@/lib/auth";
import { createServiceSchema, updateStaffProfileSchema, type CreateServiceInput, type UpdateStaffProfileInput } from "./schema";

async function authorize(tenantSlug: string) {
  const session = await auth();
  if (!session?.user || session.user.tenantSlug !== tenantSlug) throw new Error("Unauthorized");
  return session;
}

export async function createService(tenantSlug: string, tenantId: string, input: CreateServiceInput) {
  await authorize(tenantSlug);
  const parsed = createServiceSchema.parse(input);
  const service = await prisma.service.create({
    data: { tenantId, ...parsed },
  });
  revalidatePath(`/${tenantSlug}/staff`);
  return service;
}

export async function deleteService(tenantSlug: string, tenantId: string, serviceId: string) {
  await authorize(tenantSlug);
  await prisma.service.delete({ where: { id: serviceId, tenantId } });
  revalidatePath(`/${tenantSlug}/staff`);
}

export async function updateStaffProfile(
  tenantSlug: string,
  tenantId: string,
  employeeId: string,
  input: UpdateStaffProfileInput
) {
  await authorize(tenantSlug);
  const parsed = updateStaffProfileSchema.parse(input);

  await prisma.$transaction(async (tx) => {
    // Update employee fields
    await tx.employee.update({
      where: { id: employeeId, tenantId },
      data: {
        commissionRate: parsed.commissionRate ?? null,
        accessLevel: parsed.accessLevel,
      },
    });

    // Replace services
    await tx.staffService.deleteMany({ where: { employeeId } });
    if (parsed.serviceIds.length > 0) {
      await tx.staffService.createMany({
        data: parsed.serviceIds.map((serviceId) => ({ employeeId, serviceId })),
      });
    }

    // Replace working hours
    await tx.workingHours.deleteMany({ where: { employeeId } });
    const hoursToCreate = parsed.workingHours.filter((h) => h.enabled);
    if (hoursToCreate.length > 0) {
      await tx.workingHours.createMany({
        data: hoursToCreate.map((h) => ({
          employeeId,
          dayOfWeek: h.dayOfWeek,
          startTime: h.startTime,
          endTime: h.endTime,
        })),
      });
    }
  });

  revalidatePath(`/${tenantSlug}/staff`);
}

export async function createShift(tenantSlug: string, tenantId: string, input: { employeeId: string; title?: string; startAt: string; endAt: string; notes?: string }) {
  await authorize(tenantSlug);
  const shift = await prisma.shift.create({
    data: {
      tenantId,
      employeeId: input.employeeId,
      title: input.title || null,
      startAt: new Date(input.startAt),
      endAt: new Date(input.endAt),
      notes: input.notes || null,
    },
  });
  revalidatePath(`/${tenantSlug}/staff`);
  return shift;
}

export async function deleteShift(tenantSlug: string, tenantId: string, shiftId: string) {
  await authorize(tenantSlug);
  await prisma.shift.delete({ where: { id: shiftId, tenantId } });
  revalidatePath(`/${tenantSlug}/staff`);
}

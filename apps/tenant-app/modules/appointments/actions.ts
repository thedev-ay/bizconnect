"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bizconnect/db";
import { auth } from "@/lib/auth";
import { createAppointmentSchema, type CreateAppointmentInput } from "./schema";

async function authorize(tenantSlug: string) {
  const session = await auth();
  if (!session?.user || session.user.tenantSlug !== tenantSlug) throw new Error("Unauthorized");
  return session;
}

/** Check if a staff member is available at a given datetime. */
export async function getStaffAvailability(
  employeeId: string,
  dateStr: string // ISO date string e.g. "2025-03-15"
): Promise<{
  isWorkingDay: boolean;
  workStart: string | null;
  workEnd: string | null;
  bookedSlots: { start: string; end: string; title: string }[];
}> {
  const date = new Date(dateStr);
  const dayOfWeek = date.getDay();

  const [workingHours, existingAppts] = await Promise.all([
    prisma.workingHours.findUnique({
      where: { employeeId_dayOfWeek: { employeeId, dayOfWeek } },
    }),
    prisma.appointment.findMany({
      where: {
        employeeId,
        startAt: {
          gte: new Date(date.toISOString().slice(0, 10) + "T00:00:00.000Z"),
          lt: new Date(date.toISOString().slice(0, 10) + "T23:59:59.999Z"),
        },
        status: { notIn: ["cancelled", "no-show"] },
      },
      select: { startAt: true, endAt: true, title: true },
    }),
  ]);

  return {
    isWorkingDay: !!workingHours,
    workStart: workingHours?.startTime ?? null,
    workEnd: workingHours?.endTime ?? null,
    bookedSlots: existingAppts.map((a) => ({
      start: a.startAt.toISOString(),
      end: a.endAt.toISOString(),
      title: a.title,
    })),
  };
}

export async function createAppointment(
  tenantSlug: string,
  tenantId: string,
  input: CreateAppointmentInput
) {
  await authorize(tenantSlug);
  const parsed = createAppointmentSchema.parse(input);

  // Fetch service to get duration and title
  const service = await prisma.service.findUnique({ where: { id: parsed.serviceId } });
  if (!service) throw new Error("Service not found");

  const employee = await prisma.employee.findUnique({ where: { id: parsed.employeeId } });
  if (!employee) throw new Error("Staff member not found");

  const startAt = new Date(parsed.startAt);
  const endAt = new Date(startAt.getTime() + service.duration * 60 * 1000);

  // Validate working hours
  const dayOfWeek = startAt.getDay();
  const workingHours = await prisma.workingHours.findUnique({
    where: { employeeId_dayOfWeek: { employeeId: parsed.employeeId, dayOfWeek } },
  });

  if (!workingHours) {
    throw new Error(`${employee.name} does not work on ${startAt.toLocaleDateString("en-US", { weekday: "long" })}s`);
  }

  const startHHMM = startAt.toTimeString().slice(0, 5);
  const endHHMM = endAt.toTimeString().slice(0, 5);

  if (startHHMM < workingHours.startTime || endHHMM > workingHours.endTime) {
    throw new Error(
      `${employee.name} works ${workingHours.startTime}–${workingHours.endTime} on this day`
    );
  }

  // Check for conflicts
  const conflict = await prisma.appointment.findFirst({
    where: {
      employeeId: parsed.employeeId,
      status: { notIn: ["cancelled", "no-show"] },
      OR: [
        { startAt: { lt: endAt }, endAt: { gt: startAt } },
      ],
    },
  });
  if (conflict) {
    throw new Error(`${employee.name} already has an appointment at that time`);
  }

  const appointment = await prisma.appointment.create({
    data: {
      tenantId,
      title: service.name,
      customerName: parsed.customerName,
      customerEmail: parsed.customerEmail || null,
      customerPhone: parsed.customerPhone || null,
      notes: parsed.notes || null,
      startAt,
      endAt,
      employeeId: parsed.employeeId,
      serviceId: parsed.serviceId,
      status: "pending",
    },
  });

  revalidatePath(`/${tenantSlug}/appointments`);
  return appointment;
}

export async function updateAppointmentStatus(
  tenantSlug: string,
  tenantId: string,
  appointmentId: string,
  status: string
) {
  await authorize(tenantSlug);
  const appointment = await prisma.appointment.update({
    where: { id: appointmentId, tenantId },
    data: { status },
  });
  revalidatePath(`/${tenantSlug}/appointments`);
  return appointment;
}

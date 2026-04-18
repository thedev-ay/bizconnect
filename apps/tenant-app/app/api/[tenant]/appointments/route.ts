import { NextResponse } from "next/server";
import { prisma } from "@bizconnect/db";
import { authorize } from "@/lib/authorize";
import { getActiveBranchId } from "@/lib/branch";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant: tenantSlug } = await params;

  const [session, branchId] = await Promise.all([
    authorize(tenantSlug),
    getActiveBranchId(),
  ]);

  const tenantId = session.user.tenantId;
  const branchFilter = branchId ? { branchId } : {};

  const [appointments, services, staff, businessHours] = await Promise.all([
    prisma.appointment.findMany({
      where: { tenantId, ...branchFilter },
      include: {
        employee: { select: { name: true } },
        service: { select: { name: true } },
      },
      orderBy: { startAt: "asc" },
    }),
    prisma.service.findMany({
      where: {
        tenantId,
        isActive: true,
        availableForAppointments: true,
        duration: { not: null },
      },
      orderBy: { name: "asc" },
    }),
    prisma.employee.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(branchId
          ? {
              OR: [
                { homeBranchId: branchId },
                { branchAssignments: { some: { branchId, endDate: null } } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
      include: { services: { select: { serviceId: true } } },
    }),
    prisma.businessHours.findMany({
      where: { tenantId, isOpen: true },
    }),
  ]);

  const openTimes = businessHours.map((h) => h.openTime);
  const closeTimes = businessHours.map((h) => h.closeTime);

  return NextResponse.json({
    appointments: appointments.map((a) => ({
      id: a.id, title: a.title,
      customerName: a.customerName,
      customerEmail: a.customerEmail,
      customerPhone: a.customerPhone,
      notes: a.notes,
      startAt: a.startAt.toISOString(),
      endAt: a.endAt.toISOString(),
      status: a.status,
      employeeId: a.employeeId,
      employeeName: a.employee?.name ?? a.staffName ?? null,
      staffName: a.staffName,
      serviceId: a.serviceId,
      serviceName: a.service?.name ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
    services: services.map((s) => ({
      id: s.id, name: s.name,
      duration: s.duration!,
      price: s.price.toString(),
    })),
    staff: staff.map((e) => ({
      id: e.id, name: e.name,
      position: e.position,
      serviceIds: e.services.map((ss) => ss.serviceId),
    })),
    slotMinTime: openTimes.length > 0 ? [...openTimes].sort()[0] : "07:00",
    slotMaxTime: closeTimes.length > 0 ? [...closeTimes].sort().at(-1)! : "21:00",
  });
}

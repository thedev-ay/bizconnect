import { NextResponse } from "next/server";
import { prisma } from "@bizconnect/db";
import { authorize } from "@/lib/authorize";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant: tenantSlug } = await params;
  await authorize(tenantSlug);

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true },
  });
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tenantId = tenant.id;

  const [appointments, services, staff, businessHours] = await Promise.all([
    prisma.appointment.findMany({
      where: { tenantId },
      include: {
        employee: { select: { name: true } },
        service: { select: { name: true } },
      },
      orderBy: { startAt: "asc" },
    }),
    prisma.service.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.employee.findMany({
      where: { tenantId, isActive: true },
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
      employeeName: a.employee?.name ?? null,
      serviceId: a.serviceId,
      serviceName: a.service?.name ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
    services: services.map((s) => ({
      id: s.id, name: s.name,
      duration: s.duration,
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

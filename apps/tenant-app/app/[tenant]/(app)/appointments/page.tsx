import { prisma } from "@bizconnect/db";
import { getTenant } from "@/lib/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppointmentCalendar, CreateAppointmentDialog } from "@/modules/appointments";
import type { Appointment } from "@/modules/appointments";
import { Clock, CheckCircle, XCircle, CalendarClock } from "lucide-react";

interface AppointmentsPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function AppointmentsPage({ params }: AppointmentsPageProps) {
  const { tenant: tenantSlug } = await params;
  const tenant = await getTenant(tenantSlug);

  const [appointments, services, staff] = await Promise.all([
    prisma.appointment.findMany({
      where: { tenantId: tenant.id },
      include: {
        employee: { select: { name: true } },
        service: { select: { name: true } },
      },
      orderBy: { startAt: "asc" },
    }),
    prisma.service.findMany({
      where: { tenantId: tenant.id, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.employee.findMany({
      where: { tenantId: tenant.id, isActive: true },
      orderBy: { name: "asc" },
      include: {
        services: { select: { serviceId: true } },
      },
    }),
  ]);

  const typedAppointments: Appointment[] = appointments.map((a) => ({
    id: a.id,
    title: a.title,
    customerName: a.customerName,
    customerEmail: a.customerEmail,
    customerPhone: a.customerPhone,
    notes: a.notes,
    startAt: a.startAt,
    endAt: a.endAt,
    status: a.status,
    employeeId: a.employeeId,
    employeeName: a.employee?.name ?? null,
    serviceId: a.serviceId,
    serviceName: a.service?.name ?? null,
    createdAt: a.createdAt,
  }));

  const serviceOptions = services.map((s) => ({
    id: s.id,
    name: s.name,
    duration: s.duration,
    price: s.price.toString(),
  }));

  const staffOptions = staff.map((e) => ({
    id: e.id,
    name: e.name,
    position: e.position,
    serviceIds: e.services.map((ss) => ss.serviceId),
  }));

  const pending = appointments.filter((a) => a.status === "pending").length;
  const confirmed = appointments.filter((a) => a.status === "confirmed").length;
  const done = appointments.filter((a) => a.status === "done").length;
  const cancelled = appointments.filter(
    (a) => a.status === "cancelled" || a.status === "no-show"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground">{appointments.length} total</p>
        </div>
        <CreateAppointmentDialog
          tenantSlug={tenantSlug}
          tenantId={tenant.id}
          services={serviceOptions}
          staff={staffOptions}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{pending}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <CalendarClock className="h-4 w-4 text-blue-500" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Confirmed</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-600">{confirmed}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Done</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{done}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <XCircle className="h-4 w-4 text-destructive" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Cancelled</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-destructive">{cancelled}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <AppointmentCalendar
            appointments={typedAppointments}
            tenantSlug={tenantSlug}
            tenantId={tenant.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}

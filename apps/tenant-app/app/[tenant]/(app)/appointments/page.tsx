import { prisma } from "@bizconnect/db";
import { getTenant } from "@/lib/tenant";
import { Card, CardContent } from "@/components/ui/card";
import { AppointmentsShell } from "@/modules/appointments";
import type { Appointment } from "@/modules/appointments";
import { Clock, CalendarCheck, CheckCircle, XCircle } from "lucide-react";

interface AppointmentsPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function AppointmentsPage({ params }: AppointmentsPageProps) {
  const { tenant: tenantSlug } = await params;
  const tenant = await getTenant(tenantSlug);

  const [appointments, services, staff, businessHours] = await Promise.all([
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
      include: { services: { select: { serviceId: true } } },
    }),
    prisma.businessHours.findMany({
      where: { tenantId: tenant.id, isOpen: true },
    }),
  ]);

  const openTimes = businessHours.map((h) => h.openTime);
  const closeTimes = businessHours.map((h) => h.closeTime);
  const slotMinTime = openTimes.length > 0 ? openTimes.sort()[0] : "07:00";
  const slotMaxTime = closeTimes.length > 0 ? closeTimes.sort().at(-1)! : "21:00";

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
  const cancelled = appointments.filter((a) => a.status === "cancelled" || a.status === "no-show").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Appointments</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{appointments.length} total</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="shadow-none border-zinc-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">Pending</p>
                <p className="mt-1.5 text-2xl font-bold text-amber-600">{pending}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border-zinc-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">Confirmed</p>
                <p className="mt-1.5 text-2xl font-bold text-blue-600">{confirmed}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <CalendarCheck className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border-zinc-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">Completed</p>
                <p className="mt-1.5 text-2xl font-bold text-emerald-600">{done}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border-zinc-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">Cancelled</p>
                <p className="mt-1.5 text-2xl font-bold text-zinc-400">{cancelled}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100">
                <XCircle className="h-4 w-4 text-zinc-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar + dialog — shell manages slot-click → open dialog interaction */}
      <AppointmentsShell
        appointments={typedAppointments}
        tenantSlug={tenantSlug}
        tenantId={tenant.id}
        services={serviceOptions}
        staff={staffOptions}
        currencySymbol={tenant.currencySymbol}
        currencyLocale={tenant.currencyLocale}
        slotMinTime={slotMinTime}
        slotMaxTime={slotMaxTime}
      />
    </div>
  );
}

import { prisma } from "@bizconnect/db";
import { getTenant } from "@/lib/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StaffCalendar, StaffProfileDialog, AddServiceDialog } from "@/modules/staff";
import type { StaffMember, Service, Shift, StaffEmployee } from "@/modules/staff";
import { Users, CalendarCheck } from "lucide-react";
import { DeleteServiceButton } from "./delete-service-button";
import Link from "next/link";

interface StaffPageProps {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ tab?: string }>;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function StaffPage({ params, searchParams }: StaffPageProps) {
  const { tenant: tenantSlug } = await params;
  const { tab = "staff" } = await searchParams;
  const tenant = await getTenant(tenantSlug);

  const [employees, services, shifts] = await Promise.all([
    prisma.employee.findMany({
      where: { tenantId: tenant.id, isActive: true },
      orderBy: { name: "asc" },
      include: {
        services: { include: { service: { select: { id: true, name: true } } } },
        workingHours: { orderBy: { dayOfWeek: "asc" } },
      },
    }),
    prisma.service.findMany({
      where: { tenantId: tenant.id },
      orderBy: { name: "asc" },
    }),
    prisma.shift.findMany({
      where: { tenantId: tenant.id },
      include: { employee: { select: { name: true } } },
      orderBy: { startAt: "asc" },
    }),
  ]);

  const staffMembers: StaffMember[] = employees.map((e) => ({
    id: e.id,
    employeeNo: e.employeeNo,
    name: e.name,
    email: e.email,
    phone: e.phone,
    position: e.position,
    department: e.department,
    commissionRate: e.commissionRate?.toString() ?? null,
    accessLevel: e.accessLevel,
    photoUrl: e.photoUrl,
    isActive: e.isActive,
    services: e.services.map((ss) => ({ serviceId: ss.serviceId, serviceName: ss.service.name })),
    workingHours: e.workingHours.map((wh) => ({
      id: wh.id,
      dayOfWeek: wh.dayOfWeek,
      startTime: wh.startTime,
      endTime: wh.endTime,
    })),
  }));

  const typedServices: Service[] = services.map((s) => ({
    ...s,
    price: s.price.toString(),
  }));

  const typedShifts: Shift[] = shifts.map((s) => ({
    id: s.id,
    employeeId: s.employeeId,
    employeeName: s.employee.name,
    title: s.title,
    startAt: s.startAt,
    endAt: s.endAt,
    notes: s.notes,
  }));

  const staffEmployees: StaffEmployee[] = employees.map((e) => ({
    id: e.id,
    name: e.name,
    position: e.position,
    department: e.department,
    isActive: e.isActive,
  }));

  const tabs = [
    { key: "staff", label: "Staff", icon: Users },
    { key: "services", label: "Services", icon: null },
    { key: "schedule", label: "Schedule", icon: CalendarCheck },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Staff Management</h1>
        <p className="text-muted-foreground">Profiles, services, working hours, and shift scheduling</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 border-b">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/${tenantSlug}/staff?tab=${t.key}`}
            className={[
              "px-4 py-2 text-sm font-medium transition-colors",
              tab === t.key
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Staff tab */}
      {tab === "staff" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{staffMembers.length} Active Staff</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead>Working Days</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Access</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No active staff. Add employees in the HR module first.
                    </TableCell>
                  </TableRow>
                ) : (
                  staffMembers.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="font-medium">{s.name}</div>
                        {s.email && <div className="text-xs text-muted-foreground">{s.email}</div>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{s.position ?? "—"}</TableCell>
                      <TableCell>
                        {s.services.length === 0 ? (
                          <span className="text-xs text-muted-foreground">None</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {s.services.map((svc) => (
                              <Badge key={svc.serviceId} variant="secondary" className="text-xs">
                                {svc.serviceName}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {s.workingHours.length === 0 ? (
                          <span className="text-xs text-muted-foreground">Not set</span>
                        ) : (
                          <div className="flex gap-0.5">
                            {DAYS.map((day, i) => {
                              const wh = s.workingHours.find((h) => h.dayOfWeek === i);
                              return (
                                <span
                                  key={day}
                                  title={wh ? `${wh.startTime}–${wh.endTime}` : "Off"}
                                  className={[
                                    "flex h-5 w-5 items-center justify-center rounded text-[10px] font-medium",
                                    wh ? "bg-primary/10 text-primary" : "text-muted-foreground/30",
                                  ].join(" ")}
                                >
                                  {day[0]}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {s.commissionRate ? `${s.commissionRate}%` : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs">{s.accessLevel}</Badge>
                      </TableCell>
                      <TableCell>
                        <StaffProfileDialog
                          staff={s}
                          services={typedServices}
                          tenantSlug={tenantSlug}
                          tenantId={tenant.id}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Services tab */}
      {tab === "services" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{typedServices.length} Services</CardTitle>
            <AddServiceDialog tenantSlug={tenantSlug} tenantId={tenant.id} />
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {typedServices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No services yet. Add the services your business offers.
                    </TableCell>
                  </TableRow>
                ) : (
                  typedServices.map((svc) => (
                    <TableRow key={svc.id}>
                      <TableCell className="font-medium">{svc.name}</TableCell>
                      <TableCell className="text-muted-foreground">{svc.description ?? "—"}</TableCell>
                      <TableCell className="text-right">{svc.duration} min</TableCell>
                      <TableCell className="text-right">
                        ₱{Number(svc.price).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <DeleteServiceButton
                          serviceId={svc.id}
                          tenantSlug={tenantSlug}
                          tenantId={tenant.id}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Schedule tab */}
      {tab === "schedule" && (
        <>
          {staffEmployees.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No active staff. Add employees in the HR module first.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Shift Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <StaffCalendar
                  shifts={typedShifts}
                  employees={staffEmployees}
                  tenantSlug={tenantSlug}
                  tenantId={tenant.id}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

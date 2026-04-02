import { prisma } from "@bizconnect/db";
import { getTenant } from "@/lib/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeeList, AddEmployeeDialog, AttendanceTab, LeaveTab, PayrollTab } from "@/modules/hr";
import type { Employee, AttendanceRecord, LeaveRequest, PayrollRecord } from "@/modules/hr";
import { StaffCalendar } from "@/modules/staff";
import type { StaffMember, Shift, StaffEmployee, Service } from "@/modules/staff";
import { UserCheck, UserX, Banknote, CalendarCheck } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface HRPageProps {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function HRPage({ params, searchParams }: HRPageProps) {
  const { tenant: tenantSlug } = await params;
  const { tab = "employees" } = await searchParams;
  const tenant = await getTenant(tenantSlug);

  const [employees, attendance, leaveRequests, payrollRecords, shifts, services] = await Promise.all([
    prisma.employee.findMany({
      where: { tenantId: tenant.id },
      orderBy: { name: "asc" },
      include: {
        services: { include: { service: { select: { id: true, name: true } } } },
        workingHours: { orderBy: { dayOfWeek: "asc" } },
      },
    }),
    prisma.attendance.findMany({
      where: { tenantId: tenant.id },
      include: { employee: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 50,
    }),
    prisma.leaveRequest.findMany({
      where: { tenantId: tenant.id },
      include: { employee: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payrollRecord.findMany({
      where: { tenantId: tenant.id },
      include: { employee: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.shift.findMany({
      where: { tenantId: tenant.id },
      include: { employee: { select: { name: true } } },
      orderBy: { startAt: "asc" },
    }),
    prisma.service.findMany({
      where: { tenantId: tenant.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true, duration: true, price: true, isActive: true, createdAt: true, tenantId: true },
    }),
  ]);

  const typedEmployees: Employee[] = employees.map((e) => ({
    ...e,
    salary: e.salary?.toString() ?? null,
    commissionRate: e.commissionRate?.toString() ?? null,
  }));

  const activeEmployees = typedEmployees.filter((e) => e.isActive);
  const activeCount = activeEmployees.length;
  const inactiveCount = typedEmployees.filter((e) => !e.isActive).length;
  const totalPayroll = employees
    .filter((e) => e.isActive && e.salary)
    .reduce((sum, e) => sum + Number(e.salary), 0);

  const typedAttendance: AttendanceRecord[] = attendance.map((a) => ({
    id: a.id,
    employeeId: a.employeeId,
    employeeName: a.employee.name,
    date: a.date,
    clockIn: a.clockIn,
    clockOut: a.clockOut,
    notes: a.notes,
  }));

  const typedLeave: LeaveRequest[] = leaveRequests.map((l) => ({
    id: l.id,
    employeeId: l.employeeId,
    employeeName: l.employee.name,
    type: l.type,
    startDate: l.startDate,
    endDate: l.endDate,
    reason: l.reason,
    status: l.status,
    createdAt: l.createdAt,
  }));

  const typedPayroll: PayrollRecord[] = payrollRecords.map((p) => ({
    id: p.id,
    employeeId: p.employeeId,
    employeeName: p.employee.name,
    periodStart: p.periodStart,
    periodEnd: p.periodEnd,
    baseSalary: p.baseSalary.toString(),
    commission: p.commission.toString(),
    deductions: p.deductions.toString(),
    netPay: p.netPay.toString(),
    status: p.status,
    notes: p.notes,
    createdAt: p.createdAt,
  }));

  const typedServices: Service[] = services.map((s) => ({ ...s, price: s.price.toString() }));

  const staffMembers: StaffMember[] = employees
    .filter((e) => e.isActive)
    .map((e) => ({
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

  const typedShifts: Shift[] = shifts.map((s) => ({
    id: s.id,
    employeeId: s.employeeId,
    employeeName: s.employee.name,
    title: s.title,
    startAt: s.startAt,
    endAt: s.endAt,
    notes: s.notes,
  }));

  const staffEmployees: StaffEmployee[] = employees
    .filter((e) => e.isActive)
    .map((e) => ({
      id: e.id,
      name: e.name,
      position: e.position,
      department: e.department,
      isActive: e.isActive,
    }));

  const tabs = [
    { key: "employees", label: "Employees" },
    { key: "schedule", label: "Schedule" },
    { key: "attendance", label: "Attendance" },
    { key: "leave", label: "Leave" },
    { key: "payroll", label: "Payroll" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">HR & Staff</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{employees.length} employees</p>
        </div>
        {tab === "employees" && (
          <AddEmployeeDialog tenantSlug={tenantSlug} tenantId={tenant.id} currencySymbol={tenant.currencySymbol} />
        )}
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="shadow-none border-zinc-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">Active</p>
                <p className="mt-1.5 text-2xl font-bold text-emerald-600">{activeCount}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                <UserCheck className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border-zinc-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">Inactive</p>
                <p className="mt-1.5 text-2xl font-bold text-zinc-900">{inactiveCount}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100">
                <UserX className="h-4 w-4 text-zinc-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border-zinc-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">Monthly Payroll</p>
                <p className="mt-1.5 text-2xl font-bold text-zinc-900">
                  {tenant.currencySymbol}{totalPayroll.toLocaleString(tenant.currencyLocale, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
                <Banknote className="h-4 w-4 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-zinc-200">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/${tenantSlug}/hr?tab=${t.key}`}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              tab === t.key
                ? "border-b-2 border-zinc-900 text-zinc-900"
                : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Employees tab */}
      {tab === "employees" && (
        <Card className="shadow-none border-zinc-200">
          <CardContent className="p-0">
            <EmployeeList
              employees={typedEmployees}
              staffMembers={staffMembers}
              services={typedServices}
              tenantSlug={tenantSlug}
              tenantId={tenant.id}
              currencySymbol={tenant.currencySymbol}
              currencyLocale={tenant.currencyLocale}
            />
          </CardContent>
        </Card>
      )}

      {/* Schedule tab */}
      {tab === "schedule" && (
        <>
          {staffEmployees.length === 0 ? (
            <Card className="shadow-none border-zinc-200">
              <CardContent className="py-12 text-center text-sm text-zinc-400">
                No active staff yet.
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-none border-zinc-200">
              <CardHeader className="border-b border-zinc-100 px-6 py-4">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4 text-zinc-400" />
                  <CardTitle className="text-sm font-semibold text-zinc-900">Shift Schedule</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
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


      {/* Attendance tab */}
      {tab === "attendance" && (
        <Card className="shadow-none border-zinc-200">
          <CardContent className="pt-4">
            <AttendanceTab
              employees={activeEmployees}
              records={typedAttendance}
              tenantSlug={tenantSlug}
              tenantId={tenant.id}
            />
          </CardContent>
        </Card>
      )}

      {/* Leave tab */}
      {tab === "leave" && (
        <Card className="shadow-none border-zinc-200">
          <CardContent className="pt-4">
            <LeaveTab
              employees={activeEmployees}
              requests={typedLeave}
              tenantSlug={tenantSlug}
              tenantId={tenant.id}
            />
          </CardContent>
        </Card>
      )}

      {/* Payroll tab */}
      {tab === "payroll" && (
        <Card className="shadow-none border-zinc-200">
          <CardContent className="pt-4">
            <PayrollTab
              employees={activeEmployees}
              records={typedPayroll}
              tenantSlug={tenantSlug}
              tenantId={tenant.id}
              currencySymbol={tenant.currencySymbol}
              currencyLocale={tenant.currencyLocale}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

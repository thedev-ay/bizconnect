import { prisma } from "@bizconnect/db";
import { getTenant } from "@/lib/tenant";
import { TopbarPageBridge } from "@/components/layout/topbar-page-bridge";
import { ContentPanel, PageShell } from "@/components/layout/page-shell";
import { EmployeeList, AddEmployeeDialog, AttendanceTab, LeaveTab, PayrollTab } from "@/modules/hr";
import type { Employee, AttendanceRecord, LeaveRequest, PayrollRecord } from "@/modules/hr";
import { StaffCalendar } from "@/modules/staff";
import type { StaffMember, Shift, StaffEmployee, Service } from "@/modules/staff";
import { CalendarCheck } from "lucide-react";
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
      where: { tenantId: tenant.id, availableForAppointments: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        duration: true,
        price: true,
        isActive: true,
        availableForAppointments: true,
        availableForJobOrders: true,
        createdAt: true,
        tenantId: true,
      },
    }),
  ]);

  const typedEmployees: Employee[] = employees.map((e) => ({
    ...e,
    salary: e.salary?.toString() ?? null,
    commissionRate: e.commissionRate?.toString() ?? null,
  }));

  const activeEmployees = typedEmployees.filter((e) => e.isActive);
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
    <PageShell className="h-auto min-h-full">
      <TopbarPageBridge title="Staff" description={`${employees.length} total`} />
      {tab === "employees" ? (
        <AddEmployeeDialog tenantSlug={tenantSlug} tenantId={tenant.id} currencySymbol={tenant.currencySymbol} showTrigger={false} />
      ) : null}

      <ContentPanel className="space-y-4 p-0">
      <div className="flex gap-1 border-b border-border/60 px-4 pt-3">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/${tenantSlug}/hr?tab=${t.key}`}
            className={cn(
              "rounded-t-2xl px-4 py-2 text-sm font-medium transition-colors",
              tab === t.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Employees tab */}
      {tab === "employees" && (
        <div className="px-0 pb-0">
            <EmployeeList
              employees={typedEmployees}
              staffMembers={staffMembers}
              services={typedServices}
              tenantSlug={tenantSlug}
              tenantId={tenant.id}
              currencySymbol={tenant.currencySymbol}
              currencyLocale={tenant.currencyLocale}
            />
        </div>
      )}

      {/* Schedule tab */}
      {tab === "schedule" && (
        <>
          {staffEmployees.length === 0 ? (
            <div className="rounded-[24px] border border-border/70 px-4 py-12 text-center text-sm text-muted-foreground">
                No active staff yet.
            </div>
          ) : (
            <div className="overflow-hidden rounded-[28px] border border-border/70 bg-background/90">
              <div className="border-b border-border/60 px-6 py-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <CalendarCheck className="h-4 w-4 text-zinc-400" />
                  Shift Schedule
                </div>
              </div>
              <div className="pt-4">
                <StaffCalendar
                  shifts={typedShifts}
                  employees={staffEmployees}
                  tenantSlug={tenantSlug}
                  tenantId={tenant.id}
                />
              </div>
            </div>
          )}
        </>
      )}


      {/* Attendance tab */}
      {tab === "attendance" && (
        <div className="px-4 pb-4">
            <AttendanceTab
              employees={activeEmployees}
              records={typedAttendance}
              tenantSlug={tenantSlug}
              tenantId={tenant.id}
            />
        </div>
      )}

      {/* Leave tab */}
      {tab === "leave" && (
        <div className="px-4 pb-4">
            <LeaveTab
              employees={activeEmployees}
              requests={typedLeave}
              tenantSlug={tenantSlug}
              tenantId={tenant.id}
            />
        </div>
      )}

      {/* Payroll tab */}
      {tab === "payroll" && (
        <div className="px-4 pb-4">
            <PayrollTab
              employees={activeEmployees}
              records={typedPayroll}
              tenantSlug={tenantSlug}
              tenantId={tenant.id}
              currencySymbol={tenant.currencySymbol}
              currencyLocale={tenant.currencyLocale}
            />
        </div>
      )}
      </ContentPanel>
    </PageShell>
  );
}

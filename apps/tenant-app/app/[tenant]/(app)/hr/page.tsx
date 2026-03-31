import { prisma } from "@bizconnect/db";
import { getTenant } from "@/lib/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeeList, AddEmployeeDialog, AttendanceTab, LeaveTab, PayrollTab } from "@/modules/hr";
import type { Employee, AttendanceRecord, LeaveRequest, PayrollRecord } from "@/modules/hr";
import { Users, UserCheck, UserX } from "lucide-react";
import Link from "next/link";

interface HRPageProps {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function HRPage({ params, searchParams }: HRPageProps) {
  const { tenant: tenantSlug } = await params;
  const { tab = "employees" } = await searchParams;
  const tenant = await getTenant(tenantSlug);

  const [employees, attendance, leaveRequests, payrollRecords] = await Promise.all([
    prisma.employee.findMany({
      where: { tenantId: tenant.id },
      orderBy: { name: "asc" },
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

  const tabs = [
    { key: "employees", label: "Employees" },
    { key: "attendance", label: "Attendance" },
    { key: "leave", label: "Leave" },
    { key: "payroll", label: "Payroll" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">HR & Payroll</h1>
          <p className="text-muted-foreground">{employees.length} employees</p>
        </div>
        {tab === "employees" && (
          <AddEmployeeDialog tenantSlug={tenantSlug} tenantId={tenant.id} />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <UserCheck className="h-4 w-4 text-green-500" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{activeCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <UserX className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Inactive</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{inactiveCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Payroll</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₱{totalPayroll.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 border-b">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/${tenantSlug}/hr?tab=${t.key}`}
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

      <Card>
        <CardContent className={tab === "employees" ? "p-0" : "pt-4"}>
          {tab === "employees" && (
            <EmployeeList employees={typedEmployees} tenantSlug={tenantSlug} tenantId={tenant.id} />
          )}
          {tab === "attendance" && (
            <AttendanceTab
              employees={activeEmployees}
              records={typedAttendance}
              tenantSlug={tenantSlug}
              tenantId={tenant.id}
            />
          )}
          {tab === "leave" && (
            <LeaveTab
              employees={activeEmployees}
              requests={typedLeave}
              tenantSlug={tenantSlug}
              tenantId={tenant.id}
            />
          )}
          {tab === "payroll" && (
            <PayrollTab
              employees={activeEmployees}
              records={typedPayroll}
              tenantSlug={tenantSlug}
              tenantId={tenant.id}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

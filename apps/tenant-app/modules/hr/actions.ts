"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bizconnect/db";
import { authorize } from "@/lib/authorize";
import { createEmployeeSchema, type CreateEmployeeInput } from "./schema";

// ── Employees ────────────────────────────────────────────────────────────────

export async function createEmployee(tenantSlug: string, tenantId: string, input: CreateEmployeeInput) {
  await authorize(tenantSlug, "hr.view");
  const parsed = createEmployeeSchema.parse(input);
  const count = await prisma.employee.count({ where: { tenantId } });
  const employeeNo = parsed.employeeNo || `EMP-${String(count + 1).padStart(4, "0")}`;

  const employee = await prisma.employee.create({
    data: {
      tenantId,
      name: parsed.name,
      email: parsed.email || null,
      phone: parsed.phone || null,
      position: parsed.position || null,
      department: parsed.department || null,
      employeeNo,
      hireDate: parsed.hireDate ? new Date(parsed.hireDate) : null,
      salary: parsed.salary ?? null,
      isActive: true,
    },
  });

  revalidatePath(`/${tenantSlug}/hr`);
  return employee;
}

export async function deactivateEmployee(tenantSlug: string, tenantId: string, employeeId: string) {
  await authorize(tenantSlug, "hr.view");
  await prisma.employee.update({ where: { id: employeeId, tenantId }, data: { isActive: false } });
  revalidatePath(`/${tenantSlug}/hr`);
}

export async function reactivateEmployee(tenantSlug: string, tenantId: string, employeeId: string) {
  await authorize(tenantSlug, "hr.view");
  await prisma.employee.update({ where: { id: employeeId, tenantId }, data: { isActive: true } });
  revalidatePath(`/${tenantSlug}/hr`);
}

// ── Attendance ────────────────────────────────────────────────────────────────

export async function clockIn(tenantSlug: string, tenantId: string, employeeId: string, date: string) {
  await authorize(tenantSlug, "hr.attendance");
  await prisma.attendance.upsert({
    where: { employeeId_date: { employeeId, date: new Date(date) } },
    update: { clockIn: new Date() },
    create: { tenantId, employeeId, date: new Date(date), clockIn: new Date() },
  });
  revalidatePath(`/${tenantSlug}/hr`);
}

export async function clockOut(tenantSlug: string, tenantId: string, employeeId: string, date: string) {
  await authorize(tenantSlug, "hr.attendance");
  await prisma.attendance.upsert({
    where: { employeeId_date: { employeeId, date: new Date(date) } },
    update: { clockOut: new Date() },
    create: { tenantId, employeeId, date: new Date(date), clockOut: new Date() },
  });
  revalidatePath(`/${tenantSlug}/hr`);
}

export async function logAttendance(
  tenantSlug: string,
  tenantId: string,
  employeeId: string,
  date: string,
  clockIn: string,
  clockOut?: string,
  notes?: string
) {
  await authorize(tenantSlug, "hr.attendance");
  await prisma.attendance.upsert({
    where: { employeeId_date: { employeeId, date: new Date(date) } },
    update: { clockIn: new Date(clockIn), clockOut: clockOut ? new Date(clockOut) : null, notes: notes || null },
    create: {
      tenantId,
      employeeId,
      date: new Date(date),
      clockIn: new Date(clockIn),
      clockOut: clockOut ? new Date(clockOut) : null,
      notes: notes || null,
    },
  });
  revalidatePath(`/${tenantSlug}/hr`);
}

// ── Leave Requests ────────────────────────────────────────────────────────────

export async function createLeaveRequest(
  tenantSlug: string,
  tenantId: string,
  input: { employeeId: string; type: string; startDate: string; endDate: string; reason?: string }
) {
  await authorize(tenantSlug, "hr.leave");
  await prisma.leaveRequest.create({
    data: {
      tenantId,
      employeeId: input.employeeId,
      type: input.type,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      reason: input.reason || null,
      status: "pending",
    },
  });
  revalidatePath(`/${tenantSlug}/hr`);
}

export async function updateLeaveStatus(
  tenantSlug: string,
  tenantId: string,
  leaveId: string,
  status: "approved" | "rejected"
) {
  await authorize(tenantSlug, "hr.leave");
  await prisma.leaveRequest.update({ where: { id: leaveId, tenantId }, data: { status } });
  revalidatePath(`/${tenantSlug}/hr`);
}

// ── Payroll ────────────────────────────────────────────────────────────────────

export async function generatePayroll(
  tenantSlug: string,
  tenantId: string,
  employeeId: string,
  periodStart: string,
  periodEnd: string,
  deductions: number,
  notes?: string
) {
  await authorize(tenantSlug, "hr.payroll");

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId, tenantId },
    select: { salary: true, commissionRate: true },
  });
  if (!employee) throw new Error("Employee not found");

  const baseSalary = Number(employee.salary ?? 0);

  // Calculate commission from completed appointments in this period
  const completedAppts = await prisma.appointment.findMany({
    where: {
      employeeId,
      tenantId,
      status: "done",
      startAt: { gte: new Date(periodStart), lte: new Date(periodEnd) },
      serviceId: { not: null },
    },
    include: { service: { select: { price: true } } },
  });

  const totalServiceRevenue = completedAppts.reduce(
    (sum, a) => sum + Number(a.service?.price ?? 0),
    0
  );
  const commission = (totalServiceRevenue * Number(employee.commissionRate ?? 0)) / 100;
  const netPay = baseSalary + commission - deductions;

  await prisma.payrollRecord.create({
    data: {
      tenantId,
      employeeId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      baseSalary,
      commission,
      deductions,
      netPay,
      notes: notes || null,
      status: "draft",
    },
  });

  revalidatePath(`/${tenantSlug}/hr`);
}

export async function updatePayrollStatus(
  tenantSlug: string,
  tenantId: string,
  payrollId: string,
  status: "processed" | "paid"
) {
  await authorize(tenantSlug, "hr.payroll");
  await prisma.payrollRecord.update({ where: { id: payrollId, tenantId }, data: { status } });
  revalidatePath(`/${tenantSlug}/hr`);
}

export async function deletePayrollRecord(tenantSlug: string, tenantId: string, payrollId: string) {
  await authorize(tenantSlug, "hr.payroll");
  await prisma.payrollRecord.delete({ where: { id: payrollId, tenantId } });
  revalidatePath(`/${tenantSlug}/hr`);
}

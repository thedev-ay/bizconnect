"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bizconnect/db";
import { authorize } from "@/lib/authorize";
import { unstable_update } from "@/lib/auth";
import { branchSchema, employeeBranchAssignmentSchema, type BranchInput, type EmployeeBranchAssignmentInput } from "./schema";

// ── Branch CRUD ───────────────────────────────────────────────────────────────

export async function getBranches(tenantSlug: string) {
  const session = await authorize(tenantSlug);
  return prisma.branch.findMany({
    where: { tenantId: session.user.tenantId, isActive: true },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      address: true,
      phone: true,
      email: true,
      isActive: true,
      createdAt: true,
    },
  });
}

export async function createBranch(tenantSlug: string, input: BranchInput) {
  const session = await authorize(tenantSlug);
  const parsed = branchSchema.parse(input);

  const existing = await prisma.branch.findFirst({
    where: { tenantId: session.user.tenantId, slug: parsed.slug },
  });
  if (existing) throw new Error("A branch with this slug already exists");

  const branch = await prisma.branch.create({
    data: {
      tenantId: session.user.tenantId,
      slug: parsed.slug,
      name: parsed.name,
      address: parsed.address || null,
      phone: parsed.phone || null,
      email: parsed.email || null,
    },
  });

  revalidatePath(`/${tenantSlug}/branches`);
  return branch;
}

export async function updateBranch(tenantSlug: string, branchId: string, input: BranchInput) {
  const session = await authorize(tenantSlug);
  const parsed = branchSchema.parse(input);

  const branch = await prisma.branch.update({
    where: { id: branchId, tenantId: session.user.tenantId },
    data: {
      name: parsed.name,
      slug: parsed.slug,
      address: parsed.address || null,
      phone: parsed.phone || null,
      email: parsed.email || null,
    },
  });

  revalidatePath(`/${tenantSlug}/branches`);
  return branch;
}

export async function deactivateBranch(tenantSlug: string, branchId: string) {
  const session = await authorize(tenantSlug);

  const count = await prisma.branch.count({
    where: { tenantId: session.user.tenantId, isActive: true },
  });
  if (count <= 1) throw new Error("Cannot deactivate the last active branch");

  await prisma.branch.update({
    where: { id: branchId, tenantId: session.user.tenantId },
    data: { isActive: false },
  });

  revalidatePath(`/${tenantSlug}/branches`);
}

// ── Branch switching ──────────────────────────────────────────────────────────

export async function switchBranch(tenantSlug: string, branchId: string) {
  const session = await authorize(tenantSlug);

  const branch = await prisma.branch.findFirst({
    where: { id: branchId, tenantId: session.user.tenantId, isActive: true },
    select: { id: true, name: true, slug: true },
  });
  if (!branch) throw new Error("Branch not found");

  await unstable_update({ currentBranchId: branchId });
  revalidatePath(`/${tenantSlug}`, "layout");
  return branch;
}

// ── Employee branch assignments ───────────────────────────────────────────────

export async function assignEmployeeToBranch(
  tenantSlug: string,
  input: EmployeeBranchAssignmentInput
) {
  const session = await authorize(tenantSlug);
  const parsed = employeeBranchAssignmentSchema.parse(input);

  // Verify employee and branch belong to this tenant
  const [employee, branch] = await Promise.all([
    prisma.employee.findFirst({
      where: { id: parsed.employeeId, tenantId: session.user.tenantId },
    }),
    prisma.branch.findFirst({
      where: { id: parsed.branchId, tenantId: session.user.tenantId },
    }),
  ]);
  if (!employee) throw new Error("Employee not found");
  if (!branch) throw new Error("Branch not found");

  const assignment = await prisma.employeeBranchAssignment.create({
    data: {
      employeeId: parsed.employeeId,
      branchId: parsed.branchId,
      startDate: new Date(parsed.startDate),
      endDate: parsed.endDate ? new Date(parsed.endDate) : null,
      notes: parsed.notes || null,
    },
  });

  revalidatePath(`/${tenantSlug}/hr`);
  return assignment;
}

export async function endEmployeeBranchAssignment(
  tenantSlug: string,
  assignmentId: string
) {
  await authorize(tenantSlug);
  await prisma.employeeBranchAssignment.update({
    where: { id: assignmentId },
    data: { endDate: new Date() },
  });
  revalidatePath(`/${tenantSlug}/hr`);
}

export async function setEmployeeHomeBranch(
  tenantSlug: string,
  employeeId: string,
  homeBranchId: string | null
) {
  const session = await authorize(tenantSlug);

  if (homeBranchId) {
    const branch = await prisma.branch.findFirst({
      where: { id: homeBranchId, tenantId: session.user.tenantId, isActive: true },
    });
    if (!branch) throw new Error("Branch not found");
  }

  await prisma.employee.update({
    where: { id: employeeId, tenantId: session.user.tenantId },
    data: { homeBranchId },
  });

  revalidatePath(`/${tenantSlug}/hr`);
}

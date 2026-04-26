"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bizconnect/db";
import type { Prisma } from "@bizconnect/db";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { createUserSchema, updateUserSchema, userGroupSchema } from "./schema";
import type { CreateUserInput, UpdateUserInput, UserGroupInput } from "./schema";

async function getAuthorizedSession(tenantSlug: string) {
  const session = await auth();
  if (!session?.user || session.user.tenantSlug !== tenantSlug) {
    throw new Error("Unauthorized");
  }
  if (session.user.role !== "owner" && session.user.role !== "admin") {
    throw new Error("Insufficient permissions");
  }
  return session;
}

function normalizeUserGroupId(userGroupId: string | null | undefined) {
  return userGroupId ? userGroupId : null;
}

async function ensureGroupBelongsToTenant(tenantId: string, userGroupId: string | null) {
  if (!userGroupId) return null;

  const group = await prisma.userGroup.findFirst({
    where: { id: userGroupId, tenantId },
    select: { id: true },
  });

  if (!group) throw new Error("Invalid user group");
  return group.id;
}

function asJsonPermissions(permissions: Record<string, boolean>): Prisma.InputJsonValue {
  return permissions as Prisma.InputJsonValue;
}

export async function createUser(tenantSlug: string, tenantId: string, input: CreateUserInput) {
  await getAuthorizedSession(tenantSlug);

  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid input");

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) throw new Error("Email already in use");

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  // Owners and admins bypass permission checks — don't store permissions for them
  const userGroupId =
    parsed.data.role === "member"
      ? await ensureGroupBelongsToTenant(tenantId, normalizeUserGroupId(parsed.data.userGroupId))
      : null;
  const permissions =
    parsed.data.role === "member" && !userGroupId
      ? asJsonPermissions(parsed.data.permissions)
      : asJsonPermissions({});

  const user = await prisma.user.create({
    data: {
      tenantId,
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash,
      role: parsed.data.role,
      permissions,
      userGroupId,
    },
  });

  revalidatePath(`/${tenantSlug}/users`);
  return user;
}

export async function updateUser(
  tenantSlug: string,
  tenantId: string,
  userId: string,
  input: UpdateUserInput
) {
  await getAuthorizedSession(tenantSlug);

  const parsed = updateUserSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid input");

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;
  if (parsed.data.role !== undefined) {
    data.role = parsed.data.role;
    // Clearing permissions when role is promoted to owner/admin
    if (parsed.data.role !== "member") {
      data.permissions = asJsonPermissions({});
      data.userGroupId = null;
    }
  }
  if (
    parsed.data.permissions !== undefined &&
    parsed.data.role !== "owner" &&
    parsed.data.role !== "admin"
  ) {
    data.permissions = asJsonPermissions(parsed.data.permissions);
  }
  if (
    parsed.data.userGroupId !== undefined &&
    parsed.data.role !== "owner" &&
    parsed.data.role !== "admin"
  ) {
    const userGroupId = await ensureGroupBelongsToTenant(
      tenantId,
      normalizeUserGroupId(parsed.data.userGroupId)
    );
    data.userGroupId = userGroupId;
    if (userGroupId) {
      data.permissions = asJsonPermissions({});
    }
  }

  const user = await prisma.user.update({
    where: { id: userId, tenantId },
    data,
  });

  revalidatePath(`/${tenantSlug}/users`);
  return user;
}

export async function deleteUser(tenantSlug: string, tenantId: string, userId: string) {
  const session = await getAuthorizedSession(tenantSlug);

  if (session.user.id === userId) throw new Error("Cannot delete your own account");

  await prisma.user.delete({ where: { id: userId, tenantId } });
  revalidatePath(`/${tenantSlug}/users`);
}

export async function createUserGroup(tenantSlug: string, tenantId: string, input: UserGroupInput) {
  await getAuthorizedSession(tenantSlug);

  const parsed = userGroupSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid input");

  await prisma.userGroup.create({
    data: {
      tenantId,
      name: parsed.data.name.trim(),
      description: parsed.data.description?.trim() || null,
      permissions: asJsonPermissions(parsed.data.permissions),
    },
  });

  revalidatePath(`/${tenantSlug}/users`);
}

export async function updateUserGroup(
  tenantSlug: string,
  tenantId: string,
  userGroupId: string,
  input: UserGroupInput
) {
  await getAuthorizedSession(tenantSlug);

  const parsed = userGroupSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid input");

  await prisma.userGroup.update({
    where: { id: userGroupId, tenantId },
    data: {
      name: parsed.data.name.trim(),
      description: parsed.data.description?.trim() || null,
      permissions: asJsonPermissions(parsed.data.permissions),
    },
  });

  revalidatePath(`/${tenantSlug}/users`);
}

export async function deleteUserGroup(tenantSlug: string, tenantId: string, userGroupId: string) {
  await getAuthorizedSession(tenantSlug);

  const assignedUsers = await prisma.user.count({
    where: { tenantId, userGroupId },
  });

  if (assignedUsers > 0) {
    throw new Error("Move users out of this group before deleting it");
  }

  await prisma.userGroup.delete({
    where: { id: userGroupId, tenantId },
  });

  revalidatePath(`/${tenantSlug}/users`);
}

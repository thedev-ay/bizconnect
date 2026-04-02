"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bizconnect/db";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { createUserSchema, updateUserSchema } from "./schema";
import type { CreateUserInput, UpdateUserInput } from "./schema";

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

export async function createUser(tenantSlug: string, tenantId: string, input: CreateUserInput) {
  await getAuthorizedSession(tenantSlug);

  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid input");

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) throw new Error("Email already in use");

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  // Owners and admins bypass permission checks — don't store permissions for them
  const permissions = parsed.data.role === "member" ? parsed.data.permissions : {};

  const user = await prisma.user.create({
    data: {
      tenantId,
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash,
      role: parsed.data.role,
      permissions,
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
    if (parsed.data.role !== "member") data.permissions = {};
  }
  if (parsed.data.permissions !== undefined && parsed.data.role !== "owner" && parsed.data.role !== "admin") {
    data.permissions = parsed.data.permissions;
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

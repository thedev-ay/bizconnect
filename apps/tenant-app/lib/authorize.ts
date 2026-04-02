"use server";

import { auth } from "@/lib/auth";
import { isPrivilegedRole, hasPermission } from "@/lib/permissions";

/**
 * Verifies the session belongs to the given tenant and optionally checks
 * a specific permission key (e.g. "pos.void").
 *
 * Owners and admins bypass permission checks entirely.
 * Throws if unauthorized or missing permission.
 */
export async function authorize(tenantSlug: string, permission?: string) {
  const session = await auth();
  if (!session?.user || session.user.tenantSlug !== tenantSlug) {
    throw new Error("Unauthorized");
  }
  if (permission && !isPrivilegedRole(session.user.role)) {
    const perms = session.user.permissions ?? {};
    if (!hasPermission(perms, permission)) {
      throw new Error("Insufficient permissions");
    }
  }
  return session;
}

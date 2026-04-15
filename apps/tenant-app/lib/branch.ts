import { auth } from "@/lib/auth";

/**
 * Returns the active branch ID from the current session JWT, or null if none is set.
 * Safe to call from server components, server actions, and route handlers.
 */
export async function getActiveBranchId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.currentBranchId ?? null;
}

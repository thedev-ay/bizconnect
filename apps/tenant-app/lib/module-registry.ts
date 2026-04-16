import { prisma } from "@bizconnect/db";
import { cache } from "react";
import { unstable_cache } from "next/cache";

export type ModuleSlug =
  | "users"
  | "inventory"
  | "pos"
  | "promotions"
  | "services"
  | "appointments"
  | "billing"
  | "hr"
  | "reports"
  | "job-orders"
  | "crm"
  | "assets"
  | "loyalty";

export interface ActiveModule {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  isCore: boolean;
}

/**
 * Returns all active modules for a tenant.
 *
 * Wrapped in React's cache() so it is computed at most once per request even if
 * called from middleware, layout, and multiple server components simultaneously.
 */
export const getActiveModules = cache(async (tenantSlug: string): Promise<ActiveModule[]> => {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug, isActive: true },
    select: {
      tenantModules: {
        where: { isEnabled: true },
        select: {
          module: {
            select: {
              id: true,
              slug: true,
              name: true,
              icon: true,
              sortOrder: true,
              isCore: true,
            },
          },
        },
        orderBy: { module: { sortOrder: "asc" } },
      },
    },
  });

  if (!tenant) return [];

  return tenant.tenantModules.map((tm) => tm.module);
});

/**
 * Returns the set of enabled module slugs for a tenant.
 * Cached across requests with unstable_cache — one DB query instead of two,
 * served from cache on subsequent requests until revalidated via
 * revalidateTag(`tenant-modules:${tenantSlug}`) when modules are toggled.
 */
const getEnabledModuleSlugs = (tenantSlug: string) =>
  unstable_cache(
    async () => {
      const rows = await prisma.tenantModule.findMany({
        where: { tenant: { slug: tenantSlug, isActive: true }, isEnabled: true },
        select: { module: { select: { slug: true, isCore: true } } },
      });
      return rows.map((r) => r.module.slug);
    },
    [`tenant-modules:${tenantSlug}`],
    { tags: [`tenant-modules:${tenantSlug}`], revalidate: 60 }
  )();

export async function tenantHasModule(tenantSlug: string, moduleSlug: string): Promise<boolean> {
  const slugs = await getEnabledModuleSlugs(tenantSlug);
  return slugs.includes(moduleSlug);
}

/**
 * Maps URL route segments to module slugs.
 * Update this map when adding new modules — the only required code change.
 */
export const ROUTE_SEGMENT_TO_MODULE: Record<string, ModuleSlug> = {
  inventory: "inventory",
  pos: "pos",
  appointments: "appointments",
  billing: "billing",
  hr: "hr",
  reports: "reports",
  "job-orders": "job-orders",
  crm: "crm",
  assets: "assets",
  promotions: "promotions",
  services: "services",
  loyalty: "loyalty",
  // "sales" is intentionally excluded — it's a derived route, not a DB module.
  // Visibility is controlled in the sidebar. No proxy guard needed.
  // "users" and "dashboard" are always accessible — not listed here
};

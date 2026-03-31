import { prisma } from "@bizconnect/db";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";

const fetchTenant = unstable_cache(
  async (slug: string) => {
    return prisma.tenant.findUnique({
      where: { slug, isActive: true },
      select: { id: true, slug: true, name: true, plan: true, logoUrl: true },
    });
  },
  ["tenant"],
  { tags: ["tenant"], revalidate: 300 }
);

// React cache() dedupes within a single render tree on top of unstable_cache
export const getTenant = cache(async (slug: string) => {
  const tenant = await fetchTenant(slug);
  if (!tenant) notFound();
  return tenant;
});

export type TenantInfo = Awaited<ReturnType<typeof getTenant>>;

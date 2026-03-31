import { NextResponse } from "next/server";
import { prisma } from "@bizconnect/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const createTenantSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  plan: z.enum(["starter", "growth", "enterprise"]).default("starter"),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { users: true, tenantModules: { where: { isEnabled: true } } } },
    },
  });

  return NextResponse.json(tenants);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createTenantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, slug, plan } = parsed.data;

  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
  }

  // Create tenant and activate core modules automatically
  const tenant = await prisma.$transaction(async (tx) => {
    const newTenant = await tx.tenant.create({
      data: { name, slug, plan },
    });

    // Auto-activate the "users" core module
    const usersModule = await tx.module.findUnique({ where: { slug: "users" } });
    if (usersModule) {
      await tx.tenantModule.create({
        data: {
          tenantId: newTenant.id,
          moduleId: usersModule.id,
          isEnabled: true,
        },
      });
    }

    return newTenant;
  });

  return NextResponse.json(tenant, { status: 201 });
}

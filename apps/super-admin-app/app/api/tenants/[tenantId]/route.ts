import { NextResponse } from "next/server";
import { prisma } from "@bizconnect/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const updateTenantSchema = z.object({
  name: z.string().min(2).optional(),
  plan: z.enum(["starter", "growth", "enterprise"]).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tenantId } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      users: { select: { id: true, name: true, email: true, role: true, isActive: true } },
      tenantModules: {
        include: { module: true },
        orderBy: { module: { sortOrder: "asc" } },
      },
    },
  });

  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(tenant);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tenantId } = await params;

  const body = await req.json();
  const parsed = updateTenantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: parsed.data,
  });

  return NextResponse.json(tenant);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tenantId } = await params;

  await prisma.tenant.delete({ where: { id: tenantId } });
  return new NextResponse(null, { status: 204 });
}

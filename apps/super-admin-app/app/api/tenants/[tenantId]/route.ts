import { NextResponse } from "next/server";
import { prisma } from "@bizconnect/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const updateTenantSchema = z.object({
  name: z.string().min(2).optional(),
  plan: z.enum(["starter", "growth", "enterprise"]).optional(),
  isActive: z.boolean().optional(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  website: z.string().url().optional().or(z.literal("")).nullable(),
  industry: z.string().optional().nullable(),
  companySize: z.string().optional().nullable(),
  tags: z.union([z.array(z.string()), z.string()]).optional(),
});

function normalizeOptionalText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeTags(value?: string[] | string) {
  const rawTags = Array.isArray(value) ? value : value?.split(",") ?? [];
  return Array.from(
    new Set(
      rawTags
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

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

  const {
    address,
    phone,
    email,
    website,
    industry,
    companySize,
    tags,
    ...directUpdates
  } = parsed.data;

  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      ...directUpdates,
      ...(address !== undefined ? { address: normalizeOptionalText(address) } : {}),
      ...(phone !== undefined ? { phone: normalizeOptionalText(phone) } : {}),
      ...(email !== undefined ? { email: normalizeOptionalText(email) } : {}),
      ...(website !== undefined ? { website: normalizeOptionalText(website) } : {}),
      ...(industry !== undefined ? { industry: normalizeOptionalText(industry) } : {}),
      ...(companySize !== undefined ? { companySize: normalizeOptionalText(companySize) } : {}),
      ...(tags !== undefined ? { tags: normalizeTags(tags) } : {}),
    },
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

import { NextResponse } from "next/server";
import { prisma } from "@bizconnect/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const toggleSchema = z.object({
  moduleId: z.string(),
  isEnabled: z.boolean(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tenantId } = await params;

  const body = await req.json();
  const parsed = toggleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { moduleId, isEnabled } = parsed.data;

  // Prevent disabling core modules
  const module = await prisma.module.findUnique({ where: { id: moduleId } });
  if (!module) return NextResponse.json({ error: "Module not found" }, { status: 404 });
  if (module.isCore && !isEnabled) {
    return NextResponse.json(
      { error: `The "${module.name}" module is a core module and cannot be disabled.` },
      { status: 400 }
    );
  }

  const tenantModule = await prisma.tenantModule.upsert({
    where: { tenantId_moduleId: { tenantId, moduleId } },
    update: {
      isEnabled,
      disabledAt: isEnabled ? null : new Date(),
      enabledAt: isEnabled ? new Date() : undefined,
    },
    create: { tenantId, moduleId, isEnabled },
    include: { module: true },
  });

  return NextResponse.json(tenantModule);
}

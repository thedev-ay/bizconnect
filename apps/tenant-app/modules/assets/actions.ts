"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bizconnect/db";
import { authorize } from "@/lib/authorize";
import { getActiveBranchId } from "@/lib/branch";
import { createAssetSchema, type CreateAssetInput } from "./schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

function assertAssetsEnabled(modules: string[]) {
  if (!modules.includes("assets")) {
    throw new Error("Assets module is not enabled for this tenant");
  }
}

async function ensureCustomer(tenantId: string, customerId: string) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId },
    select: { id: true },
  });
  if (!customer) throw new Error("Customer not found");
  return customer;
}

async function ensureBranch(tenantId: string, branchId: string | null) {
  if (!branchId) return null;
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, tenantId, isActive: true },
    select: { id: true },
  });
  if (!branch) throw new Error("Branch not found");
  return branch;
}

export async function createAsset(tenantSlug: string, tenantId: string, input: CreateAssetInput) {
  const session = await authorize(tenantSlug, "crm.edit");
  assertAssetsEnabled(session.user.modules);
  const parsed = createAssetSchema.parse(input);
  const activeBranchId = await getActiveBranchId();
  const branchId = parsed.branchId || activeBranchId || null;

  await Promise.all([
    ensureCustomer(tenantId, parsed.customerId),
    ensureBranch(tenantId, branchId),
  ]);

  const created = await db.asset.create({
    data: {
      tenantId,
      branchId,
      customerId: parsed.customerId,
      name: parsed.name,
      assetType: parsed.assetType,
      brand: parsed.brand || null,
      model: parsed.model || null,
      identifier: parsed.identifier || null,
      serialNo: parsed.serialNo || null,
      status: parsed.status,
      notes: parsed.notes || null,
    },
  });

  revalidatePath(`/${tenantSlug}/crm`);
  revalidatePath(`/${tenantSlug}/job-orders`);
  return created;
}

export async function updateAsset(
  tenantSlug: string,
  tenantId: string,
  assetId: string,
  input: CreateAssetInput
) {
  const session = await authorize(tenantSlug, "crm.edit");
  assertAssetsEnabled(session.user.modules);
  const parsed = createAssetSchema.parse(input);
  const branchId = parsed.branchId || null;

  await Promise.all([
    ensureCustomer(tenantId, parsed.customerId),
    ensureBranch(tenantId, branchId),
  ]);

  const updated = await db.asset.update({
    where: { id: assetId, tenantId },
    data: {
      branchId,
      customerId: parsed.customerId,
      name: parsed.name,
      assetType: parsed.assetType,
      brand: parsed.brand || null,
      model: parsed.model || null,
      identifier: parsed.identifier || null,
      serialNo: parsed.serialNo || null,
      status: parsed.status,
      notes: parsed.notes || null,
    },
  });

  revalidatePath(`/${tenantSlug}/crm`);
  revalidatePath(`/${tenantSlug}/job-orders`);
  return updated;
}

export async function deleteAsset(tenantSlug: string, tenantId: string, assetId: string) {
  const session = await authorize(tenantSlug, "crm.edit");
  assertAssetsEnabled(session.user.modules);

  const linkedJobs = await db.jobOrder.count({
    where: { tenantId, assetId },
  });

  if (linkedJobs > 0) {
    throw new Error("Archive this asset instead of deleting it because it has linked job orders.");
  }

  await db.asset.delete({
    where: { id: assetId, tenantId },
  });

  revalidatePath(`/${tenantSlug}/crm`);
  revalidatePath(`/${tenantSlug}/job-orders`);
}

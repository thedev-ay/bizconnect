import { z } from "zod";

export const createAssetSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  branchId: z.string().optional(),
  name: z.string().min(1, "Asset name is required"),
  assetType: z.string().min(1, "Asset type is required"),
  brand: z.string().optional(),
  model: z.string().optional(),
  identifier: z.string().optional(),
  serialNo: z.string().optional(),
  status: z.enum(["active", "inactive", "archived"]).default("active"),
  notes: z.string().optional(),
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;

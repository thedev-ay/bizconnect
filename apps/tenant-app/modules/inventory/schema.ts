import { z } from "zod";

export const createItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().optional(),
  description: z.string().optional(),
  quantity: z.coerce.number().int().min(0).default(0),
  reorderAt: z.coerce.number().int().min(0).default(0),
  unitCost: z.coerce.number().min(0, "Cost must be positive"),
  unitPrice: z.coerce.number().min(0, "Price must be positive"),
  categoryId: z.string().optional(),
});

export const updateItemSchema = createItemSchema.partial();

export const adjustStockSchema = z.object({
  quantity: z.coerce.number().int(),
  reason: z.string().optional(),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;

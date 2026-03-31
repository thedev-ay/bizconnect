import { z } from "zod";

export const saleItemSchema = z.object({
  itemId: z.string(),
  name: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
  total: z.number().positive(),
});

export const createSaleSchema = z.object({
  items: z.array(saleItemSchema).min(1, "Cart cannot be empty"),
  subtotal: z.number().positive(),
  discount: z.number().min(0).default(0),
  total: z.number().positive(),
  amountPaid: z.number().positive(),
  paymentMethod: z.enum(["cash", "card", "gcash", "maya"]).default("cash"),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;

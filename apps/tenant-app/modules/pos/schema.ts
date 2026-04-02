import { z } from "zod";

export const saleItemSchema = z.object({
  itemId: z.string().optional(),
  itemType: z.enum(["product", "service"]).default("product"),
  name: z.string(),
  quantity: z.number().positive(),
  weight: z.number().positive().optional(),
  unitPrice: z.number().min(0),
  originalPrice: z.number().min(0),
  promoDiscount: z.number().min(0).default(0),
  total: z.number().min(0),
});

export const createSaleSchema = z.object({
  items: z.array(saleItemSchema).min(1, "Cart cannot be empty"),
  subtotal: z.number().min(0),
  discount: z.number().min(0).default(0),
  total: z.number().min(0),
  amountPaid: z.number().min(0),
  paymentMethod: z.enum(["cash", "card", "gcash", "maya"]).default("cash"),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;

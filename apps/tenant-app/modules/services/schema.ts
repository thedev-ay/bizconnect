import { z } from "zod";

export const serviceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  pricingType: z.enum(["per_piece", "per_kilo", "flat"]),
  price: z.coerce.number().min(0, "Price must be positive"),
  category: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const updateServiceSchema = serviceSchema.partial();

export type ServiceInput = z.infer<typeof serviceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

import { z } from "zod";

const optionalDurationSchema = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  z.coerce.number().int().positive("Duration must be at least 1 minute").nullable()
);

export const serviceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  duration: optionalDurationSchema,
  pricingType: z.enum(["per_piece", "per_kilo", "flat"]),
  price: z.coerce.number().min(0, "Price must be positive"),
  category: z.string().optional(),
  isActive: z.boolean().default(true),
  availableForAppointments: z.boolean().default(true),
  availableForJobOrders: z.boolean().default(true),
});

export const updateServiceSchema = serviceSchema.partial();

export type ServiceInput = z.infer<typeof serviceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

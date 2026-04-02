import { z } from "zod";

export const promotionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  type: z.enum(["percent_off", "flat_off", "fixed_price", "buy_x_get_y", "day_time"]),
  value: z.coerce.number().min(0).default(0),
  buyQty: z.coerce.number().int().min(1).optional().nullable(),
  getQty: z.coerce.number().int().min(1).optional().nullable(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional().nullable(),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  startsAt: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  itemIds: z.array(z.string()).default([]),
});

export type PromotionInput = z.infer<typeof promotionSchema>;

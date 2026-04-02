import { z } from "zod";

export const createCardSchema = z.object({
  customerName: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
});

export const saveLoyaltySettingsSchema = z.object({
  stampsPerReward: z.number().int().min(1).max(100),
  rewardDescription: z.string().min(1),
  isActive: z.boolean(),
});

export type CreateCardInput = z.infer<typeof createCardSchema>;
export type SaveLoyaltySettingsInput = z.infer<typeof saveLoyaltySettingsSchema>;

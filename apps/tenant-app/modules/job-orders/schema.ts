import { z } from "zod";

export const createJobOrderSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  description: z.string().min(1, "Description is required"),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
});

export type CreateJobOrderInput = z.infer<typeof createJobOrderSchema>;

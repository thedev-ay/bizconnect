import { z } from "zod";

export const jobOrderItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  weight: z.number().positive().optional(),
  unitPrice: z.number().min(0),
  total: z.number().min(0),
});

export const createJobOrderSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().min(1, "Customer name is required"),
  contactNo: z.string().optional(),
  notes: z.string().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  assignedStaffIds: z.array(z.string()).default([]),
  dueDate: z.string().optional(),
  items: z.array(jobOrderItemSchema).default([]),
});

export type CreateJobOrderInput = z.infer<typeof createJobOrderSchema>;

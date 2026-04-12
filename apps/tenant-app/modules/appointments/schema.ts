import { z } from "zod";

export const createAppointmentSchema = z.object({
  serviceId: z.string().min(1, "Service is required"),
  employeeId: z.string().optional(),
  staffName: z.string().optional(),
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerPhone: z.string().optional(),
  notes: z.string().optional(),
  startAt: z.string().min(1, "Start time is required"),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

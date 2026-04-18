import { z } from "zod";

export const createServiceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  duration: z.coerce.number().int().positive("Duration must be at least 1 minute"),
  price: z.coerce.number().min(0),
  availableForAppointments: z.boolean().default(true),
  availableForJobOrders: z.boolean().default(false),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;

export const updateStaffProfileSchema = z.object({
  commissionRate: z.coerce.number().min(0).max(100).optional(),
  accessLevel: z.enum(["owner", "manager", "staff", "viewer"]),
  serviceIds: z.array(z.string()),
  workingHours: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      enabled: z.boolean(),
      startTime: z.string(),
      endTime: z.string(),
    })
  ),
});

export type UpdateStaffProfileInput = z.infer<typeof updateStaffProfileSchema>;

export const createShiftSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  title: z.string().optional(),
  startAt: z.string().min(1, "Start time is required"),
  endAt: z.string().min(1, "End time is required"),
  notes: z.string().optional(),
});

export type CreateShiftInput = z.infer<typeof createShiftSchema>;

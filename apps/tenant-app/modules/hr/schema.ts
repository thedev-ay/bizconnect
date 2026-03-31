import { z } from "zod";

export const createEmployeeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  position: z.string().optional(),
  department: z.string().optional(),
  employeeNo: z.string().optional(),
  hireDate: z.string().optional(),
  salary: z.coerce.number().min(0).optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

import { z } from "zod";

export const branchSchema = z.object({
  name: z.string().min(1, "Branch name is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
});

export const employeeBranchAssignmentSchema = z.object({
  employeeId: z.string().min(1),
  branchId: z.string().min(1),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  notes: z.string().optional(),
});

export type BranchInput = z.infer<typeof branchSchema>;
export type EmployeeBranchAssignmentInput = z.infer<typeof employeeBranchAssignmentSchema>;

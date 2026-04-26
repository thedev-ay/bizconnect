import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["owner", "admin", "member"]).default("member"),
  userGroupId: z.string().optional().nullable(),
  permissions: z.record(z.string(), z.boolean()).default({}),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(["owner", "admin", "member"]).optional(),
  isActive: z.boolean().optional(),
  userGroupId: z.string().optional().nullable(),
  permissions: z.record(z.string(), z.boolean()).optional(),
});

export const userGroupSchema = z.object({
  name: z.string().min(2, "Group name must be at least 2 characters"),
  description: z
    .string()
    .max(240, "Description must be 240 characters or less")
    .optional()
    .nullable(),
  permissions: z.record(z.string(), z.boolean()).default({}),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserGroupInput = z.infer<typeof userGroupSchema>;

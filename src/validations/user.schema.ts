import { z } from "zod";
import { ROLES } from "@/types";
import { requiredText } from "@/validations/common";
import { passwordSchema } from "@/validations/auth.schema";
import { listQuerySchema } from "@/validations/list";

export const createUserSchema = z.object({
  name: requiredText(120, "Name", 2),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: passwordSchema,
  role: z.enum(ROLES),
  isActive: z.boolean().default(true),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: requiredText(120, "Name", 2).optional(),
  role: z.enum(ROLES).optional(),
  isActive: z.boolean().optional(),
  /** Optional admin-initiated password reset. */
  password: passwordSchema.optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const userListQuerySchema = listQuerySchema.extend({
  role: z.enum(ROLES).optional(),
  isActive: z.enum(["true", "false"]).optional(),
});

export type UserListQuery = z.infer<typeof userListQuerySchema>;

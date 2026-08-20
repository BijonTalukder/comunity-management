import { z } from "zod";
import { EDUCATION_STATUSES, GENDERS, RELATIONSHIPS } from "@/types";
import {
  objectIdSchema,
  optionalDateSchema,
  optionalText,
  requiredText,
} from "@/validations/common";
import { listQuerySchema } from "@/validations/list";

export const createChildSchema = z.object({
  fullName: requiredText(160, "Full name", 2),
  gender: z.enum(GENDERS, { error: "Select a gender" }),
  dateOfBirth: optionalDateSchema,
  relationship: z.enum(RELATIONSHIPS).default("SON"),
  educationStatus: z.enum(EDUCATION_STATUSES).default("STUDYING"),
  institutionId: objectIdSchema.optional().or(z.literal("")).transform((value) =>
    value === "" ? undefined : value,
  ),
  classOrGrade: optionalText(60, "Class/Grade"),
  section: optionalText(60, "Section"),
  rollNumber: optionalText(60, "Roll number"),
  notes: optionalText(2000, "Notes"),
});

export type CreateChildInput = z.infer<typeof createChildSchema>;

export const updateChildSchema = createChildSchema.partial();
export type UpdateChildInput = z.infer<typeof updateChildSchema>;

export const CHILD_SORT_FIELDS = ["fullName", "createdAt", "dateOfBirth"] as const;

export const childListQuerySchema = listQuerySchema.extend({
  educationStatus: z.enum(EDUCATION_STATUSES).optional(),
  institutionId: objectIdSchema.optional(),
  gender: z.enum(GENDERS).optional(),
  parentId: objectIdSchema.optional(),
});

export type ChildListQuery = z.infer<typeof childListQuerySchema>;

export const CHILD_TRACKED_FIELDS = [
  "fullName",
  "gender",
  "dateOfBirth",
  "relationship",
  "educationStatus",
  "institutionId",
  "classOrGrade",
  "section",
  "rollNumber",
  "notes",
] as const;

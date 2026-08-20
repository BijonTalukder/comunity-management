import { z } from "zod";
import { GENDERS, PERSON_STATUSES } from "@/types";
import {
  mobileSchema,
  optionalDateSchema,
  optionalEmailSchema,
  optionalText,
  requiredText,
} from "@/validations/common";
import { listQuerySchema } from "@/validations/list";

export const createPersonSchema = z.object({
  fullName: requiredText(160, "Full name", 2),
  fatherOrHusbandName: optionalText(160, "Father/Husband name"),
  motherName: optionalText(160, "Mother name"),
  gender: z.enum(GENDERS, { error: "Select a gender" }),
  dateOfBirth: optionalDateSchema,
  mobileNumber: mobileSchema,
  alternativeMobileNumber: mobileSchema,
  email: optionalEmailSchema,
  address: optionalText(500, "Address"),
  area: optionalText(160, "Area"),
  occupation: optionalText(160, "Occupation"),
  photoUrl: optionalText(2000, "Photo URL"),
  notes: optionalText(2000, "Notes"),
  status: z.enum(PERSON_STATUSES).default("ACTIVE"),
});

export type CreatePersonInput = z.infer<typeof createPersonSchema>;

export const updatePersonSchema = createPersonSchema.partial();
export type UpdatePersonInput = z.infer<typeof updatePersonSchema>;

export const PERSON_SORT_FIELDS = [
  "fullName",
  "createdAt",
  "updatedAt",
  "dateOfBirth",
  "area",
  "status",
] as const;

export const personListQuerySchema = listQuerySchema.extend({
  gender: z.enum(GENDERS).optional(),
  status: z.enum(PERSON_STATUSES).optional(),
  area: z.string().trim().max(160).optional(),
  /** Restricts to people who have at least one child record. */
  hasChildren: z.enum(["true", "false"]).optional(),
});

export type PersonListQuery = z.infer<typeof personListQuerySchema>;

/** Fields the audit trail tracks for people. */
export const PERSON_TRACKED_FIELDS = [
  "fullName",
  "fatherOrHusbandName",
  "motherName",
  "gender",
  "dateOfBirth",
  "mobileNumber",
  "alternativeMobileNumber",
  "email",
  "address",
  "area",
  "occupation",
  "photoUrl",
  "notes",
  "status",
] as const;

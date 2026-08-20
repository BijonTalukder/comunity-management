import { z } from "zod";
import { INSTITUTION_STATUSES, INSTITUTION_TYPES } from "@/types";
import { optionalText, requiredText } from "@/validations/common";
import { listQuerySchema } from "@/validations/list";

export const createInstitutionSchema = z.object({
  name: requiredText(200, "Institution name", 2),
  type: z.enum(INSTITUTION_TYPES, { error: "Select a type" }),
  address: optionalText(500, "Address"),
  area: optionalText(160, "Area"),
  city: optionalText(160, "City"),
  country: optionalText(160, "Country"),
  status: z.enum(INSTITUTION_STATUSES).default("ACTIVE"),
});

export type CreateInstitutionInput = z.infer<typeof createInstitutionSchema>;

export const updateInstitutionSchema = createInstitutionSchema.partial();
export type UpdateInstitutionInput = z.infer<typeof updateInstitutionSchema>;

export const INSTITUTION_SORT_FIELDS = ["name", "type", "createdAt", "status"] as const;

export const institutionListQuerySchema = listQuerySchema.extend({
  type: z.enum(INSTITUTION_TYPES).optional(),
  status: z.enum(INSTITUTION_STATUSES).optional(),
  area: z.string().trim().max(160).optional(),
});

export type InstitutionListQuery = z.infer<typeof institutionListQuerySchema>;

export const institutionSearchQuerySchema = z.object({
  q: z.string().trim().max(200).default(""),
  type: z.enum(INSTITUTION_TYPES).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

export const INSTITUTION_TRACKED_FIELDS = [
  "name",
  "type",
  "address",
  "area",
  "city",
  "country",
  "status",
] as const;

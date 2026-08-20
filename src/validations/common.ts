import { z } from "zod";

export const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, "Must be a valid identifier");

/** Trims, and converts an empty string to `undefined` so optional text fields
 * submitted as blank are stored as absent rather than "". */
export function optionalText(max: number, label = "This field") {
  return z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters`)
    .optional()
    .transform((value) => (value === "" ? undefined : value));
}

export function requiredText(max: number, label: string, min = 1) {
  return z
    .string()
    .trim()
    .min(min, `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`);
}

/** Accepts common Bangladeshi and international formats. */
export const mobileSchema = z
  .string()
  .trim()
  .regex(/^[+]?[\d][\d\s-]{5,19}$/, "Enter a valid mobile number")
  .optional()
  .transform((value) => (value === "" ? undefined : value));

export const optionalEmailSchema = z
  .union([z.literal(""), z.string().trim().toLowerCase().email("Enter a valid email address")])
  .optional()
  .transform((value) => (value === "" ? undefined : value));

/** Coerces date input (including `<input type="date">` strings) to a Date. */
export const optionalDateSchema = z
  .union([z.literal(""), z.coerce.date()])
  .optional()
  .transform((value) => (value === "" || value === undefined ? undefined : (value as Date)));

export const requiredDateSchema = z.coerce.date({ error: "Enter a valid date" });

import { z } from "zod";
import { CONTRIBUTION_STATUSES, PAYMENT_METHODS } from "@/types";
import {
  objectIdSchema,
  optionalText,
  requiredDateSchema,
} from "@/validations/common";
import { listQuerySchema } from "@/validations/list";

/** Amount is entered in taka with at most two decimal places. */
const amountSchema = z.coerce
  .number({ error: "Enter a valid amount" })
  .positive("Amount must be greater than zero")
  .max(100_000_000, "Amount is unrealistically large")
  .refine((value) => Math.round(value * 100) === Number((value * 100).toFixed(0)), {
    message: "Amount can have at most 2 decimal places",
  });

export const createContributionSchema = z.object({
  personId: objectIdSchema,
  amount: amountSchema,
  paymentDate: requiredDateSchema,
  paymentMethod: z.enum(PAYMENT_METHODS).default("CASH"),
  transactionReference: optionalText(160, "Transaction reference"),
  notes: optionalText(2000, "Notes"),
});

export type CreateContributionInput = z.infer<typeof createContributionSchema>;

export const updateContributionSchema = z.object({
  amount: amountSchema.optional(),
  paymentDate: requiredDateSchema.optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  transactionReference: optionalText(160, "Transaction reference"),
  notes: optionalText(2000, "Notes"),
  status: z.enum(CONTRIBUTION_STATUSES).optional(),
});

export type UpdateContributionInput = z.infer<typeof updateContributionSchema>;

export const CONTRIBUTION_SORT_FIELDS = [
  "paymentDate",
  "amountMinor",
  "createdAt",
] as const;

export const contributionListQuerySchema = listQuerySchema.extend({
  personId: objectIdSchema.optional(),
  eventId: objectIdSchema.optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  status: z.enum(CONTRIBUTION_STATUSES).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  /** "summary" aggregates one row per contributor; "records" lists payments. */
  view: z.enum(["records", "summary"]).default("records"),
});

export type ContributionListQuery = z.infer<typeof contributionListQuerySchema>;

export const CONTRIBUTION_TRACKED_FIELDS = [
  "amountMinor",
  "paymentDate",
  "paymentMethod",
  "transactionReference",
  "notes",
  "status",
] as const;

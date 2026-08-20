import { z } from "zod";
import { EVENT_STATUSES } from "@/types";
import { optionalDateSchema, optionalText, requiredText } from "@/validations/common";
import { listQuerySchema } from "@/validations/list";

export const createEventSchema = z
  .object({
    name: requiredText(200, "Event name", 2),
    eventType: optionalText(120, "Event type"),
    description: optionalText(2000, "Description"),
    startDate: optionalDateSchema,
    endDate: optionalDateSchema,
    location: optionalText(300, "Location"),
    status: z.enum(EVENT_STATUSES).default("UPCOMING"),
    notes: optionalText(2000, "Notes"),
  })
  .refine(
    (data) => !data.startDate || !data.endDate || data.endDate >= data.startDate,
    { path: ["endDate"], message: "End date must be on or after the start date" },
  );

export type CreateEventInput = z.infer<typeof createEventSchema>;

// `.partial()` is unavailable on a refined object, so the update shape is
// declared from the same base and re-refined.
export const updateEventSchema = z
  .object({
    name: requiredText(200, "Event name", 2).optional(),
    eventType: optionalText(120, "Event type"),
    description: optionalText(2000, "Description"),
    startDate: optionalDateSchema,
    endDate: optionalDateSchema,
    location: optionalText(300, "Location"),
    status: z.enum(EVENT_STATUSES).optional(),
    notes: optionalText(2000, "Notes"),
  })
  .refine(
    (data) => !data.startDate || !data.endDate || data.endDate >= data.startDate,
    { path: ["endDate"], message: "End date must be on or after the start date" },
  );

export type UpdateEventInput = z.infer<typeof updateEventSchema>;

export const EVENT_SORT_FIELDS = ["name", "startDate", "createdAt", "status"] as const;

export const eventListQuerySchema = listQuerySchema.extend({
  status: z.enum(EVENT_STATUSES).optional(),
  eventType: z.string().trim().max(120).optional(),
});

export type EventListQuery = z.infer<typeof eventListQuerySchema>;

export const EVENT_TRACKED_FIELDS = [
  "name",
  "eventType",
  "description",
  "startDate",
  "endDate",
  "location",
  "status",
  "notes",
] as const;

import { z } from "zod";

/**
 * Shared list-query shape. This lives apart from `lib/query.ts` — which pulls
 * in Mongoose — so client components can import validation schemas without
 * dragging the database driver into the browser bundle.
 */
export const MAX_PAGE_SIZE = 100;

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(20),
  search: z.string().trim().max(200).optional(),
  sortBy: z.string().trim().max(60).optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type ListQuery = z.infer<typeof listQuerySchema>;

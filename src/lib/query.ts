import { Types } from "mongoose";
import { z } from "zod";
import { AppError, NotFoundError } from "@/lib/errors";

export { listQuerySchema, MAX_PAGE_SIZE, type ListQuery } from "@/validations/list";

export function parseQuery<S extends z.ZodType>(request: Request, schema: S): z.infer<S> {
  const params = new URL(request.url).searchParams;
  const raw: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    if (value !== "") raw[key] = value;
  }
  return schema.parse(raw);
}

/**
 * Builds a Mongoose sort object from user input, restricted to an explicit
 * allow-list so a query string can never sort on an unindexed or private field.
 */
export function buildSort(
  sortBy: string | undefined,
  sortOrder: "asc" | "desc",
  allowed: readonly string[],
  fallback: string,
): Record<string, 1 | -1> {
  const field = sortBy && allowed.includes(sortBy) ? sortBy : fallback;
  return { [field]: sortOrder === "asc" ? 1 : -1 };
}

/** Escapes a user-supplied string for safe use inside a RegExp. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function toObjectId(id: string, entity = "Record"): Types.ObjectId {
  if (!Types.ObjectId.isValid(id) || String(new Types.ObjectId(id)) !== id) {
    throw new NotFoundError(entity);
  }
  return new Types.ObjectId(id);
}

export function assertObjectId(id: string, field = "id"): Types.ObjectId {
  if (!Types.ObjectId.isValid(id) || String(new Types.ObjectId(id)) !== id) {
    throw new AppError("Invalid identifier", 400, [
      { field, message: "Must be a valid identifier" },
    ]);
  }
  return new Types.ObjectId(id);
}

export function paginate(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

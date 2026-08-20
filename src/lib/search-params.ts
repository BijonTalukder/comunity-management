import type { z } from "zod";

/**
 * Parses Next.js `searchParams` with a Zod schema. Array values (a repeated
 * query key) collapse to the first entry, and blanks are dropped so schema
 * defaults apply.
 */
export function parseSearchParams<S extends z.ZodType>(
  raw: Record<string, string | string[] | undefined>,
  schema: S,
): z.infer<S> {
  const entries: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (typeof first === "string" && first !== "") entries[key] = first;
  }
  return schema.parse(entries);
}

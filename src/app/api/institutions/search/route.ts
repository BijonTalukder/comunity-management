import { ok, route } from "@/lib/api-response";
import { parseQuery } from "@/lib/query";
import { requirePermission } from "@/lib/permissions";
import { searchInstitutions } from "@/services/institution.service";
import { institutionSearchQuerySchema } from "@/validations/institution.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Typeahead endpoint backing the searchable institution combobox. */
export const GET = route(async (request: Request) => {
  await requirePermission("institutions:read");
  const { q, limit, type } = parseQuery(request, institutionSearchQuerySchema);
  return ok(await searchInstitutions(q, limit, type), "Institutions loaded");
});

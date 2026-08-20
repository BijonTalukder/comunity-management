import { created, ok, route } from "@/lib/api-response";
import { parseQuery } from "@/lib/query";
import { getActor } from "@/lib/actor";
import { requirePermission } from "@/lib/permissions";
import { createInstitution, listInstitutions } from "@/services/institution.service";
import {
  createInstitutionSchema,
  institutionListQuerySchema,
} from "@/validations/institution.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (request: Request) => {
  await requirePermission("institutions:read");
  const query = parseQuery(request, institutionListQuerySchema);
  return ok(await listInstitutions(query), "Institutions loaded");
});

export const POST = route(async (request: Request) => {
  const actor = await getActor("institutions:write");
  const input = createInstitutionSchema.parse(await request.json().catch(() => ({})));
  return created(await createInstitution(input, actor), "Institution created successfully");
});

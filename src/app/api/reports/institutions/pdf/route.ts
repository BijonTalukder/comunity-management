import { route } from "@/lib/api-response";
import { parseQuery } from "@/lib/query";
import { getActor } from "@/lib/actor";
import { respondWithReport } from "@/lib/export-response";
import { buildInstitutionsReport } from "@/services/report.service";
import { institutionListQuerySchema } from "@/validations/institution.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (request: Request) => {
  const actor = await getActor("reports:export");
  const query = parseQuery(request, institutionListQuerySchema);
  const report = await buildInstitutionsReport(query, actor);
  return respondWithReport(report, "pdf", actor, "Institution");
});

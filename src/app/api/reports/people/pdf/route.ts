import { route } from "@/lib/api-response";
import { parseQuery } from "@/lib/query";
import { getActor } from "@/lib/actor";
import { respondWithReport } from "@/lib/export-response";
import { buildPeopleReport } from "@/services/report.service";
import { personListQuerySchema } from "@/validations/people.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (request: Request) => {
  const actor = await getActor("reports:export");
  const query = parseQuery(request, personListQuerySchema);
  const report = await buildPeopleReport(query, actor);
  return respondWithReport(report, "pdf", actor, "Person");
});

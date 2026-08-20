import { route } from "@/lib/api-response";
import { parseQuery } from "@/lib/query";
import { getActor } from "@/lib/actor";
import { respondWithReport } from "@/lib/export-response";
import { buildEventsReport } from "@/services/report.service";
import { eventListQuerySchema } from "@/validations/event.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (request: Request) => {
  const actor = await getActor("reports:export");
  const query = parseQuery(request, eventListQuerySchema);
  const report = await buildEventsReport(query, actor);
  return respondWithReport(report, "excel", actor, "Event");
});

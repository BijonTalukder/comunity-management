import { route } from "@/lib/api-response";
import { parseQuery } from "@/lib/query";
import { getActor } from "@/lib/actor";
import { respondWithReport } from "@/lib/export-response";
import { buildChildrenReport } from "@/services/report.service";
import { childListQuerySchema } from "@/validations/children.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (request: Request) => {
  const actor = await getActor("reports:export");
  const query = parseQuery(request, childListQuerySchema);
  const report = await buildChildrenReport(query, actor);
  return respondWithReport(report, "pdf", actor, "Child");
});

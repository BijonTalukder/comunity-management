import { route } from "@/lib/api-response";
import { parseQuery } from "@/lib/query";
import { getActor } from "@/lib/actor";
import { respondWithReport } from "@/lib/export-response";
import { buildAuditLogsReport } from "@/services/report.service";
import { auditListQuerySchema } from "@/validations/audit.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (request: Request) => {
  const actor = await getActor("reports:export");
  const query = parseQuery(request, auditListQuerySchema);
  const report = await buildAuditLogsReport(query, actor);
  return respondWithReport(report, "pdf", actor, "Report");
});

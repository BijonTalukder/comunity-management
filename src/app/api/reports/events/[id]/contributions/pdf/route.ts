import { route } from "@/lib/api-response";
import { parseQuery } from "@/lib/query";
import { getActor } from "@/lib/actor";
import { respondWithReport } from "@/lib/export-response";
import {
  buildEventContributionsReport,
  buildEventContributorsReport,
} from "@/services/report.service";
import { contributionListQuerySchema } from "@/validations/contribution.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export const GET = route(async (request: Request, { params }: Context) => {
  const actor = await getActor("reports:export");
  const { id } = await params;
  const query = parseQuery(request, contributionListQuerySchema);

  // `?view=summary` exports one row per contributor instead of one per payment.
  if (query.view === "summary") {
    const report = await buildEventContributorsReport(id, query, actor);
    return respondWithReport(report, "pdf", actor, "Contribution");
  }

  const report = await buildEventContributionsReport(id, query, actor);
  return respondWithReport(report, "pdf", actor, "Contribution");
});

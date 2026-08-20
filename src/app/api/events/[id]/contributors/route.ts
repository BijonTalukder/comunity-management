import { ok, route } from "@/lib/api-response";
import { parseQuery } from "@/lib/query";
import { requirePermission } from "@/lib/permissions";
import { listContributorSummary } from "@/services/contribution.service";
import { contributionListQuerySchema } from "@/validations/contribution.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/** One row per contributor with their total for this event. */
export const GET = route(async (request: Request, { params }: Context) => {
  await requirePermission("contributions:read");
  const { id } = await params;
  const query = parseQuery(request, contributionListQuerySchema);
  return ok(await listContributorSummary(id, query), "Contributors loaded");
});

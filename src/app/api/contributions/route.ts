import { ok, route } from "@/lib/api-response";
import { parseQuery } from "@/lib/query";
import { requirePermission } from "@/lib/permissions";
import { listContributions } from "@/services/contribution.service";
import { contributionListQuerySchema } from "@/validations/contribution.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (request: Request) => {
  await requirePermission("contributions:read");
  const query = parseQuery(request, contributionListQuerySchema);
  return ok(await listContributions(query), "Contributions loaded");
});

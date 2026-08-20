import { created, ok, route } from "@/lib/api-response";
import { parseQuery } from "@/lib/query";
import { getActor } from "@/lib/actor";
import { requirePermission } from "@/lib/permissions";
import {
  createContribution,
  listContributions,
} from "@/services/contribution.service";
import {
  contributionListQuerySchema,
  createContributionSchema,
} from "@/validations/contribution.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export const GET = route(async (request: Request, { params }: Context) => {
  await requirePermission("contributions:read");
  const { id } = await params;
  const query = parseQuery(request, contributionListQuerySchema);
  return ok(await listContributions({ ...query, eventId: id }), "Contributions loaded");
});

export const POST = route(async (request: Request, { params }: Context) => {
  const actor = await getActor("contributions:write");
  const { id } = await params;
  const input = createContributionSchema.parse(await request.json().catch(() => ({})));
  return created(await createContribution(id, input, actor), "Contribution recorded");
});

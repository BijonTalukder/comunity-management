import { ok, route } from "@/lib/api-response";
import { requirePermission } from "@/lib/permissions";
import { getPersonContributionsByEvent } from "@/services/contribution.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export const GET = route(async (_request: Request, { params }: Context) => {
  await requirePermission("contributions:read");
  const { id } = await params;
  return ok(await getPersonContributionsByEvent(id), "Contributions loaded");
});

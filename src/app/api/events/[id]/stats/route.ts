import { ok, route } from "@/lib/api-response";
import { requirePermission } from "@/lib/permissions";
import { getEventStats } from "@/services/event.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export const GET = route(async (_request: Request, { params }: Context) => {
  await requirePermission("events:read");
  const { id } = await params;
  return ok(await getEventStats(id), "Event stats loaded");
});

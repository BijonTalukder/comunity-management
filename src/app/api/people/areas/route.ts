import { ok, route } from "@/lib/api-response";
import { requirePermission } from "@/lib/permissions";
import { listAreas } from "@/services/people.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requirePermission("people:read");
  return ok(await listAreas(), "Areas loaded");
});

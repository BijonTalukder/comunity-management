import { ok, route } from "@/lib/api-response";
import { parseQuery } from "@/lib/query";
import { requirePermission } from "@/lib/permissions";
import { listChildren } from "@/services/children.service";
import { childListQuerySchema } from "@/validations/children.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (request: Request) => {
  await requirePermission("children:read");
  return ok(await listChildren(parseQuery(request, childListQuerySchema)), "Children loaded");
});

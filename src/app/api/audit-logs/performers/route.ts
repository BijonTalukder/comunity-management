import { ok, route } from "@/lib/api-response";
import { requirePermission } from "@/lib/permissions";
import { listAuditPerformers } from "@/services/audit.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requirePermission("audit:read");
  return ok(await listAuditPerformers(), "Users loaded");
});

import { ok, route } from "@/lib/api-response";
import { parseQuery } from "@/lib/query";
import { requirePermission } from "@/lib/permissions";
import { listAuditLogs } from "@/services/audit.service";
import { auditListQuerySchema } from "@/validations/audit.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (request: Request) => {
  await requirePermission("audit:read");
  return ok(await listAuditLogs(parseQuery(request, auditListQuerySchema)), "Audit logs loaded");
});

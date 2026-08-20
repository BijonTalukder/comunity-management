import { ok, route } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { getDashboardSummary } from "@/services/dashboard.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requireAuth();
  return ok(await getDashboardSummary(), "Dashboard loaded");
});

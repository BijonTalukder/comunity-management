import { ok, route } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { permissionsFor } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireAuth();
  return ok({ user, permissions: permissionsFor(user.role) });
});

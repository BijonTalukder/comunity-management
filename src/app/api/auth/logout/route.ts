import { ok, route } from "@/lib/api-response";
import { clearSessionCookie, getCurrentUser, getRequestContext } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(async () => {
  const user = await getCurrentUser();

  if (user) {
    const context = await getRequestContext();
    await createAuditLog({
      entityType: "Auth",
      entityId: user.id,
      entityLabel: `${user.name} <${user.email}>`,
      action: "LOGOUT",
      context: { userId: user.id, ...context },
    });
  }

  // The cookie is cleared even when no valid session was found, so a stale or
  // tampered cookie cannot get stuck in the browser.
  await clearSessionCookie();
  return ok(null, "Signed out successfully");
});

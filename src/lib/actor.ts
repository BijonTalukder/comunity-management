import "server-only";
import { getRequestContext } from "@/lib/auth";
import { requirePermission, type Permission } from "@/lib/permissions";
import type { AuditContext } from "@/lib/audit";
import type { SessionUser } from "@/types";

/** The authenticated caller plus the request metadata audit entries record. */
export type Actor = SessionUser & AuditContext;

/**
 * Single entry point used by mutating route handlers: authorises the caller
 * and captures the IP/user-agent that the audit trail needs.
 */
export async function getActor(permission: Permission): Promise<Actor> {
  const [user, context] = await Promise.all([
    requirePermission(permission),
    getRequestContext(),
  ]);
  return { ...user, userId: user.id, ...context };
}

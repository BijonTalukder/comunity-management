import type { Role, SessionUser } from "@/types";
import { ForbiddenError } from "@/lib/errors";
import { requireAuth } from "@/lib/auth";

/**
 * Every capability the application guards. Keeping them enumerated here means
 * a new role only has to be described in one table.
 */
export const PERMISSIONS = [
  "people:read",
  "people:write",
  "people:delete",
  "children:read",
  "children:write",
  "children:delete",
  "institutions:read",
  "institutions:write",
  "institutions:delete",
  "events:read",
  "events:write",
  "events:delete",
  "contributions:read",
  "contributions:write",
  "contributions:delete",
  "users:read",
  "users:write",
  "audit:read",
  "reports:export",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ADMIN_PERMISSIONS: Permission[] = [
  "people:read",
  "people:write",
  "people:delete",
  "children:read",
  "children:write",
  "children:delete",
  "institutions:read",
  "institutions:write",
  "events:read",
  "events:write",
  "contributions:read",
  "contributions:write",
  "contributions:delete",
  "audit:read",
  "reports:export",
];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  // Super admins additionally manage user accounts and can remove master data.
  SUPER_ADMIN: PERMISSIONS,
  ADMIN: ADMIN_PERMISSIONS,
};

export function can(user: Pick<SessionUser, "role">, permission: Permission): boolean {
  return ROLE_PERMISSIONS[user.role].includes(permission);
}

export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireAuth();
  if (!can(user, permission)) {
    throw new ForbiddenError(`Your role cannot perform this action (${permission}).`);
  }
  return user;
}

export function permissionsFor(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

import "server-only";
import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import bcrypt from "bcryptjs";
import { env } from "@/lib/env";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { ROLES, type Role, type SessionUser } from "@/types";

export const SESSION_COOKIE = "cm_session";
const BCRYPT_ROUNDS = 12;

export type SessionPayload = JWTPayload & {
  sub: string;
  name: string;
  email: string;
  role: Role;
};

function secretKey(): Uint8Array {
  return new TextEncoder().encode(env.authSecret);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ name: user.name, email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${env.sessionMaxAgeSeconds}s`)
    .sign(secretKey());
}

/**
 * Verifies the JWT signature and expiry only. Runs in the Edge runtime
 * (middleware) where a database connection is not available.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      !ROLES.includes(payload.role as Role)
    ) {
      return null;
    }
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: env.sessionMaxAgeSeconds,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Resolves the caller from the session cookie and re-checks the user against
 * the database on every request, so deactivating an account or changing a
 * password takes effect immediately instead of when the JWT expires.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  await connectToDatabase();
  const user = await User.findById(payload.sub)
    .select("name email role isActive passwordChangedAt")
    .lean();

  if (!user || !user.isActive) return null;

  // Invalidate tokens issued before the most recent password change.
  if (user.passwordChangedAt && typeof payload.iat === "number") {
    if (user.passwordChangedAt.getTime() > payload.iat * 1000) return null;
  }

  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export async function requireRole(...allowed: Role[]): Promise<SessionUser> {
  const user = await requireAuth();
  if (!allowed.includes(user.role)) throw new ForbiddenError();
  return user;
}

/** Request metadata attached to audit log entries. */
export async function getRequestContext(): Promise<{
  ipAddress?: string;
  userAgent?: string;
}> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() || headerList.get("x-real-ip") || undefined;
  return {
    ipAddress,
    userAgent: headerList.get("user-agent")?.slice(0, 400) || undefined,
  };
}

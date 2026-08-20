import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { loginSchema } from "@/validations/auth.schema";
import { ok, route } from "@/lib/api-response";
import {
  createSessionToken,
  getRequestContext,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { ensureDefaultAdmin } from "@/lib/bootstrap";
import { consumeRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { createAuditLog } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import type { SessionUser } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(async (request: Request) => {
  // The first login attempt on a fresh database also creates the super admin.
  await ensureDefaultAdmin();

  const context = await getRequestContext();
  const body = await request.json().catch(() => ({}));
  const credentials = loginSchema.parse(body);

  // Two windows: a strict per-account limit to stop credential stuffing on one
  // user, and a looser per-IP limit to stop spraying across many accounts.
  const ipKey = `login:ip:${context.ipAddress ?? "unknown"}`;
  const accountKey = `login:email:${credentials.email}`;
  consumeRateLimit({ key: ipKey, limit: 20, windowSeconds: 300 });
  consumeRateLimit({ key: accountKey, limit: 5, windowSeconds: 300 });

  await connectToDatabase();
  const user = await User.findOne({ email: credentials.email })
    .select("+passwordHash name email role isActive")
    .exec();

  // The same message is returned whether the email or the password was wrong,
  // so the response cannot be used to enumerate accounts.
  const invalid = new AppError("Invalid email or password", 401);
  if (!user) throw invalid;

  const passwordMatches = await verifyPassword(credentials.password, user.passwordHash);
  if (!passwordMatches) throw invalid;

  if (!user.isActive) {
    throw new AppError("This account has been deactivated. Contact a super admin.", 403);
  }

  const sessionUser: SessionUser = {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
  };

  await setSessionCookie(await createSessionToken(sessionUser));
  await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });

  resetRateLimit(accountKey);

  await createAuditLog({
    entityType: "Auth",
    entityId: user._id,
    entityLabel: `${user.name} <${user.email}>`,
    action: "LOGIN",
    context: { userId: sessionUser.id, ...context },
  });

  return ok(sessionUser, `Welcome back, ${user.name.split(" ")[0]}`);
});

import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { changePasswordSchema } from "@/validations/auth.schema";
import { ok, route } from "@/lib/api-response";
import {
  createSessionToken,
  getRequestContext,
  hashPassword,
  requireAuth,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { createAuditLog } from "@/lib/audit";
import { AppError, NotFoundError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(async (request: Request) => {
  const actor = await requireAuth();
  const context = await getRequestContext();

  consumeRateLimit({ key: `password:${actor.id}`, limit: 5, windowSeconds: 900 });

  const body = await request.json().catch(() => ({}));
  const input = changePasswordSchema.parse(body);

  await connectToDatabase();
  const user = await User.findById(actor.id).select("+passwordHash name email role").exec();
  if (!user) throw new NotFoundError("User");

  const matches = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!matches) {
    throw new AppError("Validation failed", 422, [
      { field: "currentPassword", message: "Current password is incorrect" },
    ]);
  }

  const changedAt = new Date();
  await User.updateOne(
    { _id: user._id },
    {
      passwordHash: await hashPassword(input.newPassword),
      passwordChangedAt: changedAt,
    },
  );

  // Every previously issued token is now older than `passwordChangedAt` and so
  // is rejected; issue a fresh one so the current tab stays signed in.
  await setSessionCookie(
    await createSessionToken({
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
    }),
  );

  await createAuditLog({
    entityType: "User",
    entityId: user._id,
    entityLabel: `${user.name} <${user.email}>`,
    action: "PASSWORD_CHANGE",
    changes: [{ field: "password", oldValue: null, newValue: "(changed by owner)" }],
    context: { userId: actor.id, ...context },
  });

  return ok(null, "Password updated. Other sessions have been signed out.");
});

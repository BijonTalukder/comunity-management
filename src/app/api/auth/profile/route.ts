import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { updateProfileSchema } from "@/validations/auth.schema";
import { ok, route } from "@/lib/api-response";
import {
  createSessionToken,
  getRequestContext,
  requireAuth,
  setSessionCookie,
} from "@/lib/auth";
import { createAuditLog, getChangedFields } from "@/lib/audit";
import { NotFoundError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const PATCH = route(async (request: Request) => {
  const session = await requireAuth();
  const context = await getRequestContext();

  const body = await request.json().catch(() => ({}));
  const input = updateProfileSchema.parse(body);

  await connectToDatabase();
  const previous = await User.findById(session.id).select("name email role").lean();
  if (!previous) throw new NotFoundError("User");

  const changes = getChangedFields(previous, input, ["name"]);
  if (changes.length === 0) return ok(session, "No changes to save");

  await User.updateOne({ _id: session.id }, { name: input.name });

  // The display name is embedded in the session token, so it is reissued.
  await setSessionCookie(
    await createSessionToken({ ...session, name: input.name }),
  );

  await createAuditLog({
    entityType: "User",
    entityId: session.id,
    entityLabel: `${input.name} <${previous.email}>`,
    action: "UPDATE",
    changes,
    context: { userId: session.id, ...context },
  });

  return ok({ ...session, name: input.name }, "Profile updated");
});

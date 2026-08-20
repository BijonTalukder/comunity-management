import { ok, route } from "@/lib/api-response";
import { getActor } from "@/lib/actor";
import { requirePermission } from "@/lib/permissions";
import { getUserById, updateUser } from "@/services/user.service";
import { updateUserSchema } from "@/validations/user.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export const GET = route(async (_request: Request, { params }: Context) => {
  await requirePermission("users:read");
  const { id } = await params;
  return ok(await getUserById(id), "User loaded");
});

export const PATCH = route(async (request: Request, { params }: Context) => {
  const actor = await getActor("users:write");
  const { id } = await params;
  const input = updateUserSchema.parse(await request.json().catch(() => ({})));
  return ok(await updateUser(id, input, actor), "User updated successfully");
});

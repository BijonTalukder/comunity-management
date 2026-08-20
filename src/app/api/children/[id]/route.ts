import { ok, route } from "@/lib/api-response";
import { getActor } from "@/lib/actor";
import { requirePermission } from "@/lib/permissions";
import { deleteChild, getChildById, updateChild } from "@/services/children.service";
import { updateChildSchema } from "@/validations/children.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export const GET = route(async (_request: Request, { params }: Context) => {
  await requirePermission("children:read");
  const { id } = await params;
  return ok(await getChildById(id), "Child loaded");
});

export const PATCH = route(async (request: Request, { params }: Context) => {
  const actor = await getActor("children:write");
  const { id } = await params;
  const input = updateChildSchema.parse(await request.json().catch(() => ({})));
  return ok(await updateChild(id, input, actor), "Child updated successfully");
});

export const DELETE = route(async (_request: Request, { params }: Context) => {
  const actor = await getActor("children:delete");
  const { id } = await params;
  return ok(await deleteChild(id, actor), "Child removed");
});

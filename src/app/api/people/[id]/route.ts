import { ok, route } from "@/lib/api-response";
import { getActor } from "@/lib/actor";
import { requirePermission } from "@/lib/permissions";
import { deletePerson, getPersonById, updatePerson } from "@/services/people.service";
import { updatePersonSchema } from "@/validations/people.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export const GET = route(async (_request: Request, { params }: Context) => {
  await requirePermission("people:read");
  const { id } = await params;
  return ok(await getPersonById(id), "Person loaded");
});

export const PATCH = route(async (request: Request, { params }: Context) => {
  const actor = await getActor("people:write");
  const { id } = await params;
  const input = updatePersonSchema.parse(await request.json().catch(() => ({})));
  return ok(await updatePerson(id, input, actor), "Person updated successfully");
});

export const DELETE = route(async (request: Request, { params }: Context) => {
  const actor = await getActor("people:delete");
  const { id } = await params;
  // `?hard=true` removes the record outright, but only when nothing references it.
  const hard = new URL(request.url).searchParams.get("hard") === "true";
  const result = await deletePerson(id, actor, hard);
  return ok(result, result.archived ? "Person archived" : "Person deleted");
});

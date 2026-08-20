import { ok, route } from "@/lib/api-response";
import { getActor } from "@/lib/actor";
import { requirePermission } from "@/lib/permissions";
import { deleteEvent, getEventById, updateEvent } from "@/services/event.service";
import { updateEventSchema } from "@/validations/event.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export const GET = route(async (_request: Request, { params }: Context) => {
  await requirePermission("events:read");
  const { id } = await params;
  return ok(await getEventById(id), "Event loaded");
});

export const PATCH = route(async (request: Request, { params }: Context) => {
  const actor = await getActor("events:write");
  const { id } = await params;
  const input = updateEventSchema.parse(await request.json().catch(() => ({})));
  return ok(await updateEvent(id, input, actor), "Event updated successfully");
});

export const DELETE = route(async (_request: Request, { params }: Context) => {
  const actor = await getActor("events:delete");
  const { id } = await params;
  const result = await deleteEvent(id, actor);
  return ok(result, result.archived ? "Event archived" : "Event deleted");
});

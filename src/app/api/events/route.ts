import { created, ok, route } from "@/lib/api-response";
import { parseQuery } from "@/lib/query";
import { getActor } from "@/lib/actor";
import { requirePermission } from "@/lib/permissions";
import { createEvent, listEvents } from "@/services/event.service";
import { createEventSchema, eventListQuerySchema } from "@/validations/event.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (request: Request) => {
  await requirePermission("events:read");
  return ok(await listEvents(parseQuery(request, eventListQuerySchema)), "Events loaded");
});

export const POST = route(async (request: Request) => {
  const actor = await getActor("events:write");
  const input = createEventSchema.parse(await request.json().catch(() => ({})));
  return created(await createEvent(input, actor), "Event created successfully");
});

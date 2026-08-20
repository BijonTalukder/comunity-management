import { created, ok, route } from "@/lib/api-response";
import { parseQuery } from "@/lib/query";
import { getActor } from "@/lib/actor";
import { requirePermission } from "@/lib/permissions";
import { createPerson, listPeople } from "@/services/people.service";
import {
  createPersonSchema,
  personListQuerySchema,
} from "@/validations/people.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (request: Request) => {
  await requirePermission("people:read");
  const query = parseQuery(request, personListQuerySchema);
  return ok(await listPeople(query), "People loaded");
});

export const POST = route(async (request: Request) => {
  const actor = await getActor("people:write");
  const input = createPersonSchema.parse(await request.json().catch(() => ({})));
  const person = await createPerson(input, actor);
  return created(person, "Person created successfully");
});

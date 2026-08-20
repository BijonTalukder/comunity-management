import { created, ok, route } from "@/lib/api-response";
import { parseQuery } from "@/lib/query";
import { getActor } from "@/lib/actor";
import { requirePermission } from "@/lib/permissions";
import { createUser, listUsers } from "@/services/user.service";
import { createUserSchema, userListQuerySchema } from "@/validations/user.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (request: Request) => {
  await requirePermission("users:read");
  return ok(await listUsers(parseQuery(request, userListQuerySchema)), "Users loaded");
});

export const POST = route(async (request: Request) => {
  const actor = await getActor("users:write");
  const input = createUserSchema.parse(await request.json().catch(() => ({})));
  return created(await createUser(input, actor), "User created successfully");
});

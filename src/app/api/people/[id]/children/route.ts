import { created, ok, route } from "@/lib/api-response";
import { parseQuery } from "@/lib/query";
import { getActor } from "@/lib/actor";
import { requirePermission } from "@/lib/permissions";
import { createChild, listChildren } from "@/services/children.service";
import { childListQuerySchema, createChildSchema } from "@/validations/children.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export const GET = route(async (request: Request, { params }: Context) => {
  await requirePermission("children:read");
  const { id } = await params;
  const query = parseQuery(request, childListQuerySchema);
  return ok(await listChildren({ ...query, parentId: id }), "Children loaded");
});

export const POST = route(async (request: Request, { params }: Context) => {
  const actor = await getActor("children:write");
  const { id } = await params;
  const input = createChildSchema.parse(await request.json().catch(() => ({})));
  return created(await createChild(id, input, actor), "Child added successfully");
});

import { ok, route } from "@/lib/api-response";
import { getActor } from "@/lib/actor";
import { requirePermission } from "@/lib/permissions";
import {
  deleteInstitution,
  getInstitutionById,
  updateInstitution,
} from "@/services/institution.service";
import { updateInstitutionSchema } from "@/validations/institution.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export const GET = route(async (_request: Request, { params }: Context) => {
  await requirePermission("institutions:read");
  const { id } = await params;
  return ok(await getInstitutionById(id), "Institution loaded");
});

export const PATCH = route(async (request: Request, { params }: Context) => {
  const actor = await getActor("institutions:write");
  const { id } = await params;
  const input = updateInstitutionSchema.parse(await request.json().catch(() => ({})));
  return ok(await updateInstitution(id, input, actor), "Institution updated successfully");
});

export const DELETE = route(async (_request: Request, { params }: Context) => {
  const actor = await getActor("institutions:delete");
  const { id } = await params;
  return ok(await deleteInstitution(id, actor), "Institution deleted");
});

import { ok, route } from "@/lib/api-response";
import { getActor } from "@/lib/actor";
import { requirePermission } from "@/lib/permissions";
import {
  getContributionById,
  updateContribution,
  voidContribution,
} from "@/services/contribution.service";
import { updateContributionSchema } from "@/validations/contribution.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export const GET = route(async (_request: Request, { params }: Context) => {
  await requirePermission("contributions:read");
  const { id } = await params;
  return ok(await getContributionById(id), "Contribution loaded");
});

export const PATCH = route(async (request: Request, { params }: Context) => {
  const actor = await getActor("contributions:write");
  const { id } = await params;
  const input = updateContributionSchema.parse(await request.json().catch(() => ({})));
  return ok(await updateContribution(id, input, actor), "Contribution updated");
});

/** Voids rather than deletes, keeping the payment history auditable. */
export const DELETE = route(async (_request: Request, { params }: Context) => {
  const actor = await getActor("contributions:delete");
  const { id } = await params;
  return ok(await voidContribution(id, actor), "Contribution voided");
});

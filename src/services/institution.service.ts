import "server-only";
import { Types, type QueryFilter } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import {
  Institution,
  normalizeInstitutionName,
  type InstitutionDoc,
} from "@/models/Institution";
import { Child } from "@/models/Child";
import { ConflictError, NotFoundError, AppError } from "@/lib/errors";
import { buildSort, escapeRegex, paginate, toObjectId } from "@/lib/query";
import { createAuditLog, getChangedFields, snapshotAsChanges } from "@/lib/audit";
import type { Actor } from "@/lib/actor";
import {
  INSTITUTION_SORT_FIELDS,
  INSTITUTION_TRACKED_FIELDS,
  type CreateInstitutionInput,
  type InstitutionListQuery,
  type UpdateInstitutionInput,
} from "@/validations/institution.schema";
import type { InstitutionType, Paginated } from "@/types";

export type InstitutionListItem = InstitutionDoc & { childrenCount: number };

function buildInstitutionFilter(query: InstitutionListQuery): QueryFilter<InstitutionDoc> {
  const filter: QueryFilter<InstitutionDoc> = {};
  if (query.type) filter.type = query.type;
  if (query.status) filter.status = query.status;
  if (query.area) filter.area = new RegExp(`^${escapeRegex(query.area)}$`, "i");
  if (query.search) {
    const normalized = normalizeInstitutionName(query.search);
    const pattern = new RegExp(escapeRegex(query.search), "i");
    filter.$or = [
      { name: pattern },
      { normalizedName: new RegExp(escapeRegex(normalized), "i") },
      { area: pattern },
      { city: pattern },
    ];
  }
  return filter;
}

export async function listInstitutions(
  query: InstitutionListQuery,
): Promise<Paginated<InstitutionListItem>> {
  await connectToDatabase();

  const filter = buildInstitutionFilter(query);
  const sort = buildSort(query.sortBy, query.sortOrder, INSTITUTION_SORT_FIELDS, "name");

  const [items, total] = await Promise.all([
    Institution.aggregate<InstitutionListItem>([
      { $match: filter },
      { $sort: { ...sort, _id: 1 } },
      { $skip: (query.page - 1) * query.limit },
      { $limit: query.limit },
      {
        $lookup: {
          from: "children",
          localField: "_id",
          foreignField: "institutionId",
          as: "students",
          pipeline: [{ $project: { _id: 1 } }],
        },
      },
      { $addFields: { childrenCount: { $size: "$students" } } },
      { $project: { students: 0 } },
    ]),
    Institution.countDocuments(filter),
  ]);

  return { items, ...paginate(query.page, query.limit, total) };
}

/**
 * Prefix/substring search used by the child form's combobox. Results are
 * ordered so exact and prefix matches surface first.
 */
export async function searchInstitutions(
  q: string,
  limit: number,
  type?: InstitutionType,
) {
  await connectToDatabase();

  const filter: QueryFilter<InstitutionDoc> = { status: "ACTIVE" };
  if (type) filter.type = type;

  const trimmed = q.trim();
  if (trimmed) {
    const normalized = normalizeInstitutionName(trimmed);
    filter.normalizedName = new RegExp(escapeRegex(normalized));
  }

  const results = await Institution.find(filter)
    .select("name type area city normalizedName")
    .limit(limit)
    .lean();

  if (!trimmed) return results;

  const normalizedQuery = normalizeInstitutionName(trimmed);
  return results.sort((a, b) => {
    const rank = (value: string) =>
      value === normalizedQuery ? 0 : value.startsWith(normalizedQuery) ? 1 : 2;
    const diff = rank(a.normalizedName) - rank(b.normalizedName);
    return diff !== 0 ? diff : a.name.localeCompare(b.name);
  });
}

export async function getInstitutionById(id: string) {
  await connectToDatabase();
  const institution = await Institution.findById(toObjectId(id, "Institution")).lean();
  if (!institution) throw new NotFoundError("Institution");
  return institution;
}

export async function createInstitution(input: CreateInstitutionInput, actor: Actor) {
  await connectToDatabase();

  const normalizedName = normalizeInstitutionName(input.name);
  const existing = await Institution.findOne({ normalizedName, type: input.type }).lean();
  if (existing) {
    throw new ConflictError(`"${existing.name}" already exists in this category`, [
      { field: "name", message: "An institution with this name and type already exists" },
    ]);
  }

  const institution = await Institution.create({
    ...input,
    normalizedName,
    createdBy: new Types.ObjectId(actor.id),
  });

  await createAuditLog({
    entityType: "Institution",
    entityId: institution._id,
    entityLabel: institution.name,
    action: "CREATE",
    changes: snapshotAsChanges(institution.toObject(), INSTITUTION_TRACKED_FIELDS),
    context: actor,
  });

  return institution.toObject();
}

export async function updateInstitution(
  id: string,
  input: UpdateInstitutionInput,
  actor: Actor,
) {
  await connectToDatabase();
  const institutionId = toObjectId(id, "Institution");

  const previous = await Institution.findById(institutionId).lean();
  if (!previous) throw new NotFoundError("Institution");

  const patch: Record<string, unknown> = { ...input };
  if (input.name !== undefined) {
    patch.normalizedName = normalizeInstitutionName(input.name);
  }

  const nextName = (patch.normalizedName as string) ?? previous.normalizedName;
  const nextType = input.type ?? previous.type;
  if (nextName !== previous.normalizedName || nextType !== previous.type) {
    const clash = await Institution.findOne({
      _id: { $ne: institutionId },
      normalizedName: nextName,
      type: nextType,
    }).lean();
    if (clash) {
      throw new ConflictError(`"${clash.name}" already exists in this category`, [
        { field: "name", message: "An institution with this name and type already exists" },
      ]);
    }
  }

  const changes = getChangedFields(
    previous,
    input,
    INSTITUTION_TRACKED_FIELDS,
  );

  if (changes.length === 0) return previous;

  const updated = await Institution.findByIdAndUpdate(
    institutionId,
    { ...patch, updatedBy: new Types.ObjectId(actor.id) },
    { new: true, runValidators: true },
  ).lean();

  if (!updated) throw new NotFoundError("Institution");

  await createAuditLog({
    entityType: "Institution",
    entityId: institutionId,
    entityLabel: updated.name,
    action: "UPDATE",
    changes,
    context: actor,
  });

  return updated;
}

/**
 * Deletion is blocked while children still reference the institution; the
 * caller is told to deactivate it instead so existing records stay resolvable.
 */
export async function deleteInstitution(id: string, actor: Actor) {
  await connectToDatabase();
  const institutionId = toObjectId(id, "Institution");

  const institution = await Institution.findById(institutionId).lean();
  if (!institution) throw new NotFoundError("Institution");

  const referenced = await Child.countDocuments({ institutionId });
  if (referenced > 0) {
    throw new AppError(
      `This institution is linked to ${referenced} child record${referenced === 1 ? "" : "s"}. Mark it inactive instead of deleting it.`,
      409,
    );
  }

  await Institution.deleteOne({ _id: institutionId });

  await createAuditLog({
    entityType: "Institution",
    entityId: institutionId,
    entityLabel: institution.name,
    action: "DELETE",
    changes: [{ field: "_deleted", oldValue: false, newValue: true }],
    context: actor,
  });

  return { deleted: true as const };
}

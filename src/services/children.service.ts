import "server-only";
import { Types, type QueryFilter } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { Child, type ChildDoc } from "@/models/Child";
import { Person } from "@/models/Person";
import { Institution } from "@/models/Institution";
import { AppError, NotFoundError } from "@/lib/errors";
import { buildSort, escapeRegex, paginate, toObjectId } from "@/lib/query";
import { createAuditLog, getChangedFields, snapshotAsChanges } from "@/lib/audit";
import type { Actor } from "@/lib/actor";
import {
  CHILD_SORT_FIELDS,
  CHILD_TRACKED_FIELDS,
  type ChildListQuery,
  type CreateChildInput,
  type UpdateChildInput,
} from "@/validations/children.schema";
import type { Paginated } from "@/types";

export type ChildWithRelations = ChildDoc & {
  institution?: { _id: Types.ObjectId; name: string; type: string } | null;
  parent?: { _id: Types.ObjectId; fullName: string; mobileNumber?: string } | null;
};

function buildChildFilter(query: ChildListQuery): QueryFilter<ChildDoc> {
  const filter: QueryFilter<ChildDoc> = {};
  if (query.parentId) filter.parentId = new Types.ObjectId(query.parentId);
  if (query.institutionId) filter.institutionId = new Types.ObjectId(query.institutionId);
  if (query.educationStatus) filter.educationStatus = query.educationStatus;
  if (query.gender) filter.gender = query.gender;
  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), "i");
    filter.$or = [{ fullName: pattern }, { classOrGrade: pattern }, { rollNumber: pattern }];
  }
  return filter;
}

/** Joins institution and parent so tables never need a second request. */
const RELATION_STAGES = [
  {
    $lookup: {
      from: "institutions",
      localField: "institutionId",
      foreignField: "_id",
      as: "institution",
      pipeline: [{ $project: { name: 1, type: 1 } }],
    },
  },
  { $unwind: { path: "$institution", preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: "people",
      localField: "parentId",
      foreignField: "_id",
      as: "parent",
      pipeline: [{ $project: { fullName: 1, mobileNumber: 1 } }],
    },
  },
  { $unwind: { path: "$parent", preserveNullAndEmptyArrays: true } },
];

export async function listChildren(
  query: ChildListQuery,
): Promise<Paginated<ChildWithRelations>> {
  await connectToDatabase();

  const filter = buildChildFilter(query);
  const sort = buildSort(query.sortBy, query.sortOrder, CHILD_SORT_FIELDS, "createdAt");

  const [items, total] = await Promise.all([
    Child.aggregate<ChildWithRelations>([
      { $match: filter },
      { $sort: { ...sort, _id: 1 } },
      { $skip: (query.page - 1) * query.limit },
      { $limit: query.limit },
      ...RELATION_STAGES,
    ]),
    Child.countDocuments(filter),
  ]);

  return { items, ...paginate(query.page, query.limit, total) };
}

export async function getChildById(id: string): Promise<ChildWithRelations> {
  await connectToDatabase();
  const [child] = await Child.aggregate<ChildWithRelations>([
    { $match: { _id: toObjectId(id, "Child") } },
    ...RELATION_STAGES,
  ]);
  if (!child) throw new NotFoundError("Child");
  return child;
}

async function assertInstitutionExists(institutionId?: string) {
  if (!institutionId) return;
  const exists = await Institution.exists({ _id: new Types.ObjectId(institutionId) });
  if (!exists) {
    throw new AppError("The selected institution no longer exists", 422, [
      { field: "institutionId", message: "Select a valid institution" },
    ]);
  }
}

export async function createChild(parentId: string, input: CreateChildInput, actor: Actor) {
  await connectToDatabase();
  const parentObjectId = toObjectId(parentId, "Person");

  const parent = await Person.findById(parentObjectId).select("fullName").lean();
  if (!parent) throw new NotFoundError("Person");

  await assertInstitutionExists(input.institutionId);

  const child = await Child.create({
    ...input,
    institutionId: input.institutionId
      ? new Types.ObjectId(input.institutionId)
      : undefined,
    parentId: parentObjectId,
    createdBy: new Types.ObjectId(actor.id),
  });

  await createAuditLog({
    entityType: "Child",
    entityId: child._id,
    entityLabel: `${child.fullName} (child of ${parent.fullName})`,
    action: "CREATE",
    changes: snapshotAsChanges(child.toObject(), CHILD_TRACKED_FIELDS),
    context: actor,
  });

  return getChildById(String(child._id));
}

export async function updateChild(id: string, input: UpdateChildInput, actor: Actor) {
  await connectToDatabase();
  const childId = toObjectId(id, "Child");

  const previous = await Child.findById(childId).lean();
  if (!previous) throw new NotFoundError("Child");

  await assertInstitutionExists(input.institutionId);

  const changes = getChangedFields(
    previous,
    input,
    CHILD_TRACKED_FIELDS,
  );

  if (changes.length === 0) return getChildById(id);

  const patch: Record<string, unknown> = { ...input };
  if ("institutionId" in input) {
    patch.institutionId = input.institutionId
      ? new Types.ObjectId(input.institutionId)
      : null;
  }

  await Child.updateOne(
    { _id: childId },
    { ...patch, updatedBy: new Types.ObjectId(actor.id) },
    { runValidators: true },
  );

  const updated = await getChildById(id);

  await createAuditLog({
    entityType: "Child",
    entityId: childId,
    entityLabel: updated.fullName,
    action: "UPDATE",
    changes,
    context: actor,
  });

  return updated;
}

export async function deleteChild(id: string, actor: Actor) {
  await connectToDatabase();
  const childId = toObjectId(id, "Child");

  const child = await Child.findById(childId).lean();
  if (!child) throw new NotFoundError("Child");

  await Child.deleteOne({ _id: childId });

  await createAuditLog({
    entityType: "Child",
    entityId: childId,
    entityLabel: child.fullName,
    action: "DELETE",
    changes: [{ field: "_deleted", oldValue: false, newValue: true }],
    context: actor,
  });

  return { deleted: true as const };
}

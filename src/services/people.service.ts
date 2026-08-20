import "server-only";
import { Types, type PipelineStage, type QueryFilter } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { Person, type PersonDoc } from "@/models/Person";
import { Child } from "@/models/Child";
import { Contribution } from "@/models/Contribution";
import { NotFoundError } from "@/lib/errors";
import { buildSort, escapeRegex, paginate, toObjectId } from "@/lib/query";
import { createAuditLog, getChangedFields, snapshotAsChanges } from "@/lib/audit";
import type { Actor } from "@/lib/actor";
import {
  PERSON_SORT_FIELDS,
  PERSON_TRACKED_FIELDS,
  type CreatePersonInput,
  type PersonListQuery,
  type UpdatePersonInput,
} from "@/validations/people.schema";
import type { Paginated } from "@/types";

export type PersonListItem = Omit<PersonDoc, "_id" | "createdBy" | "updatedBy"> & {
  _id: string;
  createdBy?: string;
  updatedBy?: string;
  childrenCount: number;
};

function buildPersonFilter(query: PersonListQuery): QueryFilter<PersonDoc> {
  const filter: QueryFilter<PersonDoc> = {};

  if (query.status) {
    filter.status = query.status;
  } else {
    // Archived records are hidden unless explicitly requested.
    filter.status = { $ne: "ARCHIVED" };
  }

  if (query.gender) filter.gender = query.gender;
  if (query.area) filter.area = new RegExp(`^${escapeRegex(query.area)}$`, "i");

  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), "i");
    filter.$or = [
      { fullName: pattern },
      { mobileNumber: pattern },
      { alternativeMobileNumber: pattern },
      { email: pattern },
      { area: pattern },
      { occupation: pattern },
      { fatherOrHusbandName: pattern },
    ];
  }

  return filter;
}

export async function listPeople(query: PersonListQuery): Promise<Paginated<PersonListItem>> {
  await connectToDatabase();

  const filter = buildPersonFilter(query);
  const sort = buildSort(query.sortBy, query.sortOrder, PERSON_SORT_FIELDS, "createdAt");
  const skip = (query.page - 1) * query.limit;

  // The children count is joined in the same round-trip rather than issuing
  // one count query per row.
  const pipeline: PipelineStage[] = [
    { $match: filter },
    { $sort: { ...sort, _id: 1 } },
    { $skip: skip },
    { $limit: query.limit },
    {
      $lookup: {
        from: "children",
        localField: "_id",
        foreignField: "parentId",
        as: "childrenDocs",
        pipeline: [{ $project: { _id: 1 } }],
      },
    },
    { $addFields: { childrenCount: { $size: "$childrenDocs" } } },
    { $project: { childrenDocs: 0 } },
  ];

  if (query.hasChildren) {
    const wantsChildren = query.hasChildren === "true";
    pipeline.splice(1, 0, {
      $lookup: {
        from: "children",
        localField: "_id",
        foreignField: "parentId",
        as: "_childCheck",
        pipeline: [{ $limit: 1 }, { $project: { _id: 1 } }],
      },
    });
    pipeline.splice(2, 0, {
      $match: { _childCheck: wantsChildren ? { $ne: [] } : { $eq: [] } },
    });
  }

  const [items, total] = await Promise.all([
    Person.aggregate(pipeline),
    query.hasChildren
      ? Person.aggregate([
          { $match: filter },
          {
            $lookup: {
              from: "children",
              localField: "_id",
              foreignField: "parentId",
              as: "_childCheck",
              pipeline: [{ $limit: 1 }, { $project: { _id: 1 } }],
            },
          },
          {
            $match: {
              _childCheck: query.hasChildren === "true" ? { $ne: [] } : { $eq: [] },
            },
          },
          { $count: "count" },
        ]).then((rows) => rows[0]?.count ?? 0)
      : Person.countDocuments(filter),
  ]);

  return {
    items: items.map(serializePersonListItem),
    ...paginate(query.page, query.limit, total),
  };
}

function serializePersonListItem(doc: Record<string, unknown>): PersonListItem {
  const { _id, createdBy, updatedBy, _childCheck, ...rest } = doc as Record<string, unknown> & {
    _id: Types.ObjectId;
  };
  void _childCheck;
  return {
    ...(rest as Omit<PersonListItem, "_id" | "createdBy" | "updatedBy" | "childrenCount">),
    _id: String(_id),
    createdBy: createdBy ? String(createdBy) : undefined,
    updatedBy: updatedBy ? String(updatedBy) : undefined,
    childrenCount: Number((doc as { childrenCount?: number }).childrenCount ?? 0),
  };
}

export async function getPersonById(id: string) {
  await connectToDatabase();
  const person = await Person.findById(toObjectId(id, "Person"))
    .populate<{ createdBy: { name: string } }>("createdBy", "name")
    .populate<{ updatedBy: { name: string } }>("updatedBy", "name")
    .lean();

  if (!person) throw new NotFoundError("Person");
  return person;
}

export async function createPerson(input: CreatePersonInput, actor: Actor) {
  await connectToDatabase();

  const person = await Person.create({
    ...input,
    createdBy: new Types.ObjectId(actor.id),
  });

  await createAuditLog({
    entityType: "Person",
    entityId: person._id,
    entityLabel: person.fullName,
    action: "CREATE",
    changes: snapshotAsChanges(person.toObject(), PERSON_TRACKED_FIELDS),
    context: actor,
  });

  return person.toObject();
}

export async function updatePerson(id: string, input: UpdatePersonInput, actor: Actor) {
  await connectToDatabase();
  const personId = toObjectId(id, "Person");

  // Read before write so the audit trail can record exact old → new values.
  const previous = await Person.findById(personId).lean();
  if (!previous) throw new NotFoundError("Person");

  const changes = getChangedFields(
    previous,
    input,
    PERSON_TRACKED_FIELDS,
  );

  if (changes.length === 0) return previous;

  const updated = await Person.findByIdAndUpdate(
    personId,
    { ...input, updatedBy: new Types.ObjectId(actor.id) },
    { new: true, runValidators: true },
  ).lean();

  if (!updated) throw new NotFoundError("Person");

  await createAuditLog({
    entityType: "Person",
    entityId: personId,
    entityLabel: updated.fullName,
    action: "UPDATE",
    changes,
    context: actor,
  });

  return updated;
}

/**
 * Archives a person by default. A hard delete is only allowed when the person
 * has no children and no contributions, so history is never silently orphaned.
 */
export async function deletePerson(id: string, actor: Actor, hard = false) {
  await connectToDatabase();
  const personId = toObjectId(id, "Person");

  const person = await Person.findById(personId).lean();
  if (!person) throw new NotFoundError("Person");

  if (hard) {
    const [childCount, contributionCount] = await Promise.all([
      Child.countDocuments({ parentId: personId }),
      Contribution.countDocuments({ personId }),
    ]);

    if (childCount === 0 && contributionCount === 0) {
      await Person.deleteOne({ _id: personId });
      await createAuditLog({
        entityType: "Person",
        entityId: personId,
        entityLabel: person.fullName,
        action: "DELETE",
        changes: [{ field: "_deleted", oldValue: false, newValue: true }],
        context: actor,
      });
      return { archived: false as const };
    }
  }

  if (person.status === "ARCHIVED") return { archived: true as const };

  await Person.updateOne(
    { _id: personId },
    { status: "ARCHIVED", updatedBy: new Types.ObjectId(actor.id) },
  );

  await createAuditLog({
    entityType: "Person",
    entityId: personId,
    entityLabel: person.fullName,
    action: "DELETE",
    changes: [{ field: "status", oldValue: person.status, newValue: "ARCHIVED" }],
    context: actor,
  });

  return { archived: true as const };
}

/** Distinct area values, used to populate the area filter dropdown. */
export async function listAreas(): Promise<string[]> {
  await connectToDatabase();
  const areas = await Person.distinct("area", { area: { $nin: [null, ""] } });
  return (areas as string[]).filter(Boolean).sort((a, b) => a.localeCompare(b));
}

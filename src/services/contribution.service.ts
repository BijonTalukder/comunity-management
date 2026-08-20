import "server-only";
import { Types, type PipelineStage, type QueryFilter } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { Contribution, type ContributionDoc } from "@/models/Contribution";
import { Event } from "@/models/Event";
import { Person } from "@/models/Person";
import { NotFoundError } from "@/lib/errors";
import { buildSort, escapeRegex, paginate, toObjectId } from "@/lib/query";
import { createAuditLog, getChangedFields, snapshotAsChanges } from "@/lib/audit";
import { toMinorUnits } from "@/lib/money";
import type { Actor } from "@/lib/actor";
import {
  CONTRIBUTION_SORT_FIELDS,
  CONTRIBUTION_TRACKED_FIELDS,
  type ContributionListQuery,
  type CreateContributionInput,
  type UpdateContributionInput,
} from "@/validations/contribution.schema";
import type { Paginated } from "@/types";

export type ContributionRecord = ContributionDoc & {
  person?: {
    _id: Types.ObjectId;
    fullName: string;
    mobileNumber?: string;
    area?: string;
  } | null;
  event?: { _id: Types.ObjectId; name: string } | null;
};

/** One row per contributor for an event, with their running total. */
export type ContributorSummary = {
  personId: Types.ObjectId;
  fullName: string;
  mobileNumber?: string;
  area?: string;
  totalAmountMinor: number;
  paymentCount: number;
  lastPaymentAt: Date;
};

const RELATION_STAGES = [
  {
    $lookup: {
      from: "people",
      localField: "personId",
      foreignField: "_id",
      as: "person",
      pipeline: [{ $project: { fullName: 1, mobileNumber: 1, area: 1 } }],
    },
  },
  { $unwind: { path: "$person", preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: "events",
      localField: "eventId",
      foreignField: "_id",
      as: "event",
      pipeline: [{ $project: { name: 1 } }],
    },
  },
  { $unwind: { path: "$event", preserveNullAndEmptyArrays: true } },
];

function buildContributionFilter(query: ContributionListQuery): QueryFilter<ContributionDoc> {
  const filter: QueryFilter<ContributionDoc> = {};
  if (query.eventId) filter.eventId = new Types.ObjectId(query.eventId);
  if (query.personId) filter.personId = new Types.ObjectId(query.personId);
  if (query.paymentMethod) filter.paymentMethod = query.paymentMethod;
  filter.status = query.status ?? "ACTIVE";

  if (query.dateFrom || query.dateTo) {
    const range: Record<string, Date> = {};
    if (query.dateFrom) range.$gte = query.dateFrom;
    if (query.dateTo) {
      // Make the upper bound inclusive of the whole selected day.
      const end = new Date(query.dateTo);
      end.setHours(23, 59, 59, 999);
      range.$lte = end;
    }
    filter.paymentDate = range;
  }

  return filter;
}

export async function listContributions(
  query: ContributionListQuery,
): Promise<Paginated<ContributionRecord>> {
  await connectToDatabase();

  const filter = buildContributionFilter(query);
  const sort = buildSort(
    query.sortBy,
    query.sortOrder,
    CONTRIBUTION_SORT_FIELDS,
    "paymentDate",
  );

  // A search term matches the contributor, so it can only be applied after the
  // person lookup — which also pushes skip/limit below the join.
  const searchStages: PipelineStage[] = query.search
    ? [
        ...RELATION_STAGES,
        {
          $match: {
            $or: [
              { "person.fullName": { $regex: escapeRegex(query.search), $options: "i" } },
              { "person.mobileNumber": { $regex: escapeRegex(query.search), $options: "i" } },
              { transactionReference: { $regex: escapeRegex(query.search), $options: "i" } },
            ],
          },
        },
      ]
    : [];

  const pipeline: PipelineStage[] = [
    { $match: filter },
    ...searchStages,
    { $sort: { ...sort, _id: 1 } },
    { $skip: (query.page - 1) * query.limit },
    { $limit: query.limit },
    // Without a search term the join happens after the page is cut, so only
    // the rows actually returned are looked up.
    ...(query.search ? [] : RELATION_STAGES),
  ];

  const [items, total] = await Promise.all([
    Contribution.aggregate<ContributionRecord>(pipeline),
    query.search
      ? Contribution.aggregate<{ count: number }>([
          { $match: filter },
          ...searchStages,
          { $count: "count" },
        ]).then((rows) => rows[0]?.count ?? 0)
      : Contribution.countDocuments(filter),
  ]);

  return { items, ...paginate(query.page, query.limit, total) };
}

/** Contributor-level rollup for an event, sorted by amount given. */
export async function listContributorSummary(
  eventId: string,
  query: Pick<ContributionListQuery, "page" | "limit" | "search" | "sortOrder">,
): Promise<Paginated<ContributorSummary>> {
  await connectToDatabase();
  const eventObjectId = toObjectId(eventId, "Event");

  const basePipeline: PipelineStage[] = [
    { $match: { eventId: eventObjectId, status: "ACTIVE" } },
    {
      $group: {
        _id: "$personId",
        totalAmountMinor: { $sum: "$amountMinor" },
        paymentCount: { $sum: 1 },
        lastPaymentAt: { $max: "$paymentDate" },
      },
    },
    {
      $lookup: {
        from: "people",
        localField: "_id",
        foreignField: "_id",
        as: "person",
        pipeline: [{ $project: { fullName: 1, mobileNumber: 1, area: 1 } }],
      },
    },
    { $unwind: { path: "$person", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        personId: "$_id",
        totalAmountMinor: 1,
        paymentCount: 1,
        lastPaymentAt: 1,
        fullName: { $ifNull: ["$person.fullName", "(deleted person)"] },
        mobileNumber: "$person.mobileNumber",
        area: "$person.area",
      },
    },
  ];

  if (query.search) {
    const pattern = escapeRegex(query.search);
    basePipeline.push({
      $match: {
        $or: [
          { fullName: { $regex: pattern, $options: "i" } },
          { mobileNumber: { $regex: pattern, $options: "i" } },
        ],
      },
    });
  }

  const [items, countRows] = await Promise.all([
    Contribution.aggregate<ContributorSummary>([
      ...basePipeline,
      { $sort: { totalAmountMinor: query.sortOrder === "asc" ? 1 : -1, fullName: 1 } },
      { $skip: (query.page - 1) * query.limit },
      { $limit: query.limit },
    ]),
    Contribution.aggregate<{ count: number }>([...basePipeline, { $count: "count" }]),
  ]);

  return {
    items,
    ...paginate(query.page, query.limit, countRows[0]?.count ?? 0),
  };
}

export async function getContributionById(id: string): Promise<ContributionRecord> {
  await connectToDatabase();
  const [record] = await Contribution.aggregate<ContributionRecord>([
    { $match: { _id: toObjectId(id, "Contribution") } },
    ...RELATION_STAGES,
  ]);
  if (!record) throw new NotFoundError("Contribution");
  return record;
}

export async function createContribution(
  eventId: string,
  input: CreateContributionInput,
  actor: Actor,
) {
  await connectToDatabase();
  const eventObjectId = toObjectId(eventId, "Event");
  const personObjectId = toObjectId(input.personId, "Person");

  const [event, person] = await Promise.all([
    Event.findById(eventObjectId).select("name").lean(),
    Person.findById(personObjectId).select("fullName").lean(),
  ]);

  if (!event) throw new NotFoundError("Event");
  if (!person) throw new NotFoundError("Person");

  const contribution = await Contribution.create({
    eventId: eventObjectId,
    personId: personObjectId,
    amountMinor: toMinorUnits(input.amount),
    paymentDate: input.paymentDate,
    paymentMethod: input.paymentMethod,
    transactionReference: input.transactionReference,
    notes: input.notes,
    status: "ACTIVE",
    createdBy: new Types.ObjectId(actor.id),
  });

  await createAuditLog({
    entityType: "Contribution",
    entityId: contribution._id,
    entityLabel: `${person.fullName} → ${event.name}`,
    action: "CREATE",
    changes: snapshotAsChanges(contribution.toObject(), CONTRIBUTION_TRACKED_FIELDS),
    context: actor,
  });

  return getContributionById(String(contribution._id));
}

export async function updateContribution(
  id: string,
  input: UpdateContributionInput,
  actor: Actor,
) {
  await connectToDatabase();
  const contributionId = toObjectId(id, "Contribution");

  const previous = await Contribution.findById(contributionId).lean();
  if (!previous) throw new NotFoundError("Contribution");

  const patch: Record<string, unknown> = { ...input };
  delete patch.amount;
  if (input.amount !== undefined) patch.amountMinor = toMinorUnits(input.amount);

  const changes = getChangedFields(
    previous,
    patch,
    CONTRIBUTION_TRACKED_FIELDS,
  );

  if (changes.length === 0) return getContributionById(id);

  await Contribution.updateOne(
    { _id: contributionId },
    { ...patch, updatedBy: new Types.ObjectId(actor.id) },
    { runValidators: true },
  );

  const updated = await getContributionById(id);

  await createAuditLog({
    entityType: "Contribution",
    entityId: contributionId,
    entityLabel: `${updated.person?.fullName ?? "Unknown"} → ${updated.event?.name ?? "Unknown"}`,
    action: "UPDATE",
    changes,
    context: actor,
  });

  return updated;
}

/**
 * Voids a contribution instead of deleting it, so the payment history stays
 * auditable while the amount drops out of every aggregate.
 */
export async function voidContribution(id: string, actor: Actor) {
  await connectToDatabase();
  const contributionId = toObjectId(id, "Contribution");

  const existing = await getContributionById(id);
  if (existing.status === "VOID") return existing;

  await Contribution.updateOne(
    { _id: contributionId },
    { status: "VOID", updatedBy: new Types.ObjectId(actor.id) },
  );

  await createAuditLog({
    entityType: "Contribution",
    entityId: contributionId,
    entityLabel: `${existing.person?.fullName ?? "Unknown"} → ${existing.event?.name ?? "Unknown"}`,
    action: "DELETE",
    changes: [{ field: "status", oldValue: "ACTIVE", newValue: "VOID" }],
    context: actor,
  });

  return getContributionById(id);
}

/** A person's contributions grouped by event, for the person detail page. */
export async function getPersonContributionsByEvent(personId: string) {
  await connectToDatabase();
  const personObjectId = toObjectId(personId, "Person");

  return Contribution.aggregate<{
    eventId: Types.ObjectId;
    eventName: string;
    eventStatus: string;
    totalAmountMinor: number;
    paymentCount: number;
    lastPaymentAt: Date;
    payments: ContributionDoc[];
  }>([
    { $match: { personId: personObjectId, status: "ACTIVE" } },
    { $sort: { paymentDate: -1 } },
    {
      $group: {
        _id: "$eventId",
        totalAmountMinor: { $sum: "$amountMinor" },
        paymentCount: { $sum: 1 },
        lastPaymentAt: { $max: "$paymentDate" },
        payments: { $push: "$$ROOT" },
      },
    },
    {
      $lookup: {
        from: "events",
        localField: "_id",
        foreignField: "_id",
        as: "event",
        pipeline: [{ $project: { name: 1, status: 1, startDate: 1 } }],
      },
    },
    { $unwind: { path: "$event", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        eventId: "$_id",
        eventName: { $ifNull: ["$event.name", "(deleted event)"] },
        eventStatus: { $ifNull: ["$event.status", "ARCHIVED"] },
        totalAmountMinor: 1,
        paymentCount: 1,
        lastPaymentAt: 1,
        payments: 1,
      },
    },
    { $sort: { lastPaymentAt: -1 } },
  ]);
}

import "server-only";
import { Types, type QueryFilter } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { Event, type EventDoc } from "@/models/Event";
import { Contribution } from "@/models/Contribution";
import { AppError, NotFoundError } from "@/lib/errors";
import { buildSort, escapeRegex, paginate, toObjectId } from "@/lib/query";
import { createAuditLog, getChangedFields, snapshotAsChanges } from "@/lib/audit";
import type { Actor } from "@/lib/actor";
import {
  EVENT_SORT_FIELDS,
  EVENT_TRACKED_FIELDS,
  type CreateEventInput,
  type EventListQuery,
  type UpdateEventInput,
} from "@/validations/event.schema";
import type { Paginated } from "@/types";

export type EventListItem = EventDoc & {
  totalAmountMinor: number;
  contributorCount: number;
  paymentCount: number;
};

export type EventStats = {
  totalAmountMinor: number;
  contributorCount: number;
  paymentCount: number;
  averagePerContributorMinor: number;
  averagePaymentMinor: number;
  largestPaymentMinor: number;
  lastPaymentAt: Date | null;
};

function buildEventFilter(query: EventListQuery): QueryFilter<EventDoc> {
  const filter: QueryFilter<EventDoc> = {};
  if (query.status) filter.status = query.status;
  if (query.eventType) filter.eventType = new RegExp(`^${escapeRegex(query.eventType)}$`, "i");
  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), "i");
    filter.$or = [{ name: pattern }, { eventType: pattern }, { location: pattern }];
  }
  return filter;
}

/**
 * Aggregates contribution totals per event in one pass. Totals are never
 * denormalised onto the event document, so voiding a payment is immediately
 * reflected everywhere.
 */
const TOTALS_STAGES = [
  {
    $lookup: {
      from: "contributions",
      localField: "_id",
      foreignField: "eventId",
      as: "contributions",
      pipeline: [
        { $match: { status: "ACTIVE" } },
        { $project: { amountMinor: 1, personId: 1 } },
      ],
    },
  },
  {
    $addFields: {
      totalAmountMinor: { $sum: "$contributions.amountMinor" },
      paymentCount: { $size: "$contributions" },
      contributorCount: { $size: { $setUnion: ["$contributions.personId", []] } },
    },
  },
  { $project: { contributions: 0 } },
];

export async function listEvents(query: EventListQuery): Promise<Paginated<EventListItem>> {
  await connectToDatabase();

  const filter = buildEventFilter(query);
  const sort = buildSort(query.sortBy, query.sortOrder, EVENT_SORT_FIELDS, "startDate");

  const [items, total] = await Promise.all([
    Event.aggregate<EventListItem>([
      { $match: filter },
      { $sort: { ...sort, _id: 1 } },
      { $skip: (query.page - 1) * query.limit },
      { $limit: query.limit },
      ...TOTALS_STAGES,
    ]),
    Event.countDocuments(filter),
  ]);

  return { items, ...paginate(query.page, query.limit, total) };
}

export async function getEventById(id: string) {
  await connectToDatabase();
  const event = await Event.findById(toObjectId(id, "Event")).lean();
  if (!event) throw new NotFoundError("Event");
  return event;
}

export async function getEventStats(id: string): Promise<EventStats> {
  await connectToDatabase();
  const eventId = toObjectId(id, "Event");

  const [row] = await Contribution.aggregate<{
    totalAmountMinor: number;
    paymentCount: number;
    contributors: Types.ObjectId[];
    largestPaymentMinor: number;
    lastPaymentAt: Date | null;
  }>([
    { $match: { eventId, status: "ACTIVE" } },
    {
      $group: {
        _id: null,
        totalAmountMinor: { $sum: "$amountMinor" },
        paymentCount: { $sum: 1 },
        contributors: { $addToSet: "$personId" },
        largestPaymentMinor: { $max: "$amountMinor" },
        lastPaymentAt: { $max: "$paymentDate" },
      },
    },
  ]);

  const totalAmountMinor = row?.totalAmountMinor ?? 0;
  const paymentCount = row?.paymentCount ?? 0;
  const contributorCount = row?.contributors.length ?? 0;

  return {
    totalAmountMinor,
    paymentCount,
    contributorCount,
    averagePerContributorMinor:
      contributorCount > 0 ? Math.round(totalAmountMinor / contributorCount) : 0,
    averagePaymentMinor: paymentCount > 0 ? Math.round(totalAmountMinor / paymentCount) : 0,
    largestPaymentMinor: row?.largestPaymentMinor ?? 0,
    lastPaymentAt: row?.lastPaymentAt ?? null,
  };
}

export async function createEvent(input: CreateEventInput, actor: Actor) {
  await connectToDatabase();

  const event = await Event.create({
    ...input,
    createdBy: new Types.ObjectId(actor.id),
  });

  await createAuditLog({
    entityType: "Event",
    entityId: event._id,
    entityLabel: event.name,
    action: "CREATE",
    changes: snapshotAsChanges(event.toObject(), EVENT_TRACKED_FIELDS),
    context: actor,
  });

  return event.toObject();
}

export async function updateEvent(id: string, input: UpdateEventInput, actor: Actor) {
  await connectToDatabase();
  const eventId = toObjectId(id, "Event");

  const previous = await Event.findById(eventId).lean();
  if (!previous) throw new NotFoundError("Event");

  // Cross-field validation needs the merged document, not just the patch.
  const startDate = input.startDate ?? previous.startDate;
  const endDate = input.endDate ?? previous.endDate;
  if (startDate && endDate && endDate < startDate) {
    throw new AppError("Validation failed", 422, [
      { field: "endDate", message: "End date must be on or after the start date" },
    ]);
  }

  const changes = getChangedFields(
    previous,
    input,
    EVENT_TRACKED_FIELDS,
  );

  if (changes.length === 0) return previous;

  const updated = await Event.findByIdAndUpdate(
    eventId,
    { ...input, updatedBy: new Types.ObjectId(actor.id) },
    { new: true, runValidators: true },
  ).lean();

  if (!updated) throw new NotFoundError("Event");

  await createAuditLog({
    entityType: "Event",
    entityId: eventId,
    entityLabel: updated.name,
    action: "UPDATE",
    changes,
    context: actor,
  });

  return updated;
}

/** Events with contributions are archived rather than deleted. */
export async function deleteEvent(id: string, actor: Actor) {
  await connectToDatabase();
  const eventId = toObjectId(id, "Event");

  const event = await Event.findById(eventId).lean();
  if (!event) throw new NotFoundError("Event");

  const contributionCount = await Contribution.countDocuments({ eventId });

  if (contributionCount === 0) {
    await Event.deleteOne({ _id: eventId });
    await createAuditLog({
      entityType: "Event",
      entityId: eventId,
      entityLabel: event.name,
      action: "DELETE",
      changes: [{ field: "_deleted", oldValue: false, newValue: true }],
      context: actor,
    });
    return { archived: false as const };
  }

  if (event.status !== "ARCHIVED") {
    await Event.updateOne(
      { _id: eventId },
      { status: "ARCHIVED", updatedBy: new Types.ObjectId(actor.id) },
    );
    await createAuditLog({
      entityType: "Event",
      entityId: eventId,
      entityLabel: event.name,
      action: "DELETE",
      changes: [{ field: "status", oldValue: event.status, newValue: "ARCHIVED" }],
      context: actor,
    });
  }

  return { archived: true as const };
}

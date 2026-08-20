import "server-only";
import { connectToDatabase } from "@/lib/mongodb";
import { Person } from "@/models/Person";
import { Child } from "@/models/Child";
import { Institution } from "@/models/Institution";
import { Event } from "@/models/Event";
import { Contribution } from "@/models/Contribution";
import { AuditLog } from "@/models/AuditLog";
import type { Gender } from "@/types";

export type DashboardSummary = {
  totals: {
    people: number;
    children: number;
    male: number;
    female: number;
    other: number;
    institutions: number;
    events: number;
    contributionMinor: number;
  };
  genderDistribution: { gender: Gender; count: number }[];
  contributionsByEvent: { eventId: string; name: string; totalMinor: number }[];
  monthlyContributions: { month: string; totalMinor: number }[];
  recentActivity: {
    _id: string;
    entityType: string;
    entityLabel?: string;
    action: string;
    performedAt: string;
    performerName?: string;
  }[];
};

/**
 * All dashboard figures are computed with aggregations at read time — nothing
 * is denormalised, so the numbers can never drift from the source records.
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  await connectToDatabase();

  const activePeopleFilter = { status: { $ne: "ARCHIVED" as const } };
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const [
    peopleCount,
    childrenCount,
    genderRows,
    institutionCount,
    eventCount,
    contributionTotal,
    byEvent,
    byMonth,
    recentActivity,
  ] = await Promise.all([
    Person.countDocuments(activePeopleFilter),
    Child.countDocuments({}),
    Person.aggregate<{ _id: Gender; count: number }>([
      { $match: activePeopleFilter },
      { $group: { _id: "$gender", count: { $sum: 1 } } },
    ]),
    Institution.countDocuments({}),
    Event.countDocuments({}),
    Contribution.aggregate<{ total: number }>([
      { $match: { status: "ACTIVE" } },
      { $group: { _id: null, total: { $sum: "$amountMinor" } } },
    ]),
    Contribution.aggregate<{ _id: string; name: string; totalMinor: number }>([
      { $match: { status: "ACTIVE" } },
      { $group: { _id: "$eventId", totalMinor: { $sum: "$amountMinor" } } },
      { $sort: { totalMinor: -1 } },
      { $limit: 8 },
      {
        $lookup: {
          from: "events",
          localField: "_id",
          foreignField: "_id",
          as: "event",
          pipeline: [{ $project: { name: 1 } }],
        },
      },
      { $unwind: { path: "$event", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          totalMinor: 1,
          name: { $ifNull: ["$event.name", "(deleted event)"] },
        },
      },
    ]),
    Contribution.aggregate<{ _id: string; totalMinor: number }>([
      { $match: { status: "ACTIVE", paymentDate: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$paymentDate" } },
          totalMinor: { $sum: "$amountMinor" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    AuditLog.aggregate([
      { $sort: { performedAt: -1 } },
      { $limit: 8 },
      {
        $lookup: {
          from: "users",
          localField: "performedBy",
          foreignField: "_id",
          as: "performer",
          pipeline: [{ $project: { name: 1 } }],
        },
      },
      { $unwind: { path: "$performer", preserveNullAndEmptyArrays: true } },
    ]),
  ]);

  const genderMap = new Map(genderRows.map((row) => [row._id, row.count]));

  // Fill in months with no payments so the chart has a continuous axis.
  const monthlyMap = new Map(byMonth.map((row) => [row._id, row.totalMinor]));
  const monthlyContributions: { month: string; totalMinor: number }[] = [];
  const cursor = new Date(twelveMonthsAgo);
  for (let i = 0; i < 12; i += 1) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    monthlyContributions.push({ month: key, totalMinor: monthlyMap.get(key) ?? 0 });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return {
    totals: {
      people: peopleCount,
      children: childrenCount,
      male: genderMap.get("MALE") ?? 0,
      female: genderMap.get("FEMALE") ?? 0,
      other: genderMap.get("OTHER") ?? 0,
      institutions: institutionCount,
      events: eventCount,
      contributionMinor: contributionTotal[0]?.total ?? 0,
    },
    genderDistribution: (["MALE", "FEMALE", "OTHER"] as const).map((gender) => ({
      gender,
      count: genderMap.get(gender) ?? 0,
    })),
    contributionsByEvent: byEvent.map((row) => ({
      eventId: String(row._id),
      name: row.name,
      totalMinor: row.totalMinor,
    })),
    monthlyContributions,
    recentActivity: recentActivity.map((row) => ({
      _id: String(row._id),
      entityType: row.entityType,
      entityLabel: row.entityLabel,
      action: row.action,
      performedAt: new Date(row.performedAt).toISOString(),
      performerName: row.performer?.name,
    })),
  };
}

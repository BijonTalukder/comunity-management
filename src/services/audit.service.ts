import "server-only";
import { Types, type QueryFilter } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { AuditLog, type AuditLogDoc } from "@/models/AuditLog";
import { User } from "@/models/User";
import { buildSort, escapeRegex, paginate } from "@/lib/query";
import { AUDIT_SORT_FIELDS, type AuditListQuery } from "@/validations/audit.schema";
import type { Paginated } from "@/types";

export type AuditLogEntry = AuditLogDoc & {
  performer?: { _id: Types.ObjectId; name: string; email: string } | null;
};

function buildAuditFilter(query: AuditListQuery): QueryFilter<AuditLogDoc> {
  const filter: QueryFilter<AuditLogDoc> = {};
  if (query.action) filter.action = query.action;
  if (query.entityType) filter.entityType = query.entityType;
  if (query.entityId) filter.entityId = query.entityId;
  if (query.performedBy) filter.performedBy = new Types.ObjectId(query.performedBy);

  if (query.dateFrom || query.dateTo) {
    const range: Record<string, Date> = {};
    if (query.dateFrom) range.$gte = query.dateFrom;
    if (query.dateTo) {
      const end = new Date(query.dateTo);
      end.setHours(23, 59, 59, 999);
      range.$lte = end;
    }
    filter.performedAt = range;
  }

  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), "i");
    filter.$or = [{ entityLabel: pattern }, { entityType: pattern }, { ipAddress: pattern }];
  }

  return filter;
}

export async function listAuditLogs(
  query: AuditListQuery,
): Promise<Paginated<AuditLogEntry>> {
  await connectToDatabase();

  const filter = buildAuditFilter(query);
  const sort = buildSort(query.sortBy, query.sortOrder, AUDIT_SORT_FIELDS, "performedAt");

  const [items, total] = await Promise.all([
    AuditLog.aggregate<AuditLogEntry>([
      { $match: filter },
      { $sort: { ...sort, _id: -1 } },
      { $skip: (query.page - 1) * query.limit },
      { $limit: query.limit },
      {
        $lookup: {
          from: "users",
          localField: "performedBy",
          foreignField: "_id",
          as: "performer",
          pipeline: [{ $project: { name: 1, email: 1 } }],
        },
      },
      { $unwind: { path: "$performer", preserveNullAndEmptyArrays: true } },
    ]),
    AuditLog.countDocuments(filter),
  ]);

  return { items, ...paginate(query.page, query.limit, total) };
}

/** Activity feed for one record, used by the "Activity history" tabs. */
export async function listEntityActivity(
  entityType: string,
  entityId: string,
  limit = 50,
): Promise<AuditLogEntry[]> {
  await connectToDatabase();
  return AuditLog.aggregate<AuditLogEntry>([
    { $match: { entityType, entityId } },
    { $sort: { performedAt: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "users",
        localField: "performedBy",
        foreignField: "_id",
        as: "performer",
        pipeline: [{ $project: { name: 1, email: 1 } }],
      },
    },
    { $unwind: { path: "$performer", preserveNullAndEmptyArrays: true } },
  ]);
}

/** Users that appear in the log, for the "User" filter dropdown. */
export async function listAuditPerformers() {
  await connectToDatabase();
  const ids = await AuditLog.distinct("performedBy");
  const validIds = (ids as (Types.ObjectId | null)[]).filter(Boolean) as Types.ObjectId[];
  return User.find({ _id: { $in: validIds } })
    .select("name email")
    .sort({ name: 1 })
    .lean();
}

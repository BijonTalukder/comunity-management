import "server-only";
import { Types } from "mongoose";
import { AuditLog, type AuditChange } from "@/models/AuditLog";
import { connectToDatabase } from "@/lib/mongodb";
import type { AuditAction, AuditEntityType } from "@/types";

export type AuditContext = {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
};

type CreateAuditLogInput = {
  entityType: AuditEntityType;
  entityId?: string | Types.ObjectId;
  entityLabel?: string;
  action: AuditAction;
  changes?: AuditChange[];
  context: AuditContext;
};

/** Values that are never written to the audit trail. */
const REDACTED_FIELDS = new Set(["passwordHash", "password", "confirmPassword"]);

function normalizeValue(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Types.ObjectId) return value.toString();
  if (Array.isArray(value)) return value.map(normalizeValue);
  return value;
}

/** Structural comparison that treats null/undefined/"" as the same empty value. */
function isEqual(a: unknown, b: unknown): boolean {
  const left = normalizeValue(a);
  const right = normalizeValue(b);
  const leftEmpty = left === null || left === "";
  const rightEmpty = right === null || right === "";
  if (leftEmpty && rightEmpty) return true;
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Diffs an update payload against the stored document, returning one entry per
 * genuinely changed field. Keys absent from `next` are treated as untouched.
 */
export function getChangedFields(
  previous: object,
  next: object,
  trackedFields?: readonly string[],
): AuditChange[] {
  const before = previous as Record<string, unknown>;
  const after = next as Record<string, unknown>;

  const candidates = (trackedFields ?? Object.keys(after)).filter(
    (field) => !REDACTED_FIELDS.has(field),
  );

  const changes: AuditChange[] = [];
  for (const field of candidates) {
    if (!(field in after)) continue;
    const oldValue = before[field];
    const newValue = after[field];
    if (isEqual(oldValue, newValue)) continue;
    changes.push({
      field,
      oldValue: normalizeValue(oldValue),
      newValue: normalizeValue(newValue),
    });
  }
  return changes;
}

/**
 * Writes an audit entry. Failures are logged but never propagate — an audit
 * write must not roll back or fail the business operation that succeeded.
 */
export async function createAuditLog(input: CreateAuditLogInput): Promise<void> {
  try {
    await connectToDatabase();
    await AuditLog.create({
      entityType: input.entityType,
      entityId: input.entityId ? String(input.entityId) : undefined,
      entityLabel: input.entityLabel,
      action: input.action,
      changes: input.changes && input.changes.length > 0 ? input.changes : undefined,
      performedBy: Types.ObjectId.isValid(input.context.userId)
        ? new Types.ObjectId(input.context.userId)
        : undefined,
      ipAddress: input.context.ipAddress,
      userAgent: input.context.userAgent,
      performedAt: new Date(),
    });
  } catch (error) {
    console.error("[audit] Failed to write audit log:", error);
  }
}

/** Snapshot of a created record, stored as field-by-field "new value" entries. */
export function snapshotAsChanges(
  document: object,
  trackedFields: readonly string[],
): AuditChange[] {
  const source = document as Record<string, unknown>;
  return trackedFields
    .filter((field) => !REDACTED_FIELDS.has(field))
    .filter((field) => {
      const value = source[field];
      return value !== undefined && value !== null && value !== "";
    })
    .map((field) => ({
      field,
      oldValue: null,
      newValue: normalizeValue(source[field]),
    }));
}

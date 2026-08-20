import { Schema, model, models, type Model, type Types } from "mongoose";
import { AUDIT_ACTIONS, type AuditAction } from "@/types";

export interface AuditChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface AuditLogDoc {
  _id: Types.ObjectId;
  entityType: string;
  entityId?: Types.ObjectId | string;
  entityLabel?: string;
  action: AuditAction;
  changes?: AuditChange[];
  performedBy?: Types.ObjectId;
  ipAddress?: string;
  userAgent?: string;
  performedAt: Date;
}

const auditChangeSchema = new Schema<AuditChange>(
  {
    field: { type: String, required: true },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

const auditLogSchema = new Schema<AuditLogDoc>(
  {
    entityType: { type: String, required: true, index: true },
    entityId: { type: Schema.Types.Mixed },
    // Denormalised display name so the log stays readable after the record is
    // deleted and can be rendered without an extra lookup per row.
    entityLabel: { type: String, trim: true, maxlength: 300 },
    action: { type: String, enum: AUDIT_ACTIONS, required: true },
    changes: { type: [auditChangeSchema], default: undefined },
    performedBy: { type: Schema.Types.ObjectId, ref: "User" },
    ipAddress: { type: String, trim: true, maxlength: 64 },
    userAgent: { type: String, trim: true, maxlength: 400 },
    performedAt: { type: Date, required: true, default: () => new Date() },
  },
  { collection: "audit_logs", versionKey: false },
);

auditLogSchema.index({ entityType: 1, entityId: 1, performedAt: -1 });
auditLogSchema.index({ performedBy: 1, performedAt: -1 });
auditLogSchema.index({ performedAt: -1 });
auditLogSchema.index({ action: 1 });

export const AuditLog: Model<AuditLogDoc> =
  (models.AuditLog as Model<AuditLogDoc>) ??
  model<AuditLogDoc>("AuditLog", auditLogSchema);

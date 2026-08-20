import { z } from "zod";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/types";
import { objectIdSchema } from "@/validations/common";
import { listQuerySchema } from "@/validations/list";

export const auditListQuerySchema = listQuerySchema.extend({
  action: z.enum(AUDIT_ACTIONS).optional(),
  entityType: z.enum(AUDIT_ENTITY_TYPES).optional(),
  entityId: z.string().trim().max(64).optional(),
  performedBy: objectIdSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export type AuditListQuery = z.infer<typeof auditListQuerySchema>;

export const AUDIT_SORT_FIELDS = ["performedAt", "action", "entityType"] as const;

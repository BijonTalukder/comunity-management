import { History } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDateTime, formatRelative } from "@/lib/format";
import { LABELS } from "@/types";
import type { AuditChange } from "@/models/AuditLog";

export type ActivityEntry = {
  _id: string;
  action: string;
  entityType: string;
  entityLabel?: string;
  performedAt: string | Date;
  ipAddress?: string;
  changes?: AuditChange[];
  performer?: { name: string; email: string } | null;
};

function renderValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const text = String(value);
  // Dates are stored ISO-encoded in the log; show just the calendar date.
  return /^\d{4}-\d{2}-\d{2}T/.test(text) ? text.slice(0, 10) : text;
}

/** Vertical feed of audit entries with the exact field-level diff. */
export function ActivityTimeline({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No activity yet"
        description="Changes to this record will appear here with the exact fields that changed."
      />
    );
  }

  return (
    <ol className="relative space-y-6 border-l pl-6">
      {entries.map((entry) => (
        <li key={entry._id} className="relative">
          <span
            className="absolute -left-[1.9rem] top-1 flex size-3 items-center justify-center rounded-full border-2 border-background bg-primary"
            aria-hidden
          />

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              status={entry.action}
              label={LABELS.auditAction[entry.action as keyof typeof LABELS.auditAction] ?? entry.action}
            />
            <span className="text-sm font-medium">{entry.performer?.name ?? "System"}</span>
            <span className="text-xs text-muted-foreground">
              {formatDateTime(entry.performedAt)} · {formatRelative(entry.performedAt)}
            </span>
          </div>

          {entry.changes && entry.changes.length > 0 ? (
            <ul className="mt-2 space-y-1 rounded-lg border bg-muted/35 p-3 text-sm">
              {entry.changes.map((change, index) => (
                <li key={`${change.field}-${index}`} className="flex flex-wrap items-baseline gap-2">
                  <span className="font-medium">{change.field}</span>
                  <span className="text-muted-foreground line-through decoration-muted-foreground/50">
                    {renderValue(change.oldValue)}
                  </span>
                  <span className="text-muted-foreground" aria-hidden>
                    →
                  </span>
                  <span className="font-medium text-foreground">
                    {renderValue(change.newValue)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          {entry.ipAddress ? (
            <p className="mt-1.5 text-xs text-muted-foreground">From {entry.ipAddress}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

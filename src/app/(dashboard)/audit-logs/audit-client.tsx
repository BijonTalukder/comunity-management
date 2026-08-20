"use client";

import { Fragment, useState } from "react";
import { ChevronDown, RotateCcw, ScrollText } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/shared/search-input";
import { FilterSelect, optionsFromLabels } from "@/components/shared/filter-select";
import { SortHeader } from "@/components/shared/sort-header";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { ExportMenu } from "@/components/shared/export-menu";
import { useListParams } from "@/hooks/use-list-params";
import { ListPendingBar } from "@/components/shared/list-pending-bar";
import { formatDateTime } from "@/lib/format";
import { AUDIT_ENTITY_TYPES, LABELS, type AuditAction, type Paginated } from "@/types";
import type { AuditChange } from "@/models/AuditLog";
import { cn } from "@/lib/utils";

export type AuditRow = {
  _id: string;
  entityType: string;
  entityId?: string;
  entityLabel?: string;
  action: AuditAction;
  changes?: AuditChange[];
  ipAddress?: string;
  userAgent?: string;
  performedAt: string;
  performer?: { _id: string; name: string; email: string } | null;
};

function renderValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const text = String(value);
  return /^\d{4}-\d{2}-\d{2}T/.test(text) ? text.slice(0, 10) : text;
}

/** Date filter bound to a URL param, applied as the user picks. */
function DateFilter({ paramKey, label }: { paramKey: string; label: string }) {
  const { get, setParams } = useListParams();
  return (
    <Input
      type="date"
      aria-label={label}
      title={label}
      value={get(paramKey)}
      onChange={(event) => setParams({ [paramKey]: event.target.value || undefined })}
      className="w-[150px]"
    />
  );
}

export function AuditClient({
  data,
  performers,
  canExport,
}: {
  data: Paginated<AuditRow>;
  performers: { _id: string; name: string }[];
  canExport: boolean;
}) {
  const { params, reset } = useListParams();
  const [expanded, setExpanded] = useState<string | null>(null);

  const activeFilterCount = [
    "search",
    "action",
    "entityType",
    "performedBy",
    "dateFrom",
    "dateTo",
  ].filter((key) => params.get(key)).length;

  return (
    <>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput placeholder="Search record or IP…" />
          <FilterSelect
            paramKey="action"
            placeholder="All actions"
            options={optionsFromLabels(LABELS.auditAction)}
            className="w-[160px]"
          />
          <FilterSelect
            paramKey="entityType"
            placeholder="All modules"
            options={AUDIT_ENTITY_TYPES.map((type) => ({ value: type, label: type }))}
            className="w-[150px]"
          />
          <FilterSelect
            paramKey="performedBy"
            placeholder="All users"
            options={performers.map((performer) => ({
              value: performer._id,
              label: performer.name,
            }))}
            className="w-[170px]"
          />
          <DateFilter paramKey="dateFrom" label="From date" />
          <DateFilter paramKey="dateTo" label="To date" />

          {activeFilterCount > 0 ? (
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="size-3.5" />
              Reset ({activeFilterCount})
            </Button>
          ) : null}
        </div>

        {canExport ? (
          <ExportMenu
            basePath="/api/reports/audit-logs"
            searchParams={Object.fromEntries(params.entries())}
          />
        ) : null}
      </div>

      <ListPendingBar />

      {data.items.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState
            icon={ScrollText}
            title="No audit entries match these filters"
            description="Every create, update, delete, sign-in and export is recorded here."
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="thin-scrollbar overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-10" />
                  <SortHeader field="performedAt" className="min-w-[170px]">
                    Date &amp; time
                  </SortHeader>
                  <TableHead className="min-w-[150px]">User</TableHead>
                  <SortHeader field="action">Action</SortHeader>
                  <SortHeader field="entityType">Module</SortHeader>
                  <TableHead className="min-w-[200px]">Record</TableHead>
                  <TableHead>Changes</TableHead>
                  <TableHead>IP address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((entry) => {
                  const changeCount = entry.changes?.length ?? 0;
                  const isOpen = expanded === entry._id;
                  return (
                    // The fragment is the array element, so the key lives here.
                    <Fragment key={entry._id}>
                      <TableRow
                        className={cn(changeCount > 0 && "cursor-pointer", isOpen && "bg-muted/30")}
                        onClick={() =>
                          changeCount > 0 && setExpanded(isOpen ? null : entry._id)
                        }
                      >
                        <TableCell>
                          {changeCount > 0 ? (
                            <ChevronDown
                              className={cn(
                                "size-4 text-muted-foreground transition-transform",
                                isOpen && "rotate-180",
                              )}
                              aria-hidden
                            />
                          ) : null}
                        </TableCell>
                        <TableCell className="tabular text-sm whitespace-nowrap">
                          {formatDateTime(entry.performedAt)}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">
                            {entry.performer?.name ?? "System"}
                          </p>
                          {entry.performer ? (
                            <p className="truncate text-xs text-muted-foreground">
                              {entry.performer.email}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={entry.action}
                            label={LABELS.auditAction[entry.action]}
                          />
                        </TableCell>
                        <TableCell className="text-sm">{entry.entityType}</TableCell>
                        <TableCell className="text-sm">
                          {entry.entityLabel || (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="tabular text-sm text-muted-foreground">
                          {changeCount > 0 ? `${changeCount} field${changeCount === 1 ? "" : "s"}` : "—"}
                        </TableCell>
                        <TableCell className="tabular text-sm text-muted-foreground">
                          {entry.ipAddress || "—"}
                        </TableCell>
                      </TableRow>

                      {isOpen && entry.changes ? (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={8} className="bg-muted/20 p-0">
                            <div className="space-y-3 px-6 py-4">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                                    <th className="pb-2 pr-6 font-medium">Field</th>
                                    <th className="pb-2 pr-6 font-medium">Old value</th>
                                    <th className="pb-2 font-medium">New value</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                  {entry.changes.map((change, index) => (
                                    <tr key={`${change.field}-${index}`}>
                                      <td className="py-2 pr-6 font-medium">{change.field}</td>
                                      <td className="py-2 pr-6 text-muted-foreground">
                                        {renderValue(change.oldValue)}
                                      </td>
                                      <td className="py-2 font-medium">
                                        {renderValue(change.newValue)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>

                              {entry.userAgent ? (
                                <p className="text-xs text-muted-foreground">
                                  {entry.userAgent}
                                </p>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <Pagination {...data} />
        </div>
      )}
    </>
  );
}

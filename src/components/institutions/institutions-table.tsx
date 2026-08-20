"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, GraduationCap, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SortHeader } from "@/components/shared/sort-header";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { InstitutionFormDialog } from "@/components/institutions/institution-form";
import { api } from "@/lib/api-client";
import { LABELS, type InstitutionStatus, type InstitutionType, type Paginated } from "@/types";

export type InstitutionRow = {
  _id: string;
  name: string;
  type: InstitutionType;
  area?: string;
  city?: string;
  country?: string;
  address?: string;
  status: InstitutionStatus;
  childrenCount: number;
};

export function InstitutionsTable({
  data,
  canWrite,
  canDelete,
  hasFilters,
}: {
  data: Paginated<InstitutionRow>;
  canWrite: boolean;
  canDelete: boolean;
  hasFilters: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<InstitutionRow | null>(null);
  const [deleting, setDeleting] = useState<InstitutionRow | null>(null);

  const remove = async () => {
    if (!deleting) return;
    try {
      await api.delete(`/api/institutions/${deleting._id}`);
      toast.success(`${deleting.name} deleted`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete this institution");
    }
  };

  if (data.items.length === 0) {
    return (
      <div className="rounded-xl border bg-card">
        <EmptyState
          icon={Building2}
          title={hasFilters ? "No institutions match these filters" : "No institutions yet"}
          description={
            hasFilters
              ? "Try a different search term or clear the filters."
              : "Institutions are usually created on the fly while adding a child, but you can add them here too."
          }
        />
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="thin-scrollbar overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <SortHeader field="name" className="min-w-[240px]">
                  Institution
                </SortHeader>
                <SortHeader field="type">Type</SortHeader>
                <TableHead className="min-w-[180px]">Location</TableHead>
                <TableHead>Students</TableHead>
                <SortHeader field="status">Status</SortHeader>
                {canWrite || canDelete ? <TableHead className="w-12" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((institution) => (
                <TableRow key={institution._id}>
                  <TableCell>
                    <p className="font-medium">{institution.name}</p>
                    {institution.address ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {institution.address}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm">
                    {LABELS.institutionType[institution.type]}
                  </TableCell>
                  <TableCell className="text-sm">
                    {[institution.area, institution.city, institution.country]
                      .filter(Boolean)
                      .join(", ") || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {institution.childrenCount > 0 ? (
                      <Badge variant="secondary" className="tabular gap-1">
                        <GraduationCap className="size-3" aria-hidden />
                        {institution.childrenCount}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={institution.status}
                      label={LABELS.institutionStatus[institution.status]}
                    />
                  </TableCell>
                  {canWrite || canDelete ? (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label={`Actions for ${institution.name}`}
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canWrite ? (
                            <DropdownMenuItem onSelect={() => setEditing(institution)}>
                              <Pencil className="size-4" />
                              Edit
                            </DropdownMenuItem>
                          ) : null}
                          {canDelete ? (
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => setDeleting(institution)}
                            >
                              <Trash2 className="size-4" />
                              Delete
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Pagination {...data} />
      </div>

      <InstitutionFormDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        institution={editing ?? undefined}
        institutionId={editing?._id}
        onSaved={() => router.refresh()}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        description={
          deleting && deleting.childrenCount > 0
            ? `This institution is linked to ${deleting.childrenCount} child record${deleting.childrenCount === 1 ? "" : "s"}, so it cannot be deleted. Mark it inactive instead.`
            : "This permanently removes the institution. The action is recorded in the audit log."
        }
        confirmLabel="Delete"
        destructive
        onConfirm={remove}
      />
    </>
  );
}

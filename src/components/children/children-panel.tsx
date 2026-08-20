"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Baby, GraduationCap, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ChildFormDialog, type ChildFormInitial } from "@/components/children/child-form";
import { api } from "@/lib/api-client";
import { calculateAge, formatDate } from "@/lib/format";
import { LABELS, type EducationStatus, type Gender, type Relationship } from "@/types";

export type ChildRow = {
  _id: string;
  fullName: string;
  gender: Gender;
  dateOfBirth?: string;
  relationship: Relationship;
  educationStatus: EducationStatus;
  classOrGrade?: string;
  section?: string;
  rollNumber?: string;
  notes?: string;
  institution?: { _id: string; name: string; type: string } | null;
};

export function ChildrenPanel({
  parentId,
  items,
  canWrite,
  canDelete,
}: {
  parentId: string;
  /** Named `items` rather than `children`, which React reserves for content. */
  items: ChildRow[];
  canWrite: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ChildFormInitial | undefined>();
  const [deleting, setDeleting] = useState<ChildRow | null>(null);

  const openCreate = () => {
    setEditing(undefined);
    setFormOpen(true);
  };

  const openEdit = (child: ChildRow) => {
    setEditing(child as ChildFormInitial);
    setFormOpen(true);
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await api.delete(`/api/children/${deleting._id}`);
      toast.success(`${deleting.fullName} removed`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove this child");
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Children</h2>
          <p className="text-sm text-muted-foreground">
            {items.length} record{items.length === 1 ? "" : "s"}
          </p>
        </div>
        {canWrite ? (
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" />
            Add child
          </Button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState
            icon={Baby}
            title="No children recorded"
            description="Add a child to track their school, class and roll number."
            action={
              canWrite ? (
                <Button size="sm" onClick={openCreate}>
                  <Plus className="size-4" />
                  Add child
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="thin-scrollbar overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="min-w-[180px]">Name</TableHead>
                  <TableHead>Relationship</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Education</TableHead>
                  <TableHead className="min-w-[200px]">Institution</TableHead>
                  <TableHead>Class</TableHead>
                  {canWrite || canDelete ? <TableHead className="w-12" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((child) => {
                  const age = calculateAge(child.dateOfBirth);
                  return (
                    <TableRow key={child._id}>
                      <TableCell>
                        <p className="font-medium">{child.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          {LABELS.gender[child.gender]}
                          {child.dateOfBirth ? ` · ${formatDate(child.dateOfBirth)}` : ""}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm">
                        {LABELS.relationship[child.relationship]}
                      </TableCell>
                      <TableCell className="tabular text-sm">
                        {age !== null ? `${age} yrs` : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={child.educationStatus}
                          label={LABELS.educationStatus[child.educationStatus]}
                        />
                      </TableCell>
                      <TableCell>
                        {child.institution ? (
                          <Link
                            href={`/institutions?search=${encodeURIComponent(child.institution.name)}`}
                            className="inline-flex items-center gap-1.5 text-sm hover:underline"
                          >
                            <GraduationCap className="size-3.5 text-muted-foreground" aria-hidden />
                            {child.institution.name}
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {child.classOrGrade || "—"}
                        {child.section ? (
                          <span className="text-muted-foreground"> · {child.section}</span>
                        ) : null}
                        {child.rollNumber ? (
                          <p className="tabular text-xs text-muted-foreground">
                            Roll {child.rollNumber}
                          </p>
                        ) : null}
                      </TableCell>
                      {canWrite || canDelete ? (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                aria-label={`Actions for ${child.fullName}`}
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canWrite ? (
                                <DropdownMenuItem onSelect={() => openEdit(child)}>
                                  <Pencil className="size-4" />
                                  Edit
                                </DropdownMenuItem>
                              ) : null}
                              {canDelete ? (
                                <DropdownMenuItem
                                  variant="destructive"
                                  onSelect={() => setDeleting(child)}
                                >
                                  <Trash2 className="size-4" />
                                  Remove
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <ChildFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        parentId={parentId}
        child={editing}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Remove ${deleting?.fullName}?`}
        description="This permanently deletes the child record. The action is recorded in the audit log."
        confirmLabel="Remove"
        destructive
        onConfirm={remove}
      />
    </>
  );
}

"use client";

import { useState } from "react";
import { Archive, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  PersonFormDialog,
  type PersonFormInitial,
} from "@/components/people/person-form";
import { api } from "@/lib/api-client";
import { calculateAge, initials } from "@/lib/format";
import { LABELS, type PersonStatus } from "@/types";

/** The person record as serialized for the client, plus the fields the form needs. */
export type PersonDetail = Omit<PersonFormInitial, "status"> & {
  _id: string;
  fullName: string;
  status: PersonStatus;
  photoUrl?: string;
  area?: string;
  occupation?: string;
  mobileNumber?: string;
};

export function PersonHeader({
  person,
  areas,
  canWrite,
  canDelete,
}: {
  person: PersonDetail;
  areas: string[];
  canWrite: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const age = calculateAge(person.dateOfBirth as string | undefined);

  const archive = async () => {
    try {
      await api.delete(`/api/people/${person._id}`);
      toast.success(`${person.fullName} archived`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not archive this person");
    }
  };

  const facts = [
    person.occupation,
    person.area,
    age !== null ? `${age} years old` : null,
    person.mobileNumber,
  ].filter(Boolean);

  return (
    <>
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-center">
        <Avatar className="size-16 shrink-0">
          {person.photoUrl ? (
            <AvatarImage src={person.photoUrl} alt="" />
          ) : null}
          <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
            {initials(person.fullName)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-semibold tracking-tight">{person.fullName}</h1>
            <StatusBadge
              status={person.status}
              label={LABELS.personStatus[person.status]}
            />
          </div>
          {facts.length > 0 ? (
            <p className="text-sm text-muted-foreground">{facts.join(" · ")}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 gap-2">
          {canWrite ? (
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" />
              Edit
            </Button>
          ) : null}
          {canDelete && person.status !== "ARCHIVED" ? (
            <Button variant="outline" onClick={() => setArchiveOpen(true)}>
              <Archive className="size-4" />
              Archive
            </Button>
          ) : null}
        </div>
      </div>

      <PersonFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        person={person}
        personId={person._id}
        areas={areas}
      />

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title={`Archive ${person.fullName}?`}
        description="Archived people are hidden from the default directory but keep all their children, contributions and history."
        confirmLabel="Archive"
        destructive
        onConfirm={archive}
      />
    </>
  );
}

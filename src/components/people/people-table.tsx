"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  Baby,
  Eye,
  MoreHorizontal,
  Pencil,
  Phone,
  UsersRound,
} from "lucide-react";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SortHeader } from "@/components/shared/sort-header";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PersonFormDialog } from "@/components/people/person-form";
import { api } from "@/lib/api-client";
import { calculateAge, formatDate } from "@/lib/format";
import { LABELS, type Paginated } from "@/types";
import type { PersonListItem } from "@/services/people.service";

type Props = {
  data: Paginated<PersonListItem>;
  areas: string[];
  canWrite: boolean;
  canDelete: boolean;
  hasFilters: boolean;
};

export function PeopleTable({ data, areas, canWrite, canDelete, hasFilters }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<PersonListItem | null>(null);
  const [archiving, setArchiving] = useState<PersonListItem | null>(null);

  const archive = async () => {
    if (!archiving) return;
    try {
      await api.delete(`/api/people/${archiving._id}`);
      toast.success(`${archiving.fullName} archived`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not archive this person");
    }
  };

  if (data.items.length === 0) {
    return (
      <div className="rounded-xl border bg-card">
        <EmptyState
          icon={UsersRound}
          title={hasFilters ? "No people match these filters" : "No people yet"}
          description={
            hasFilters
              ? "Try a different search term, or clear the filters to see everyone."
              : "Add the first community member to start building the directory."
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
                <SortHeader field="fullName" className="min-w-[220px]">
                  Name
                </SortHeader>
                <TableHead className="min-w-[150px]">Contact</TableHead>
                <TableHead>Gender</TableHead>
                <SortHeader field="dateOfBirth">Age</SortHeader>
                <SortHeader field="area">Area</SortHeader>
                <TableHead>Children</TableHead>
                <SortHeader field="status">Status</SortHeader>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {data.items.map((person) => {
                const age = calculateAge(person.dateOfBirth);
                return (
                  <TableRow key={person._id} className="group">
                    <TableCell>
                      <Link
                        href={`/people/${person._id}`}
                        className="block font-medium hover:underline"
                      >
                        {person.fullName}
                      </Link>
                      {person.fatherOrHusbandName ? (
                        <p className="truncate text-xs text-muted-foreground">
                          S/D/W of {person.fatherOrHusbandName}
                        </p>
                      ) : null}
                    </TableCell>

                    <TableCell>
                      {person.mobileNumber ? (
                        <a
                          href={`tel:${person.mobileNumber}`}
                          className="tabular inline-flex items-center gap-1.5 text-sm hover:underline"
                        >
                          <Phone className="size-3 text-muted-foreground" aria-hidden />
                          {person.mobileNumber}
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                      {person.occupation ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {person.occupation}
                        </p>
                      ) : null}
                    </TableCell>

                    <TableCell className="text-sm">{LABELS.gender[person.gender]}</TableCell>

                    <TableCell className="tabular text-sm">
                      {age !== null ? (
                        <>
                          {age}
                          <span className="text-muted-foreground"> yrs</span>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(person.dateOfBirth)}
                          </p>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell className="text-sm">
                      {person.area || <span className="text-muted-foreground">—</span>}
                    </TableCell>

                    <TableCell>
                      {person.childrenCount > 0 ? (
                        <Badge variant="secondary" className="tabular gap-1">
                          <Baby className="size-3" aria-hidden />
                          {person.childrenCount}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <StatusBadge
                        status={person.status}
                        label={LABELS.personStatus[person.status]}
                      />
                    </TableCell>

                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label={`Actions for ${person.fullName}`}
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem asChild>
                            <Link href={`/people/${person._id}`}>
                              <Eye className="size-4" />
                              View details
                            </Link>
                          </DropdownMenuItem>
                          {canWrite ? (
                            <DropdownMenuItem onSelect={() => setEditing(person)}>
                              <Pencil className="size-4" />
                              Edit
                            </DropdownMenuItem>
                          ) : null}
                          {canDelete && person.status !== "ARCHIVED" ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => setArchiving(person)}
                              >
                                <Archive className="size-4" />
                                Archive
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <Pagination {...data} />
      </div>

      <PersonFormDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        person={editing ?? undefined}
        personId={editing?._id}
        areas={areas}
      />

      <ConfirmDialog
        open={archiving !== null}
        onOpenChange={(open) => !open && setArchiving(null)}
        title={`Archive ${archiving?.fullName}?`}
        description={
          <>
            Archived people are hidden from the default list but keep all their
            children, contributions and history. You can restore them by editing
            the record and setting the status back to Active.
          </>
        }
        confirmLabel="Archive"
        destructive
        onConfirm={archive}
      />
    </>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  MapPin,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EventFormDialog, type EventFormInitial } from "@/components/events/event-form";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { LABELS, type EventStatus, type Paginated } from "@/types";

export type EventRow = {
  _id: string;
  name: string;
  eventType?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  status: EventStatus;
  notes?: string;
  totalAmountMinor: number;
  contributorCount: number;
  paymentCount: number;
};

/** Cards rather than a table — events are few, and the totals deserve emphasis. */
export function EventsGrid({
  data,
  canWrite,
  canDelete,
  hasFilters,
}: {
  data: Paginated<EventRow>;
  canWrite: boolean;
  canDelete: boolean;
  hasFilters: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<EventFormInitial | null>(null);
  const [deleting, setDeleting] = useState<EventRow | null>(null);

  const remove = async () => {
    if (!deleting) return;
    try {
      const result = await api.delete<{ archived: boolean }>(`/api/events/${deleting._id}`);
      toast.success(result.archived ? `${deleting.name} archived` : `${deleting.name} deleted`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove this event");
    }
  };

  if (data.items.length === 0) {
    return (
      <div className="rounded-xl border bg-card">
        <EmptyState
          icon={CalendarDays}
          title={hasFilters ? "No events match these filters" : "No events yet"}
          description={
            hasFilters
              ? "Try a different search term or clear the filters."
              : "Create an event to start recording contributions against it."
          }
        />
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.items.map((event) => (
          <div
            key={event._id}
            className="group flex flex-col rounded-xl border bg-card p-5 transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <Link
                  href={`/events/${event._id}`}
                  className="block truncate text-base font-semibold tracking-tight hover:underline"
                >
                  {event.name}
                </Link>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={event.status} label={LABELS.eventStatus[event.status]} />
                  {event.eventType ? (
                    <span className="text-xs text-muted-foreground">{event.eventType}</span>
                  ) : null}
                </div>
              </div>

              {canWrite || canDelete ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                      aria-label={`Actions for ${event.name}`}
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canWrite ? (
                      <DropdownMenuItem onSelect={() => setEditing(event)}>
                        <Pencil className="size-4" />
                        Edit
                      </DropdownMenuItem>
                    ) : null}
                    {canDelete ? (
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => setDeleting(event)}
                      >
                        <Trash2 className="size-4" />
                        {event.paymentCount > 0 ? "Archive" : "Delete"}
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3">
              <div>
                <dt className="text-xs text-muted-foreground">Collected</dt>
                <dd className="tabular text-lg font-semibold tracking-tight">
                  {formatCurrency(event.totalAmountMinor)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Contributors</dt>
                <dd className="tabular flex items-center gap-1.5 text-lg font-semibold tracking-tight">
                  <Users className="size-4 text-muted-foreground" aria-hidden />
                  {event.contributorCount}
                </dd>
              </div>
            </dl>

            <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
              {event.startDate ? (
                <p className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" aria-hidden />
                  {formatDate(event.startDate)}
                  {event.endDate && event.endDate !== event.startDate
                    ? ` – ${formatDate(event.endDate)}`
                    : ""}
                </p>
              ) : null}
              {event.location ? (
                <p className="flex items-center gap-1.5">
                  <MapPin className="size-3.5" aria-hidden />
                  <span className="truncate">{event.location}</span>
                </p>
              ) : null}
            </div>

            <Button variant="ghost" size="sm" asChild className="mt-4 w-fit self-start -ml-2">
              <Link href={`/events/${event._id}`}>
                Open event
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card">
        <Pagination {...data} />
      </div>

      <EventFormDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        event={editing ?? undefined}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={
          deleting && deleting.paymentCount > 0
            ? `Archive ${deleting.name}?`
            : `Delete ${deleting?.name}?`
        }
        description={
          deleting && deleting.paymentCount > 0
            ? `This event has ${deleting.paymentCount} contribution record${deleting.paymentCount === 1 ? "" : "s"}, so it will be archived rather than deleted. All payment history is kept.`
            : "This event has no contributions, so it will be permanently deleted."
        }
        confirmLabel={deleting && deleting.paymentCount > 0 ? "Archive" : "Delete"}
        destructive
        onConfirm={remove}
      />
    </>
  );
}

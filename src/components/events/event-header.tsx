"use client";

import { useState } from "react";
import { CalendarDays, MapPin, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { ExportMenu } from "@/components/shared/export-menu";
import { EventFormDialog, type EventFormInitial } from "@/components/events/event-form";
import { formatDate } from "@/lib/format";
import { LABELS, type EventStatus } from "@/types";

export function EventHeader({
  event,
  canWrite,
  canExport,
}: {
  event: EventFormInitial & { _id: string; name: string; status: EventStatus };
  canWrite: boolean;
  canExport: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{event.name}</h1>
            <StatusBadge status={event.status} label={LABELS.eventStatus[event.status]} />
            {event.eventType ? (
              <span className="text-sm text-muted-foreground">{event.eventType}</span>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {event.startDate ? (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5" aria-hidden />
                {formatDate(event.startDate as string)}
                {event.endDate && event.endDate !== event.startDate
                  ? ` – ${formatDate(event.endDate as string)}`
                  : ""}
              </span>
            ) : null}
            {event.location ? (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5" aria-hidden />
                {event.location}
              </span>
            ) : null}
          </div>

          {event.description ? (
            <p className="max-w-2xl text-sm text-muted-foreground">{event.description}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 gap-2">
          {canExport ? (
            <ExportMenu
              basePath={`/api/reports/events/${event._id}/contributions`}
              label="Export report"
            />
          ) : null}
          {canWrite ? (
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" />
              Edit
            </Button>
          ) : null}
        </div>
      </div>

      <EventFormDialog open={editOpen} onOpenChange={setEditOpen} event={event} />
    </>
  );
}

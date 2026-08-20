"use client";

import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FormGrid } from "@/components/shared/form-field";
import { useApiErrorHandler } from "@/hooks/use-api-form";
import { api } from "@/lib/api-client";
import { toDateInputValue } from "@/lib/format";
import { createEventSchema } from "@/validations/event.schema";
import { EVENT_STATUSES, LABELS } from "@/types";

export type EventFormInitial = {
  _id?: string;
  name?: string;
  eventType?: string;
  description?: string;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  location?: string;
  status?: string;
  notes?: string;
};

/**
 * Mounted only while open and keyed by record, so each open starts from fresh
 * `defaultValues` rather than a reset-on-open effect.
 */
export function EventFormDialog({
  open,
  onOpenChange,
  event,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: EventFormInitial;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {event?._id ? "Edit event" : "Create an event"}
          </DialogTitle>
          <DialogDescription>
            Events collect contributions from community members.
          </DialogDescription>
        </DialogHeader>

        {open ? (
          <EventForm
            key={event?._id ?? "new"}
            event={event}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EventForm({
  event,
  onDone,
}: {
  event?: EventFormInitial;
  onDone: () => void;
}) {
  const router = useRouter();
  const isEditing = Boolean(event?._id);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      name: event?.name ?? "",
      eventType: event?.eventType ?? "",
      description: event?.description ?? "",
      startDate: toDateInputValue(event?.startDate),
      endDate: toDateInputValue(event?.endDate),
      location: event?.location ?? "",
      status: event?.status ?? "UPCOMING",
      notes: event?.notes ?? "",
    } as never,
  });

  const handleApiError = useApiErrorHandler(setError);

  // Subscribed once at the top level — hooks cannot be called from JSX.
  const eventStatus = useWatch({ control, name: "status" });

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEditing) {
        await api.patch(`/api/events/${event?._id}`, values);
        toast.success("Event updated");
      } else {
        await api.post("/api/events", values);
        toast.success("Event created");
      }
      onDone();
      router.refresh();
    } catch (error) {
      handleApiError(error, "Could not save this event");
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-auto flex-col gap-4">
      <DialogBody>
      <FormGrid>
        <Field
          label="Event name"
          htmlFor="event-name"
          error={errors.name?.message}
          required
          className="sm:col-span-2"
        >
          <Input
            id="event-name"
            placeholder="Durga Puja 2025"
            autoFocus
            {...register("name")}
          />
        </Field>

        <Field
          label="Event type"
          htmlFor="event-type"
          error={errors.eventType?.message}
        >
          <Input
            id="event-type"
            placeholder="Puja, Picnic, Fundraiser…"
            {...register("eventType")}
          />
        </Field>

        <Field
          label="Status"
          htmlFor="event-status"
          error={errors.status?.message}
        >
          <Select
            value={eventStatus}
            onValueChange={(value) => setValue("status", value as never)}
          >
            <SelectTrigger id="event-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVENT_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {LABELS.eventStatus[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="Start date"
          htmlFor="event-start"
          error={errors.startDate?.message}
        >
          <Input id="event-start" type="date" {...register("startDate")} />
        </Field>

        <Field
          label="End date"
          htmlFor="event-end"
          error={errors.endDate?.message}
        >
          <Input id="event-end" type="date" {...register("endDate")} />
        </Field>

        <Field
          label="Location"
          htmlFor="event-location"
          error={errors.location?.message}
          className="sm:col-span-2"
        >
          <Input
            id="event-location"
            placeholder="Community Hall"
            {...register("location")}
          />
        </Field>

        <Field
          label="Description"
          htmlFor="event-description"
          error={errors.description?.message}
          className="sm:col-span-2"
        >
          <Textarea
            id="event-description"
            rows={3}
            {...register("description")}
          />
        </Field>

        <Field
          label="Notes"
          htmlFor="event-notes"
          error={errors.notes?.message}
          className="sm:col-span-2"
        >
          <Textarea id="event-notes" rows={2} {...register("notes")} />
        </Field>
      </FormGrid>

      </DialogBody>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={onDone}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {isEditing ? "Save changes" : "Create event"}
        </Button>
      </DialogFooter>
    </form>
  );
}

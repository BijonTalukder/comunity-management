"use client";

import { useState } from "react";
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
import { PersonCombobox, type PersonOption } from "@/components/people/person-combobox";
import { useApiErrorHandler } from "@/hooks/use-api-form";
import { api } from "@/lib/api-client";
import { toDateInputValue } from "@/lib/format";
import { toMajorUnits, CURRENCY_SYMBOL } from "@/lib/money";
import { createContributionSchema } from "@/validations/contribution.schema";
import { LABELS, PAYMENT_METHODS } from "@/types";

export type ContributionInitial = {
  _id?: string;
  amountMinor?: number;
  paymentDate?: string;
  paymentMethod?: string;
  transactionReference?: string;
  notes?: string;
  person?: PersonOption | null;
};

/**
 * Mounted only while open and keyed by record, so each open starts from fresh
 * `defaultValues` without a reset-on-open effect.
 */
export function ContributionFormDialog({
  open,
  onOpenChange,
  eventId,
  eventName,
  contribution,
  lockedPerson,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventName: string;
  contribution?: ContributionInitial;
  /** Pre-selects the contributor, e.g. when adding from their summary row. */
  lockedPerson?: PersonOption | null;
}) {
  const isEditing = Boolean(contribution?._id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit contribution" : "Record a contribution"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Adjust this payment. The change is recorded in the audit log."
              : `A payment towards ${eventName}. One person can contribute any number of times.`}
          </DialogDescription>
        </DialogHeader>

        {open ? (
          <ContributionForm
            key={contribution?._id ?? lockedPerson?._id ?? "new"}
            eventId={eventId}
            contribution={contribution}
            lockedPerson={lockedPerson}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ContributionForm({
  eventId,
  contribution,
  lockedPerson,
  onDone,
}: {
  eventId: string;
  contribution?: ContributionInitial;
  lockedPerson?: PersonOption | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const isEditing = Boolean(contribution?._id);
  const initialPerson = contribution?.person ?? lockedPerson ?? null;
  const [person, setPerson] = useState<PersonOption | null>(initialPerson);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    // One schema for both modes keeps the field types concrete. A payment can
    // never move to a different person, so on edit `personId` is pre-filled and
    // the PATCH schema simply strips it server-side.
    resolver: zodResolver(createContributionSchema),
    defaultValues: {
      personId: initialPerson?._id ?? "",
      amount:
        contribution?.amountMinor !== undefined
          ? String(toMajorUnits(contribution.amountMinor))
          : "",
      paymentDate: toDateInputValue(contribution?.paymentDate ?? new Date()),
      paymentMethod: contribution?.paymentMethod ?? "CASH",
      transactionReference: contribution?.transactionReference ?? "",
      notes: contribution?.notes ?? "",
    } as never,
  });

  const handleApiError = useApiErrorHandler(setError);

  // Subscribed at the top level — hooks cannot be called from inside JSX.
  const personId = useWatch({ control, name: "personId" });
  const paymentMethod = useWatch({ control, name: "paymentMethod" });

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEditing) {
        await api.patch(`/api/contributions/${contribution?._id}`, values);
        toast.success("Contribution updated");
      } else {
        await api.post(`/api/events/${eventId}/contributions`, values);
        toast.success("Contribution recorded");
      }
      onDone();
      router.refresh();
    } catch (error) {
      handleApiError(error, "Could not save this contribution");
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-auto flex-col gap-4">
      <DialogBody>
      <FormGrid>
        {!isEditing ? (
          <Field
            label="Person"
            htmlFor="person"
            error={errors.personId?.message}
            required
            className="sm:col-span-2"
          >
            <PersonCombobox
              value={personId}
              selected={person}
              disabled={Boolean(lockedPerson)}
              onChange={(nextId, picked) => {
                setValue("personId", nextId ?? "", { shouldValidate: true });
                setPerson(picked ?? null);
              }}
            />
          </Field>
        ) : (
          <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm sm:col-span-2">
            <span className="text-muted-foreground">Contributor: </span>
            <span className="font-medium">{contribution?.person?.fullName ?? "—"}</span>
          </div>
        )}

        <Field
          label={`Amount (${CURRENCY_SYMBOL})`}
          htmlFor="amount"
          error={errors.amount?.message}
          required
        >
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            inputMode="decimal"
            placeholder="500"
            {...register("amount")}
          />
        </Field>

        <Field
          label="Payment date"
          htmlFor="paymentDate"
          error={errors.paymentDate?.message}
          required
        >
          <Input id="paymentDate" type="date" {...register("paymentDate")} />
        </Field>

        <Field
          label="Payment method"
          htmlFor="paymentMethod"
          error={errors.paymentMethod?.message}
        >
          <Select
            value={paymentMethod}
            onValueChange={(value) => setValue("paymentMethod", value as never)}
          >
            <SelectTrigger id="paymentMethod" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((method) => (
                <SelectItem key={method} value={method}>
                  {LABELS.paymentMethod[method]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="Transaction reference"
          htmlFor="transactionReference"
          error={errors.transactionReference?.message}
          hint="bKash/bank transaction id, receipt number…"
        >
          <Input id="transactionReference" {...register("transactionReference")} />
        </Field>

        <Field
          label="Notes"
          htmlFor="contribution-notes"
          error={errors.notes?.message}
          className="sm:col-span-2"
        >
          <Textarea id="contribution-notes" rows={2} {...register("notes")} />
        </Field>
      </FormGrid>

      </DialogBody>

      <DialogFooter>
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {isEditing ? "Save changes" : "Record contribution"}
        </Button>
      </DialogFooter>
    </form>
  );
}

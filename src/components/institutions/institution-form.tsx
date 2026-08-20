"use client";

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
import {
  createInstitutionSchema,
  type CreateInstitutionInput,
} from "@/validations/institution.schema";
import { INSTITUTION_STATUSES, INSTITUTION_TYPES, LABELS } from "@/types";

export type InstitutionSummary = {
  _id: string;
  name: string;
  type: string;
  area?: string;
  city?: string;
};

/**
 * Shared by the Institutions page and by the quick-create flow inside the
 * child form, so both paths validate and save identically.
 */
/**
 * Mounted only while open and keyed by record, so each open starts from fresh
 * `defaultValues` rather than a reset-on-open effect.
 */
export function InstitutionFormDialog({
  open,
  onOpenChange,
  institution,
  institutionId,
  defaultName,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  institution?: Partial<CreateInstitutionInput>;
  institutionId?: string;
  /** Pre-fills the name when created from a combobox search miss. */
  defaultName?: string;
  onSaved?: (institution: InstitutionSummary) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {institutionId ? "Edit institution" : "Add institution"}
          </DialogTitle>
          <DialogDescription>
            {institutionId
              ? "Update this institution. Children linked to it will show the new details."
              : "Create it once here and it becomes selectable everywhere."}
          </DialogDescription>
        </DialogHeader>

        {open ? (
          <InstitutionForm
            key={institutionId ?? defaultName ?? "new"}
            institution={institution}
            institutionId={institutionId}
            defaultName={defaultName}
            onDone={() => onOpenChange(false)}
            onSaved={onSaved}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function InstitutionForm({
  institution,
  institutionId,
  defaultName,
  onDone,
  onSaved,
}: {
  institution?: Partial<CreateInstitutionInput>;
  institutionId?: string;
  defaultName?: string;
  onDone: () => void;
  onSaved?: (institution: InstitutionSummary) => void;
}) {
  const isEditing = Boolean(institutionId);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createInstitutionSchema),
    defaultValues: {
      name: institution?.name ?? defaultName ?? "",
      type: institution?.type ?? "SCHOOL",
      address: institution?.address ?? "",
      area: institution?.area ?? "",
      city: institution?.city ?? "",
      country: institution?.country ?? "",
      status: institution?.status ?? "ACTIVE",
    } as never,
  });

  const handleApiError = useApiErrorHandler(setError);

  // Subscribed once at the top level — hooks cannot be called from JSX.
  const institutionType = useWatch({ control, name: "type" });
  const institutionStatus = useWatch({ control, name: "status" });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = isEditing
        ? await api.patch<InstitutionSummary>(
            `/api/institutions/${institutionId}`,
            values,
          )
        : await api.post<InstitutionSummary>("/api/institutions", values);

      toast.success(
        isEditing ? "Institution updated" : `"${saved.name}" added`,
      );
      onDone();
      onSaved?.(saved);
    } catch (error) {
      handleApiError(error, "Could not save this institution");
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-auto flex-col gap-4">
      <DialogBody>
      <FormGrid>
        <Field
          label="Name"
          htmlFor="institution-name"
          error={errors.name?.message}
          required
          className="sm:col-span-2"
        >
          <Input
            id="institution-name"
            placeholder="ABC School"
            autoFocus
            {...register("name")}
          />
        </Field>

        <Field
          label="Type"
          htmlFor="institution-type"
          error={errors.type?.message}
          required
        >
          <Select
            value={institutionType}
            onValueChange={(value) => setValue("type", value as never)}
          >
            <SelectTrigger id="institution-type" className="w-full">
              <SelectValue placeholder="Select a type" />
            </SelectTrigger>
            <SelectContent>
              {INSTITUTION_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {LABELS.institutionType[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="Status"
          htmlFor="institution-status"
          error={errors.status?.message}
        >
          <Select
            value={institutionStatus}
            onValueChange={(value) => setValue("status", value as never)}
          >
            <SelectTrigger id="institution-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INSTITUTION_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {LABELS.institutionStatus[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="Area"
          htmlFor="institution-area"
          error={errors.area?.message}
        >
          <Input id="institution-area" {...register("area")} />
        </Field>

        <Field
          label="City"
          htmlFor="institution-city"
          error={errors.city?.message}
        >
          <Input id="institution-city" {...register("city")} />
        </Field>

        <Field
          label="Country"
          htmlFor="institution-country"
          error={errors.country?.message}
        >
          <Input id="institution-country" {...register("country")} />
        </Field>

        <Field
          label="Address"
          htmlFor="institution-address"
          error={errors.address?.message}
          className="sm:col-span-2"
        >
          <Textarea
            id="institution-address"
            rows={2}
            {...register("address")}
          />
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
          {isEditing ? "Save changes" : "Create institution"}
        </Button>
      </DialogFooter>
    </form>
  );
}

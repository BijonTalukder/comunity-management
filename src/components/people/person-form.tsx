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
import {
  createPersonSchema,
  type CreatePersonInput,
} from "@/validations/people.schema";
import { GENDERS, LABELS, PERSON_STATUSES } from "@/types";

export type PersonFormValues = CreatePersonInput;

export type PersonFormInitial = Partial<
  Record<keyof PersonFormValues, string | Date | null | undefined>
>;

const EMPTY: Record<string, string> = {
  fullName: "",
  fatherOrHusbandName: "",
  motherName: "",
  mobileNumber: "",
  alternativeMobileNumber: "",
  email: "",
  address: "",
  area: "",
  occupation: "",
  photoUrl: "",
  notes: "",
  dateOfBirth: "",
};

/**
 * Mounted only while open and keyed by record, so each open starts from fresh
 * `defaultValues` rather than a reset-on-open effect.
 */
export function PersonFormDialog({
  open,
  onOpenChange,
  person,
  personId,
  areas,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing; omitted when creating. */
  person?: PersonFormInitial;
  personId?: string;
  areas?: string[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{personId ? "Edit person" : "Add a person"}</DialogTitle>
          <DialogDescription>
            {personId
              ? "Update this community member's details. Every change is recorded in the audit log."
              : "Add a new member to the community directory."}
          </DialogDescription>
        </DialogHeader>

        {open ? (
          <PersonForm
            key={personId ?? "new"}
            person={person}
            personId={personId}
            areas={areas}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function PersonForm({
  person,
  personId,
  areas,
  onDone,
}: {
  person?: PersonFormInitial;
  personId?: string;
  areas?: string[];
  onDone: () => void;
}) {
  const router = useRouter();
  const isEditing = Boolean(personId);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createPersonSchema),
    defaultValues: {
      ...EMPTY,
      ...Object.fromEntries(
        Object.entries(person ?? {}).map(([key, value]) => [
          key,
          key === "dateOfBirth"
            ? toDateInputValue(value as string)
            : (value ?? ""),
        ]),
      ),
      gender: (person?.gender as string) ?? "MALE",
      status: (person?.status as string) ?? "ACTIVE",
    } as never,
  });

  const handleApiError = useApiErrorHandler(setError);

  // Subscribed once at the top level — hooks cannot be called from JSX.
  const gender = useWatch({ control, name: "gender" });
  const personStatus = useWatch({ control, name: "status" });

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEditing) {
        await api.patch(`/api/people/${personId}`, values);
        toast.success("Person updated");
      } else {
        await api.post("/api/people", values);
        toast.success("Person added to the directory");
      }
      onDone();
      router.refresh();
    } catch (error) {
      handleApiError(error, "Could not save this person");
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex min-h-0 flex-auto flex-col gap-4"
    >
      <DialogBody>
        <FormGrid>
          <Field
            label="Full name"
            htmlFor="fullName"
            error={errors.fullName?.message}
            required
            className="sm:col-span-2"
          >
            <Input
              id="fullName"
              placeholder="Rahim Uddin"
              {...register("fullName")}
            />
          </Field>

          <Field
            label="Father/Husband name"
            htmlFor="fatherOrHusbandName"
            error={errors.fatherOrHusbandName?.message}
          >
            <Input
              id="fatherOrHusbandName"
              {...register("fatherOrHusbandName")}
            />
          </Field>

          <Field
            label="Mother name"
            htmlFor="motherName"
            error={errors.motherName?.message}
          >
            <Input id="motherName" {...register("motherName")} />
          </Field>

          <Field
            label="Gender"
            htmlFor="gender"
            error={errors.gender?.message}
            required
          >
            <Select
              value={gender}
              onValueChange={(value) => setValue("gender", value as never)}
            >
              <SelectTrigger id="gender" className="w-full">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map((gender) => (
                  <SelectItem key={gender} value={gender}>
                    {LABELS.gender[gender]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="Date of birth"
            htmlFor="dateOfBirth"
            error={errors.dateOfBirth?.message}
          >
            <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
          </Field>

          <Field
            label="Mobile number"
            htmlFor="mobileNumber"
            error={errors.mobileNumber?.message}
          >
            <Input
              id="mobileNumber"
              inputMode="tel"
              placeholder="01700000000"
              {...register("mobileNumber")}
            />
          </Field>

          <Field
            label="Alternative mobile"
            htmlFor="alternativeMobileNumber"
            error={errors.alternativeMobileNumber?.message}
          >
            <Input
              id="alternativeMobileNumber"
              inputMode="tel"
              {...register("alternativeMobileNumber")}
            />
          </Field>

          <Field label="Email" htmlFor="email" error={errors.email?.message}>
            <Input id="email" type="email" {...register("email")} />
          </Field>

          <Field
            label="Occupation"
            htmlFor="occupation"
            error={errors.occupation?.message}
          >
            <Input id="occupation" {...register("occupation")} />
          </Field>

          <Field label="Area" htmlFor="area" error={errors.area?.message}>
            <Input
              id="area"
              list="known-areas"
              placeholder="Mirpur"
              {...register("area")}
            />
            {areas && areas.length > 0 ? (
              <datalist id="known-areas">
                {areas.map((area) => (
                  <option key={area} value={area} />
                ))}
              </datalist>
            ) : null}
          </Field>

          <Field label="Status" htmlFor="status" error={errors.status?.message}>
            <Select
              value={personStatus}
              onValueChange={(value) => setValue("status", value as never)}
            >
              <SelectTrigger id="status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERSON_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {LABELS.personStatus[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="Address"
            htmlFor="address"
            error={errors.address?.message}
            className="sm:col-span-2"
          >
            <Textarea id="address" rows={2} {...register("address")} />
          </Field>

          <Field
            label="Photo URL"
            htmlFor="photoUrl"
            error={errors.photoUrl?.message}
            hint="Link to a hosted image."
            className="sm:col-span-2"
          >
            <Input
              id="photoUrl"
              type="url"
              placeholder="https://…"
              {...register("photoUrl")}
            />
          </Field>

          <Field
            label="Notes"
            htmlFor="notes"
            error={errors.notes?.message}
            className="sm:col-span-2"
          >
            <Textarea id="notes" rows={3} {...register("notes")} />
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
          {isEditing ? "Save changes" : "Add person"}
        </Button>
      </DialogFooter>
    </form>
  );
}

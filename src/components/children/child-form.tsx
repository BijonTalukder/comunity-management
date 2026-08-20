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
import { InstitutionCombobox } from "@/components/institutions/institution-combobox";
import type { InstitutionSummary } from "@/components/institutions/institution-form";
import { useApiErrorHandler } from "@/hooks/use-api-form";
import { api } from "@/lib/api-client";
import { toDateInputValue } from "@/lib/format";
import { createChildSchema } from "@/validations/children.schema";
import { EDUCATION_STATUSES, GENDERS, LABELS, RELATIONSHIPS } from "@/types";

export type ChildFormInitial = {
  _id?: string;
  fullName?: string;
  gender?: string;
  dateOfBirth?: string | Date | null;
  relationship?: string;
  educationStatus?: string;
  institutionId?: string;
  institution?: { _id: string; name: string; type: string } | null;
  classOrGrade?: string;
  section?: string;
  rollNumber?: string;
  notes?: string;
};

function toInstitutionSummary(child?: ChildFormInitial): InstitutionSummary | null {
  if (!child?.institution) return null;
  return {
    _id: String(child.institution._id),
    name: child.institution.name,
    type: child.institution.type,
  };
}

/**
 * The form is only mounted while the dialog is open and is keyed by record id,
 * so each open starts from fresh `defaultValues`. That removes the usual
 * reset-on-open effect along with any chance of briefly showing stale data.
 */
export function ChildFormDialog({
  open,
  onOpenChange,
  parentId,
  child,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId: string;
  child?: ChildFormInitial;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{child?._id ? "Edit child" : "Add a child"}</DialogTitle>
          <DialogDescription>
            Children are stored as their own records, linked to this person.
          </DialogDescription>
        </DialogHeader>

        {open ? (
          <ChildForm
            key={child?._id ?? "new"}
            parentId={parentId}
            child={child}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ChildForm({
  parentId,
  child,
  onDone,
}: {
  parentId: string;
  child?: ChildFormInitial;
  onDone: () => void;
}) {
  const router = useRouter();
  const isEditing = Boolean(child?._id);
  const [institution, setInstitution] = useState<InstitutionSummary | null>(() =>
    toInstitutionSummary(child),
  );

  const {
    register,
    handleSubmit,
    setValue,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createChildSchema),
    defaultValues: {
      fullName: child?.fullName ?? "",
      gender: child?.gender ?? "MALE",
      dateOfBirth: toDateInputValue(child?.dateOfBirth),
      relationship: child?.relationship ?? "SON",
      educationStatus: child?.educationStatus ?? "STUDYING",
      institutionId: child?.institution?._id ?? child?.institutionId ?? "",
      classOrGrade: child?.classOrGrade ?? "",
      section: child?.section ?? "",
      rollNumber: child?.rollNumber ?? "",
      notes: child?.notes ?? "",
    } as never,
  });

  const handleApiError = useApiErrorHandler(setError);

  // Subscribed at the top level — hooks cannot be called from inside JSX.
  const gender = useWatch({ control, name: "gender" });
  const relationship = useWatch({ control, name: "relationship" });
  const educationStatus = useWatch({ control, name: "educationStatus" });
  const institutionId = useWatch({ control, name: "institutionId" });

  const showSchoolFields = educationStatus === "STUDYING" || educationStatus === "COMPLETED";

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEditing) {
        await api.patch(`/api/children/${child?._id}`, values);
        toast.success("Child updated");
      } else {
        await api.post(`/api/people/${parentId}/children`, values);
        toast.success("Child added");
      }
      onDone();
      router.refresh();
    } catch (error) {
      handleApiError(error, "Could not save this child");
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-auto flex-col gap-4">
      <DialogBody>
      <FormGrid>
        <Field
          label="Full name"
          htmlFor="child-name"
          error={errors.fullName?.message}
          required
          className="sm:col-span-2"
        >
          <Input id="child-name" autoFocus {...register("fullName")} />
        </Field>

        <Field label="Gender" htmlFor="child-gender" error={errors.gender?.message} required>
          <Select value={gender} onValueChange={(value) => setValue("gender", value as never)}>
            <SelectTrigger id="child-gender" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GENDERS.map((option) => (
                <SelectItem key={option} value={option}>
                  {LABELS.gender[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="Relationship"
          htmlFor="child-relationship"
          error={errors.relationship?.message}
        >
          <Select
            value={relationship}
            onValueChange={(value) => setValue("relationship", value as never)}
          >
            <SelectTrigger id="child-relationship" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RELATIONSHIPS.map((option) => (
                <SelectItem key={option} value={option}>
                  {LABELS.relationship[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Date of birth" htmlFor="child-dob" error={errors.dateOfBirth?.message}>
          <Input id="child-dob" type="date" {...register("dateOfBirth")} />
        </Field>

        <Field
          label="Education status"
          htmlFor="child-education"
          error={errors.educationStatus?.message}
        >
          <Select
            value={educationStatus}
            onValueChange={(value) => setValue("educationStatus", value as never)}
          >
            <SelectTrigger id="child-education" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EDUCATION_STATUSES.map((option) => (
                <SelectItem key={option} value={option}>
                  {LABELS.educationStatus[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {showSchoolFields ? (
          <>
            <Field
              label="Institution"
              htmlFor="institution"
              error={errors.institutionId?.message}
              hint="Search existing institutions, or add a new one without leaving this form."
              className="sm:col-span-2"
            >
              <InstitutionCombobox
                value={institutionId || undefined}
                selected={institution}
                onChange={(nextId, picked) => {
                  setValue("institutionId", (nextId ?? "") as never, {
                    shouldValidate: true,
                  });
                  setInstitution(picked ?? null);
                }}
              />
            </Field>

            <Field
              label="Class / Grade"
              htmlFor="child-class"
              error={errors.classOrGrade?.message}
            >
              <Input id="child-class" placeholder="Class 6" {...register("classOrGrade")} />
            </Field>

            <Field label="Section" htmlFor="child-section" error={errors.section?.message}>
              <Input id="child-section" placeholder="A" {...register("section")} />
            </Field>

            <Field label="Roll number" htmlFor="child-roll" error={errors.rollNumber?.message}>
              <Input id="child-roll" {...register("rollNumber")} />
            </Field>
          </>
        ) : null}

        <Field
          label="Notes"
          htmlFor="child-notes"
          error={errors.notes?.message}
          className="sm:col-span-2"
        >
          <Textarea id="child-notes" rows={2} {...register("notes")} />
        </Field>
      </FormGrid>

      </DialogBody>

      <DialogFooter>
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {isEditing ? "Save changes" : "Add child"}
        </Button>
      </DialogFooter>
    </form>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import { createUserSchema, updateUserSchema } from "@/validations/user.schema";
import { LABELS, ROLES } from "@/types";

export type UserFormInitial = {
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
};

/**
 * Mounted only while open and keyed by record, so each open starts from fresh
 * `defaultValues` rather than a reset-on-open effect.
 */
export function UserFormDialog({
  open,
  onOpenChange,
  user,
  isSelf,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserFormInitial;
  isSelf?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {user?._id ? "Edit user" : "Add administrator"}
          </DialogTitle>
          <DialogDescription>
            Admins manage community data; super admins additionally manage user
            accounts and can delete master data.
          </DialogDescription>
        </DialogHeader>

        {open ? (
          <UserForm
            key={user?._id ?? "new"}
            user={user}
            isSelf={isSelf}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function UserForm({
  user,
  isSelf,
  onDone,
}: {
  user?: UserFormInitial;
  isSelf?: boolean;
  onDone: () => void;
}) {
  const router = useRouter();
  const isEditing = Boolean(user?._id);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    // Editing keeps the email fixed and makes the password optional, so the
    // two modes genuinely need different schemas.
    resolver: zodResolver(isEditing ? updateUserSchema : createUserSchema),
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      password: "",
      role: user?.role ?? "ADMIN",
      isActive: user?.isActive ?? true,
    } as never,
  });

  const handleApiError = useApiErrorHandler(setError);

  // Subscribed once at the top level — hooks cannot be called from JSX.
  const role = useWatch({ control, name: "role" });
  const isActive = useWatch({ control, name: "isActive" });

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEditing) {
        // An untouched password field must not trigger a reset.
        const payload = { ...values } as Record<string, unknown>;
        if (!payload.password) delete payload.password;
        delete payload.email;
        await api.patch(`/api/users/${user?._id}`, payload);
        toast.success("User updated");
      } else {
        await api.post("/api/users", values);
        toast.success("User created");
      }
      onDone();
      router.refresh();
    } catch (error) {
      handleApiError(error, "Could not save this user");
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-auto flex-col gap-4">
      <DialogBody>
      <FormGrid>
        <Field
          label="Name"
          htmlFor="user-name"
          error={errors.name?.message}
          required
          className="sm:col-span-2"
        >
          <Input id="user-name" autoFocus {...register("name")} />
        </Field>

        {!isEditing ? (
          <Field
            label="Email"
            htmlFor="user-email"
            error={
              (errors as Record<string, { message?: string }>).email?.message
            }
            required
            className="sm:col-span-2"
          >
            <Input
              id="user-email"
              type="email"
              autoComplete="off"
              {...register("email" as never)}
            />
          </Field>
        ) : (
          <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm sm:col-span-2">
            <span className="text-muted-foreground">Email: </span>
            <span className="font-medium">{user?.email}</span>
          </div>
        )}

        <Field
          label={isEditing ? "New password" : "Password"}
          htmlFor="user-password"
          error={errors.password?.message}
          required={!isEditing}
          hint={
            isEditing
              ? "Leave blank to keep the current password. Setting one signs the user out everywhere."
              : "At least 10 characters, with upper and lower case letters and a number."
          }
          className="sm:col-span-2"
        >
          <Input
            id="user-password"
            type="password"
            autoComplete="new-password"
            placeholder={isEditing ? "Unchanged" : ""}
            {...register("password")}
          />
        </Field>

        <Field label="Role" htmlFor="user-role" error={errors.role?.message}>
          <Select
            value={role}
            onValueChange={(value) => setValue("role", value as never)}
            disabled={isSelf}
          >
            <SelectTrigger id="user-role" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {LABELS.role[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="Account status"
          htmlFor="user-active"
          error={errors.isActive?.message}
        >
          <div className="flex h-9 items-center gap-2.5">
            <Switch
              id="user-active"
              checked={Boolean(isActive)}
              onCheckedChange={(checked) =>
                setValue("isActive", checked as never)
              }
              disabled={isSelf}
            />
            <span className="text-sm text-muted-foreground">
              {isActive ? "Active — can sign in" : "Deactivated"}
            </span>
          </div>
        </Field>

        {isSelf ? (
          <p className="text-xs text-muted-foreground sm:col-span-2">
            You cannot change your own role or deactivate your own account.
          </p>
        ) : null}
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
          {isEditing ? "Save changes" : "Create user"}
        </Button>
      </DialogFooter>
    </form>
  );
}

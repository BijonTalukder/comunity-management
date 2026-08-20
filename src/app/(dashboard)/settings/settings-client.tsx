"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/shared/form-field";
import { useApiErrorHandler } from "@/hooks/use-api-form";
import { api } from "@/lib/api-client";
import {
  changePasswordSchema,
  updateProfileSchema,
  type ChangePasswordInput,
  type UpdateProfileInput,
} from "@/validations/auth.schema";
import { LABELS, type SessionUser } from "@/types";

function SettingsCard({
  id,
  icon: Icon,
  title,
  description,
  children,
}: {
  id?: string;
  icon: typeof UserRound;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-xl border bg-card">
      <header className="flex items-start gap-3 border-b px-5 py-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="space-y-0.5">
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </header>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

function ProfileForm({ user }: { user: SessionUser }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: user.name },
  });

  const handleApiError = useApiErrorHandler(setError);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await api.patch("/api/auth/profile", values);
      toast.success("Profile updated");
      router.refresh();
    } catch (error) {
      handleApiError(error, "Could not update your profile");
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-md space-y-4">
      <Field label="Name" htmlFor="profile-name" error={errors.name?.message} required>
        <Input id="profile-name" {...register("name")} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Email
          </p>
          <p className="mt-1 text-sm">{user.email}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Role
          </p>
          <p className="mt-1 text-sm">{LABELS.role[user.role]}</p>
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting || !isDirty}>
        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
        Save profile
      </Button>
    </form>
  );
}

function PasswordForm() {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const handleApiError = useApiErrorHandler(setError);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await api.post("/api/auth/change-password", values);
      toast.success("Password changed. Other sessions have been signed out.");
      reset();
    } catch (error) {
      handleApiError(error, "Could not change your password");
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-md space-y-4">
      <Field
        label="Current password"
        htmlFor="currentPassword"
        error={errors.currentPassword?.message}
        required
      >
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          {...register("currentPassword")}
        />
      </Field>

      <Field
        label="New password"
        htmlFor="newPassword"
        error={errors.newPassword?.message}
        hint="At least 10 characters, with upper and lower case letters and a number."
        required
      >
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          {...register("newPassword")}
        />
      </Field>

      <Field
        label="Confirm new password"
        htmlFor="confirmPassword"
        error={errors.confirmPassword?.message}
        required
      >
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...register("confirmPassword")}
        />
      </Field>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
        Change password
      </Button>
    </form>
  );
}

export function SettingsClient({ user }: { user: SessionUser }) {
  return (
    <div className="space-y-4">
      <SettingsCard
        icon={UserRound}
        title="Profile"
        description="Your display name, shown throughout the app and in the audit log."
      >
        <ProfileForm user={user} />
      </SettingsCard>

      <SettingsCard
        id="password"
        icon={KeyRound}
        title="Password"
        description="Changing your password signs out every other device immediately."
      >
        <PasswordForm />
      </SettingsCard>
    </div>
  );
}

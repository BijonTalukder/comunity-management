import { Suspense } from "react";
import type { Metadata } from "next";
import { Users2 } from "lucide-react";
import { LoginForm } from "./login-form";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_NAME } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel — hidden on small screens where the form should dominate. */}
      {/* Deliberately dark in both themes so the panel reads the same way
          regardless of the visitor's colour-scheme preference. */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[oklch(0.22_0.06_285)] p-10 text-white lg:flex">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 10%, oklch(0.55 0.2 285 / 0.65), transparent 55%), radial-gradient(circle at 85% 80%, oklch(0.5 0.17 240 / 0.5), transparent 50%)",
          }}
          aria-hidden
        />
        <div className="relative flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
            <Users2 className="size-5" aria-hidden />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            {/* {APP_NAME} */}
          </span>
        </div>

        <div className="relative space-y-4">
          <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight">
            {/* Every member, child, institution and contribution — in one record. */}
          </h2>
          <p className="max-w-md text-sm text-white/70">
            {/* Search the community directory, track event contributions with exact
            totals, and see who changed what, when. */}
          </p>
        </div>

        <p className="relative text-xs text-white/55">
          Administrator access only. All activity is recorded in the audit log.
        </p>
      </div>

      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1.5 lg:hidden">
            <span className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Users2 className="size-5" aria-hidden />
            </span>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
            <p className="text-sm text-muted-foreground">
              Enter your administrator credentials to continue.
            </p>
          </div>

          {/* `useSearchParams` needs a Suspense boundary during prerender. */}
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

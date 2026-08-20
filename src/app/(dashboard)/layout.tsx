import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { permissionsFor } from "@/lib/permissions";
import { ensureDefaultAdmin } from "@/lib/bootstrap";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { APP_NAME } from "@/lib/env";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // The proxy only checks the token signature; this is the authoritative check
  // that the account still exists and is active.
  await ensureDefaultAdmin();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const permissions = [...permissionsFor(user.role)];

  return (
    <div className="flex min-h-dvh">
      <AppSidebar appName={APP_NAME} permissions={permissions} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader user={user} appName={APP_NAME} permissions={permissions} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1400px] space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

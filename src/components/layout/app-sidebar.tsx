"use client";

import Link from "next/link";
import { Users2 } from "lucide-react";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import type { Permission } from "@/lib/permissions";

export function SidebarContent({
  appName,
  permissions,
  onNavigate,
}: {
  appName: string;
  permissions: Permission[];
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4 bg-sidebar py-4">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="flex shrink-0 items-center gap-2.5 px-5 focus-visible:outline-none"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Users2 className="size-4" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
            {appName}
          </span>
          <span className="block text-xs text-muted-foreground">Admin panel</span>
        </span>
      </Link>

      <SidebarNav permissions={permissions} onNavigate={onNavigate} />

      <p className="shrink-0 px-5 text-xs text-muted-foreground">
        {appName} · v1.0
      </p>
    </div>
  );
}

/** Fixed sidebar for desktop; the mobile drawer lives in the header. */
export function AppSidebar({
  appName,
  permissions,
}: {
  appName: string;
  permissions: Permission[];
}) {
  return (
    <aside className="hidden w-64 shrink-0 border-r lg:block">
      <div className="sticky top-0 h-dvh">
        <SidebarContent appName={appName} permissions={permissions} />
      </div>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/components/layout/nav-config";
import type { Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export function SidebarNav({
  permissions,
  onNavigate,
}: {
  permissions: Permission[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const allowed = new Set(permissions);

  return (
    <nav className="thin-scrollbar flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3" aria-label="Main navigation">
      {NAV_ITEMS.filter(
        (item) => !item.permission || allowed.has(item.permission),
      ).map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon
              className={cn(
                "size-4 shrink-0 transition-colors",
                isActive ? "text-sidebar-primary" : "text-muted-foreground group-hover:text-sidebar-primary",
              )}
              aria-hidden
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

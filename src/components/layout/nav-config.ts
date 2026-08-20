import {
  Building2,
  CalendarDays,
  LayoutDashboard,
  ScrollText,
  Settings,
  Users,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Permission } from "@/lib/permissions";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Hidden from the sidebar when the role lacks this permission. */
  permission?: Permission;
  description: string;
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Community overview and activity",
  },
  {
    href: "/people",
    label: "People",
    icon: UsersRound,
    permission: "people:read",
    description: "Community members and households",
  },
  {
    href: "/institutions",
    label: "Institutions",
    icon: Building2,
    permission: "institutions:read",
    description: "Schools, colleges and other institutions",
  },
  {
    href: "/events",
    label: "Events",
    icon: CalendarDays,
    permission: "events:read",
    description: "Events and contribution collection",
  },
  {
    href: "/users",
    label: "Users",
    icon: Users,
    permission: "users:read",
    description: "Administrator accounts and access",
  },
  {
    href: "/audit-logs",
    label: "Audit Logs",
    icon: ScrollText,
    permission: "audit:read",
    description: "Every change made in the system",
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    description: "Your profile and password",
  },
];

/** Longest matching nav item, so /people/123 still highlights "People". */
export function findActiveItem(pathname: string): NavItem | undefined {
  return NAV_ITEMS.filter(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  ).sort((a, b) => b.href.length - a.href.length)[0];
}

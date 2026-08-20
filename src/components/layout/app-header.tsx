"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, KeyRound, LogOut, Menu, Moon, Sun, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SidebarContent } from "@/components/layout/app-sidebar";
import { findActiveItem } from "@/components/layout/nav-config";
import { api } from "@/lib/api-client";
import { initials } from "@/lib/format";
import { LABELS, type SessionUser } from "@/types";
import type { Permission } from "@/lib/permissions";

export function AppHeader({
  user,
  appName,
  permissions,
  breadcrumbTail,
}: {
  user: SessionUser;
  appName: string;
  permissions: Permission[];
  /** Extra trailing crumb for detail pages, e.g. a person's name. */
  breadcrumbTail?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const active = findActiveItem(pathname);
  const title = breadcrumbTail ?? active?.label ?? "Dashboard";

  const signOut = async () => {
    setIsSigningOut(true);
    try {
      await api.post("/api/auth/logout");
      toast.success("Signed out");
      router.replace("/login");
      router.refresh();
    } catch {
      toast.error("Could not sign out. Please try again.");
      setIsSigningOut(false);
    }
  };

  const toggleTheme = () => {
    const root = document.documentElement;
    const next = root.classList.toggle("dark");
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarContent
              appName={appName}
              permissions={permissions}
              onNavigate={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>

        <div className="min-w-0 flex-1">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground">
              Home
            </Link>
            {active && active.href !== "/dashboard" ? (
              <>
                <ChevronRight className="size-3" aria-hidden />
                {breadcrumbTail ? (
                  <Link href={active.href} className="hover:text-foreground">
                    {active.label}
                  </Link>
                ) : (
                  <span className="text-foreground">{active.label}</span>
                )}
              </>
            ) : null}
            {breadcrumbTail ? (
              <>
                <ChevronRight className="size-3" aria-hidden />
                <span className="truncate text-foreground">{breadcrumbTail}</span>
              </>
            ) : null}
          </nav>
          <p className="truncate text-base font-semibold tracking-tight">{title}</p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
          className="shrink-0"
        >
          <Sun className="size-4 dark:hidden" />
          <Moon className="hidden size-4 dark:block" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 gap-2 px-2" aria-label="Account menu">
              <Avatar className="size-7">
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-left sm:block">
                <span className="block max-w-[9rem] truncate text-sm font-medium leading-tight">
                  {user.name}
                </span>
                <span className="block text-xs leading-tight text-muted-foreground">
                  {LABELS.role[user.role]}
                </span>
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="font-normal">
              <span className="block text-sm font-medium">{user.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <User className="size-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings#password">
                <KeyRound className="size-4" />
                Change password
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={isSigningOut}
              onSelect={(event) => {
                event.preventDefault();
                void signOut();
              }}
            >
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

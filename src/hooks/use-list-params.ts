"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Keeps list state (search, filters, sort, page) in the URL so every table view
 * is shareable, bookmarkable and survives a refresh. Server components read the
 * same params, so navigating re-renders with fresh data.
 */
export function useListParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const setParams = useCallback(
    (updates: Record<string, string | number | undefined | null>) => {
      const next = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === null || value === "" || value === "all") {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      }

      // Any filter change invalidates the current page number.
      if (!("page" in updates)) next.delete("page");

      startTransition(() => {
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const get = useCallback(
    (key: string, fallback = "") => searchParams.get(key) ?? fallback,
    [searchParams],
  );

  const reset = useCallback(() => {
    startTransition(() => router.replace(pathname, { scroll: false }));
  }, [pathname, router]);

  return { params: searchParams, get, setParams, reset, isPending };
}

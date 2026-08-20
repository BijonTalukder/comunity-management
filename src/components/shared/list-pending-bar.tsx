"use client";

import { useListParams } from "@/hooks/use-list-params";

/**
 * Indeterminate bar shown while a filter/sort/page change is in flight.
 *
 * List routes deliberately have no `loading.tsx`: a route-level Suspense
 * boundary would stream the shell before the page runs, which both flashes an
 * empty skeleton over data that is still perfectly readable and stops
 * `notFound()` from setting a 404 status on detail routes underneath.
 */
export function ListPendingBar() {
  const { isPending } = useListParams();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={isPending ? "Loading results" : ""}
      className="relative h-0.5 overflow-hidden rounded-full"
    >
      {isPending ? (
        <span className="absolute inset-y-0 left-0 w-1/3 animate-[list-pending_1s_ease-in-out_infinite] rounded-full bg-primary" />
      ) : null}
    </div>
  );
}

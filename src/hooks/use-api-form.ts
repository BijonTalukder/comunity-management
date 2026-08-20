"use client";

import { useCallback } from "react";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { toast } from "sonner";
import { ApiClientError } from "@/lib/api-client";

/**
 * Routes server-side validation errors back onto the matching form fields and
 * surfaces anything else as a toast, so a rejected save is never silent.
 */
export function useApiErrorHandler<T extends FieldValues>(setError: UseFormSetError<T>) {
  return useCallback(
    (error: unknown, fallbackMessage = "Something went wrong") => {
      if (error instanceof ApiClientError) {
        let matched = false;
        for (const fieldError of error.errors) {
          if (fieldError.field && fieldError.field !== "_root") {
            setError(fieldError.field as Path<T>, {
              type: "server",
              message: fieldError.message,
            });
            matched = true;
          }
        }
        // Only toast when nothing was attached to a field, otherwise the user
        // gets the same message twice.
        if (!matched) toast.error(error.message);
        return;
      }
      toast.error(error instanceof Error ? error.message : fallbackMessage);
    },
    [setError],
  );
}

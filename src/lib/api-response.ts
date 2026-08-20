import { NextResponse } from "next/server";
import { ZodError } from "zod";
import mongoose from "mongoose";
import { AppError, RateLimitError } from "@/lib/errors";
import type { ApiFailure, ApiFieldError, ApiSuccess } from "@/types";

export function ok<T>(data: T, message = "Success", status = 200) {
  return NextResponse.json<ApiSuccess<T>>({ success: true, message, data }, { status });
}

export function created<T>(data: T, message = "Created successfully") {
  return ok(data, message, 201);
}

export function fail(message: string, status = 400, errors: ApiFieldError[] = []) {
  return NextResponse.json<ApiFailure>({ success: false, message, errors }, { status });
}

function zodToFieldErrors(error: ZodError): ApiFieldError[] {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "_root",
    message: issue.message,
  }));
}

/** Turns a duplicate-key error into a field-level message for the offending key. */
function duplicateKeyErrors(error: mongoose.mongo.MongoServerError): ApiFieldError[] {
  const keys = Object.keys((error.keyPattern as Record<string, unknown>) ?? {});
  if (keys.length === 0) return [];
  return [{ field: keys[0], message: "This value is already in use" }];
}

/**
 * Single translation point from thrown errors to API failures, so route
 * handlers never have to build error payloads themselves.
 */
export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return fail("Validation failed", 422, zodToFieldErrors(error));
  }

  if (error instanceof RateLimitError) {
    const response = fail(error.message, error.status, error.errors);
    response.headers.set("Retry-After", String(error.retryAfterSeconds));
    return response;
  }

  if (error instanceof AppError) {
    return fail(error.message, error.status, error.errors);
  }

  if (error instanceof mongoose.Error.ValidationError) {
    const errors = Object.entries(error.errors).map(([field, err]) => ({
      field,
      message: err.message,
    }));
    return fail("Validation failed", 422, errors);
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  ) {
    const dup = error as mongoose.mongo.MongoServerError;
    return fail("A record with these details already exists", 409, duplicateKeyErrors(dup));
  }

  console.error("[api] Unhandled error:", error);
  return fail("Something went wrong. Please try again.", 500);
}

/** Wraps a route handler so thrown errors become consistent API failures. */
export function route<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

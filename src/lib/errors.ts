import type { ApiFieldError } from "@/types";

/** Error type that route handlers translate directly into an API failure. */
export class AppError extends Error {
  readonly status: number;
  readonly errors: ApiFieldError[];

  constructor(message: string, status = 400, errors: ApiFieldError[] = []) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.errors = errors;
  }
}

export class ValidationError extends AppError {
  constructor(errors: ApiFieldError[], message = "Validation failed") {
    super(message, 422, errors);
    this.name = "ValidationError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super(message, 403);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(entity = "Record") {
    super(`${entity} not found`, 404);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string, errors: ApiFieldError[] = []) {
    super(message, 409, errors);
    this.name = "ConflictError";
  }
}

export class RateLimitError extends AppError {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number, message = "Too many attempts. Please try again later.") {
    super(message, 429);
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

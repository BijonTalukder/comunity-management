import type { ApiFieldError, ApiResult } from "@/types";

/** Error carrying the field-level messages a form needs to display. */
export class ApiClientError extends Error {
  readonly status: number;
  readonly errors: ApiFieldError[];

  constructor(message: string, status: number, errors: ApiFieldError[] = []) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.errors = errors;
  }

  /** Maps errors onto react-hook-form field names. */
  get fieldErrors(): Record<string, string> {
    return Object.fromEntries(this.errors.map((error) => [error.field, error.message]));
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    credentials: "same-origin",
  });

  let payload: ApiResult<T> | null = null;
  try {
    payload = (await response.json()) as ApiResult<T>;
  } catch {
    // Fall through to the status-based error below.
  }

  if (!response.ok || !payload || payload.success === false) {
    throw new ApiClientError(
      payload && !payload.success ? payload.message : `Request failed (${response.status})`,
      response.status,
      payload && !payload.success ? payload.errors : [],
    );
  }

  return payload.data;
}

export const api = {
  get: <T>(url: string, init?: RequestInit) => request<T>(url, { ...init, method: "GET" }),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "POST", body: JSON.stringify(body ?? {}) }),
  patch: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "PATCH", body: JSON.stringify(body ?? {}) }),
  delete: <T>(url: string) => request<T>(url, { method: "DELETE" }),
};

/** Builds a query string, dropping empty values. */
export function toQueryString(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

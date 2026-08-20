import { format, formatDistanceToNow, isValid } from "date-fns";

export function formatDate(value?: Date | string | null, pattern = "dd MMM yyyy"): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return isValid(date) ? format(date, pattern) : "—";
}

export function formatDateTime(value?: Date | string | null): string {
  return formatDate(value, "dd MMM yyyy, h:mm a");
}

export function formatRelative(value?: Date | string | null): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return isValid(date) ? `${formatDistanceToNow(date)} ago` : "—";
}

export function calculateAge(dateOfBirth?: Date | string | null): number | null {
  if (!dateOfBirth) return null;
  const dob = typeof dateOfBirth === "string" ? new Date(dateOfBirth) : dateOfBirth;
  if (!isValid(dob)) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

/** Two-letter initials for avatar fallbacks. */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Formats a date for an `<input type="date">` value. */
export function toDateInputValue(value?: Date | string | null): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  return isValid(date) ? format(date, "yyyy-MM-dd") : "";
}

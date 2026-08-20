import "server-only";
import { APP_NAME } from "@/lib/env";

export type ColumnFormat = "text" | "number" | "currency" | "date" | "datetime";

export type ReportColumn<T> = {
  header: string;
  /** Extracts the raw cell value; formatting is applied by the renderer. */
  value: (row: T) => string | number | Date | null | undefined;
  format?: ColumnFormat;
  /** Relative width hint, honoured by both the Excel and PDF renderers. */
  width?: number;
  /**
   * Omit this column from the PDF. Wide reports stay readable on paper while
   * the Excel export keeps every field.
   */
  pdfHidden?: boolean;
};

export type ReportMeta = {
  label: string;
  value: string;
};

export type ReportDefinition<T> = {
  /** Report name shown in the document header, e.g. "People Directory". */
  title: string;
  subtitle?: string;
  /** Base filename without extension. */
  filename: string;
  generatedBy: string;
  generatedAt: Date;
  /** Filters that were applied, echoed into the report for traceability. */
  filters: ReportMeta[];
  summary: ReportMeta[];
  columns: ReportColumn<T>[];
  rows: T[];
  /** Columns to total in the Excel summary row, by column index. */
  totalColumns?: number[];
};

export const REPORT_APP_NAME = APP_NAME;

/** Turns a query object into human-readable "Applied filters" entries. */
export function describeFilters(
  query: Record<string, unknown>,
  labels: Record<string, string>,
): ReportMeta[] {
  const skip = new Set(["page", "limit", "sortBy", "sortOrder", "view", "format"]);
  const entries: ReportMeta[] = [];

  for (const [key, value] of Object.entries(query)) {
    if (skip.has(key) || value === undefined || value === null || value === "") continue;
    const label = labels[key] ?? key;
    const text =
      value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
    entries.push({ label, value: text });
  }

  return entries.length > 0 ? entries : [{ label: "Filters", value: "None (all records)" }];
}

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

/** `Content-Disposition` value that survives non-ASCII report titles. */
export function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

import "server-only";
import { buildExcelReport } from "@/lib/export-excel";
import { buildPdfReport } from "@/lib/export-pdf";
import { contentDisposition, sanitizeFilename, type ReportDefinition } from "@/lib/report";
import { createAuditLog } from "@/lib/audit";
import type { Actor } from "@/lib/actor";
import type { AuditEntityType } from "@/types";

export type ExportFormat = "excel" | "pdf";

const MIME: Record<ExportFormat, string> = {
  excel: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};

const EXTENSION: Record<ExportFormat, string> = { excel: "xlsx", pdf: "pdf" };

/**
 * Renders a report in the requested format, records the export in the audit
 * trail, and returns it as a download response.
 */
export async function respondWithReport<T>(
  report: ReportDefinition<T>,
  format: ExportFormat,
  actor: Actor,
  entityType: AuditEntityType = "Report",
): Promise<Response> {
  const body =
    format === "excel" ? await buildExcelReport(report) : await buildPdfReport(report);

  const date = report.generatedAt.toISOString().slice(0, 10);
  const filename = `${sanitizeFilename(report.filename)}-${date}.${EXTENSION[format]}`;

  await createAuditLog({
    entityType,
    entityLabel: report.title,
    action: "EXPORT",
    changes: [
      { field: "format", oldValue: null, newValue: format },
      { field: "recordCount", oldValue: null, newValue: report.rows.length },
      ...report.filters.map((filter) => ({
        field: `filter.${filter.label}`,
        oldValue: null,
        newValue: filter.value,
      })),
    ],
    context: actor,
  });

  return new Response(new Uint8Array(body), {
    status: 200,
    headers: {
      "Content-Type": MIME[format],
      "Content-Disposition": contentDisposition(filename),
      "Content-Length": String(body.byteLength),
      "Cache-Control": "no-store",
    },
  });
}

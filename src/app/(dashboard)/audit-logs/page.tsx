import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { AuditClient, type AuditRow } from "./audit-client";
import { can, requirePermission } from "@/lib/permissions";
import { listAuditLogs, listAuditPerformers } from "@/services/audit.service";
import { auditListQuerySchema } from "@/validations/audit.schema";
import { parseSearchParams } from "@/lib/search-params";

export const metadata: Metadata = { title: "Audit Logs" };
export const dynamic = "force-dynamic";

export default async function AuditLogsPage({ searchParams }: PageProps<"/audit-logs">) {
  const user = await requirePermission("audit:read");
  const query = parseSearchParams(await searchParams, auditListQuerySchema);

  const [data, performers] = await Promise.all([
    listAuditLogs(query),
    listAuditPerformers(),
  ]);

  return (
    <>
      <PageHeader
        title="Audit Logs"
        description={`${data.total} recorded action${data.total === 1 ? "" : "s"}. Expand a row to see exactly which fields changed.`}
      />

      <AuditClient
        data={{ ...data, items: JSON.parse(JSON.stringify(data.items)) as AuditRow[] }}
        performers={JSON.parse(JSON.stringify(performers))}
        canExport={can(user, "reports:export")}
      />
    </>
  );
}

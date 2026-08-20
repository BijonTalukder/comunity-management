import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { InstitutionsToolbar } from "@/components/institutions/institutions-toolbar";
import {
  InstitutionsTable,
  type InstitutionRow,
} from "@/components/institutions/institutions-table";
import { can, requirePermission } from "@/lib/permissions";
import { listInstitutions } from "@/services/institution.service";
import { institutionListQuerySchema } from "@/validations/institution.schema";
import { parseSearchParams } from "@/lib/search-params";

export const metadata: Metadata = { title: "Institutions" };
export const dynamic = "force-dynamic";

export default async function InstitutionsPage({
  searchParams,
}: PageProps<"/institutions">) {
  const user = await requirePermission("institutions:read");
  const query = parseSearchParams(await searchParams, institutionListQuerySchema);
  const data = await listInstitutions(query);

  return (
    <>
      <PageHeader
        title="Institutions"
        description={`${data.total} school${data.total === 1 ? "" : "s"}, college${data.total === 1 ? "" : "s"} and other institutions on record`}
      />

      <InstitutionsToolbar
        canWrite={can(user, "institutions:write")}
        canExport={can(user, "reports:export")}
      />

      <InstitutionsTable
        data={{
          ...data,
          items: JSON.parse(JSON.stringify(data.items)) as InstitutionRow[],
        }}
        canWrite={can(user, "institutions:write")}
        canDelete={can(user, "institutions:delete")}
        hasFilters={Boolean(query.search || query.type || query.status || query.area)}
      />
    </>
  );
}

import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PeopleToolbar } from "@/components/people/people-toolbar";
import { PeopleTable } from "@/components/people/people-table";
import { requirePermission, can } from "@/lib/permissions";
import { listAreas, listPeople } from "@/services/people.service";
import { personListQuerySchema } from "@/validations/people.schema";
import { parseSearchParams } from "@/lib/search-params";

export const metadata: Metadata = { title: "People" };
export const dynamic = "force-dynamic";

export default async function PeoplePage({ searchParams }: PageProps<"/people">) {
  const user = await requirePermission("people:read");
  const query = parseSearchParams(await searchParams, personListQuerySchema);

  const [data, areas] = await Promise.all([listPeople(query), listAreas()]);

  const hasFilters = Boolean(
    query.search || query.gender || query.status || query.area || query.hasChildren,
  );

  return (
    <>
      <PageHeader
        title="People"
        description={`${data.total} member${data.total === 1 ? "" : "s"} in the community directory`}
      />

      <PeopleToolbar
        areas={areas}
        canWrite={can(user, "people:write")}
        canExport={can(user, "reports:export")}
      />

      <PeopleTable
        data={data}
        areas={areas}
        canWrite={can(user, "people:write")}
        canDelete={can(user, "people:delete")}
        hasFilters={hasFilters}
      />
    </>
  );
}

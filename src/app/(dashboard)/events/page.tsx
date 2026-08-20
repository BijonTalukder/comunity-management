import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { EventsToolbar } from "@/components/events/events-toolbar";
import { EventsGrid, type EventRow } from "@/components/events/events-grid";
import { can, requirePermission } from "@/lib/permissions";
import { listEvents } from "@/services/event.service";
import { eventListQuerySchema } from "@/validations/event.schema";
import { parseSearchParams } from "@/lib/search-params";
import { formatCurrency } from "@/lib/money";

export const metadata: Metadata = { title: "Events" };
export const dynamic = "force-dynamic";

export default async function EventsPage({ searchParams }: PageProps<"/events">) {
  const user = await requirePermission("events:read");
  const query = parseSearchParams(await searchParams, eventListQuerySchema);
  const data = await listEvents(query);

  const pageTotal = data.items.reduce((sum, event) => sum + event.totalAmountMinor, 0);

  return (
    <>
      <PageHeader
        title="Events"
        description={`${data.total} event${data.total === 1 ? "" : "s"} · ${formatCurrency(pageTotal)} collected on this page`}
      />

      <EventsToolbar
        canWrite={can(user, "events:write")}
        canExport={can(user, "reports:export")}
      />

      <EventsGrid
        data={{ ...data, items: JSON.parse(JSON.stringify(data.items)) as EventRow[] }}
        canWrite={can(user, "events:write")}
        canDelete={can(user, "events:delete")}
        hasFilters={Boolean(query.search || query.status || query.eventType)}
      />
    </>
  );
}

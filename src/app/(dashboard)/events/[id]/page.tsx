import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, HandCoins, Receipt, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/shared/stat-card";
import { EventHeader } from "@/components/events/event-header";
import {
  ContributionsPanel,
  type ContributionRow,
  type ContributorRow,
} from "@/components/events/contributions-panel";
import { can, requirePermission } from "@/lib/permissions";
import { getEventById, getEventStats } from "@/services/event.service";
import {
  listContributions,
  listContributorSummary,
} from "@/services/contribution.service";
import { contributionListQuerySchema } from "@/validations/contribution.schema";
import { parseSearchParams } from "@/lib/search-params";
import { NotFoundError } from "@/lib/errors";
import { formatCurrency } from "@/lib/money";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/events/[id]">): Promise<Metadata> {
  const { id } = await params;
  try {
    const event = await getEventById(id);
    return { title: event.name };
  } catch {
    return { title: "Event" };
  }
}

export default async function EventDetailPage({
  params,
  searchParams,
}: PageProps<"/events/[id]">) {
  const user = await requirePermission("events:read");
  const { id } = await params;
  const query = parseSearchParams(await searchParams, contributionListQuerySchema);

  let event;
  try {
    event = await getEventById(id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const canReadContributions = can(user, "contributions:read");

  const [stats, contributors, payments] = await Promise.all([
    getEventStats(id),
    canReadContributions
      ? listContributorSummary(id, query)
      : Promise.resolve({ items: [], page: 1, limit: 20, total: 0, totalPages: 1 }),
    canReadContributions
      ? listContributions({ ...query, eventId: id })
      : Promise.resolve({ items: [], page: 1, limit: 20, total: 0, totalPages: 1 }),
  ]);

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
        <Link href="/events">
          <ArrowLeft className="size-4" />
          Back to events
        </Link>
      </Button>

      <EventHeader
        event={JSON.parse(JSON.stringify(event))}
        canWrite={can(user, "events:write")}
        canExport={can(user, "reports:export")}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total collected"
          value={formatCurrency(stats.totalAmountMinor)}
          icon={HandCoins}
          tone="primary"
          hint={
            stats.lastPaymentAt
              ? `Last payment ${formatDate(stats.lastPaymentAt)}`
              : "No payments yet"
          }
        />
        <StatCard
          label="Contributors"
          value={stats.contributorCount}
          icon={Users}
          tone="success"
          hint={`${formatCurrency(stats.averagePerContributorMinor)} average each`}
        />
        <StatCard
          label="Payment records"
          value={stats.paymentCount}
          icon={Receipt}
          hint={`${formatCurrency(stats.averagePaymentMinor)} average payment`}
        />
        <StatCard
          label="Largest payment"
          value={formatCurrency(stats.largestPaymentMinor)}
          icon={TrendingUp}
          tone="warning"
        />
      </div>

      {canReadContributions ? (
        <ContributionsPanel
          eventId={id}
          eventName={event.name}
          contributors={{
            ...contributors,
            items: JSON.parse(JSON.stringify(contributors.items)) as ContributorRow[],
          }}
          payments={{
            ...payments,
            items: JSON.parse(JSON.stringify(payments.items)) as ContributionRow[],
          }}
          canWrite={can(user, "contributions:write")}
          canDelete={can(user, "contributions:delete")}
        />
      ) : null}
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import {
  Baby,
  Building2,
  CalendarDays,
  HandCoins,
  ScrollText,
  UsersRound,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ChartShell } from "@/components/dashboard/chart-shell";
import {
  ContributionsByEventChart,
  GenderChart,
  MonthlyContributionsChart,
} from "@/components/dashboard/charts";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getDashboardSummary } from "@/services/dashboard.service";
import { formatCurrency } from "@/lib/money";
import { formatRelative } from "@/lib/format";
import { LABELS } from "@/types";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireAuth();
  const summary = await getDashboardSummary();
  const { totals } = summary;

  const hasContributions = summary.contributionsByEvent.length > 0;
  const hasMonthly = summary.monthlyContributions.some((row) => row.totalMinor > 0);

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        description="A snapshot of the community, its households and event contributions."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total people"
          value={totals.people}
          icon={UsersRound}
          tone="primary"
          hint={`${totals.male} male · ${totals.female} female${totals.other > 0 ? ` · ${totals.other} other` : ""}`}
        />
        <StatCard
          label="Total children"
          value={totals.children}
          icon={Baby}
          hint="Across all households"
        />
        <StatCard
          label="Institutions"
          value={totals.institutions}
          icon={Building2}
          hint="Schools, colleges and more"
        />
        <StatCard
          label="Total contribution"
          value={formatCurrency(totals.contributionMinor)}
          icon={HandCoins}
          tone="success"
          hint={`Across ${totals.events} event${totals.events === 1 ? "" : "s"}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartShell
          title="Gender distribution"
          description="Active community members"
        >
          {totals.people > 0 ? (
            <GenderChart data={summary.genderDistribution} />
          ) : (
            <EmptyState
              icon={UsersRound}
              title="No people yet"
              description="Add community members to see the breakdown."
            />
          )}
        </ChartShell>

        <ChartShell
          title="Monthly contributions"
          description="Last 12 months"
          className="lg:col-span-2"
        >
          {hasMonthly ? (
            <MonthlyContributionsChart data={summary.monthlyContributions} />
          ) : (
            <EmptyState
              icon={HandCoins}
              title="No contributions in the last year"
              description="Record payments against an event to see the trend."
            />
          )}
        </ChartShell>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartShell
          title="Contributions by event"
          description="Top events by amount collected"
          className="lg:col-span-2"
          action={
            can(user, "events:read") ? (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/events">View all</Link>
              </Button>
            ) : undefined
          }
        >
          {hasContributions ? (
            <ContributionsByEventChart data={summary.contributionsByEvent} />
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="No event contributions yet"
              description="Create an event and record its first payment."
            />
          )}
        </ChartShell>

        <ChartShell
          title="Recent activity"
          description="Latest changes across the system"
          action={
            can(user, "audit:read") ? (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/audit-logs">View log</Link>
              </Button>
            ) : undefined
          }
        >
          {summary.recentActivity.length === 0 ? (
            <EmptyState icon={ScrollText} title="Nothing has happened yet" />
          ) : (
            <ol className="space-y-3">
              {summary.recentActivity.map((entry) => (
                <li key={entry._id} className="flex items-start gap-3">
                  <StatusBadge
                    status={entry.action}
                    label={
                      LABELS.auditAction[entry.action as keyof typeof LABELS.auditAction] ??
                      entry.action
                    }
                    className="mt-0.5 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      {entry.entityLabel ?? entry.entityType}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {entry.performerName ?? "System"} · {formatRelative(entry.performedAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </ChartShell>
      </div>
    </>
  );
}

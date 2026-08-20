import Link from "next/link";
import { HandCoins } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { LABELS, type PaymentMethod } from "@/types";

export type PersonContributionGroup = {
  eventId: string;
  eventName: string;
  eventStatus: string;
  totalAmountMinor: number;
  paymentCount: number;
  lastPaymentAt: string;
  payments: {
    _id: string;
    amountMinor: number;
    paymentDate: string;
    paymentMethod: PaymentMethod;
    transactionReference?: string;
  }[];
};

/** A person's payments grouped by event, newest event first. */
export function PersonContributions({ groups }: { groups: PersonContributionGroup[] }) {
  if (groups.length === 0) {
    return (
      <div className="rounded-xl border bg-card">
        <EmptyState
          icon={HandCoins}
          title="No contributions recorded"
          description="Payments this person makes towards an event will appear here, grouped by event."
        />
      </div>
    );
  }

  const grandTotal = groups.reduce((sum, group) => sum + group.totalAmountMinor, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border bg-card px-5 py-4">
        <span className="text-sm text-muted-foreground">
          Lifetime contribution across {groups.length} event
          {groups.length === 1 ? "" : "s"}
        </span>
        <span className="tabular text-2xl font-semibold tracking-tight">
          {formatCurrency(grandTotal)}
        </span>
      </div>

      {groups.map((group) => (
        <div key={group.eventId} className="overflow-hidden rounded-xl border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/35 px-5 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/events/${group.eventId}`}
                className="font-medium hover:underline"
              >
                {group.eventName}
              </Link>
              <StatusBadge
                status={group.eventStatus}
                label={
                  LABELS.eventStatus[group.eventStatus as keyof typeof LABELS.eventStatus] ??
                  group.eventStatus
                }
              />
            </div>
            <div className="text-right">
              <p className="tabular text-lg font-semibold">
                {formatCurrency(group.totalAmountMinor)}
              </p>
              <p className="text-xs text-muted-foreground">
                {group.paymentCount} payment{group.paymentCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Paid on</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.payments.map((payment) => (
                <TableRow key={payment._id}>
                  <TableCell className="text-sm">{formatDate(payment.paymentDate)}</TableCell>
                  <TableCell className="text-sm">
                    {LABELS.paymentMethod[payment.paymentMethod]}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {payment.transactionReference || "—"}
                  </TableCell>
                  <TableCell className="tabular text-right font-medium">
                    {formatCurrency(payment.amountMinor)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
}

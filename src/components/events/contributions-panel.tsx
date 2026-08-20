"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ban,
  HandCoins,
  MoreHorizontal,
  Pencil,
  Plus,
  Receipt,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SearchInput } from "@/components/shared/search-input";
import { Pagination } from "@/components/shared/pagination";
import {
  ContributionFormDialog,
  type ContributionInitial,
} from "@/components/events/contribution-form";
import type { PersonOption } from "@/components/people/person-combobox";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { LABELS, type ContributionStatus, type Paginated, type PaymentMethod } from "@/types";

export type ContributionRow = {
  _id: string;
  amountMinor: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  notes?: string;
  status: ContributionStatus;
  person?: PersonOption | null;
};

export type ContributorRow = {
  personId: string;
  fullName: string;
  mobileNumber?: string;
  area?: string;
  totalAmountMinor: number;
  paymentCount: number;
  lastPaymentAt: string;
};

export function ContributionsPanel({
  eventId,
  eventName,
  contributors,
  payments,
  canWrite,
  canDelete,
}: {
  eventId: string;
  eventName: string;
  contributors: Paginated<ContributorRow>;
  payments: Paginated<ContributionRow>;
  canWrite: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ContributionInitial | undefined>();
  const [lockedPerson, setLockedPerson] = useState<PersonOption | null>(null);
  const [voiding, setVoiding] = useState<ContributionRow | null>(null);

  const openCreate = (person?: PersonOption | null) => {
    setEditing(undefined);
    setLockedPerson(person ?? null);
    setFormOpen(true);
  };

  const openEdit = (contribution: ContributionRow) => {
    setLockedPerson(null);
    setEditing(contribution);
    setFormOpen(true);
  };

  const voidPayment = async () => {
    if (!voiding) return;
    try {
      await api.delete(`/api/contributions/${voiding._id}`);
      toast.success("Contribution voided");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not void this contribution");
    }
  };

  const hasAnything = contributors.total > 0;

  return (
    <>
      <Tabs defaultValue="contributors" className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <TabsList>
            <TabsTrigger value="contributors">
              <Users className="size-3.5" aria-hidden />
              By contributor
            </TabsTrigger>
            <TabsTrigger value="payments">
              <Receipt className="size-3.5" aria-hidden />
              All payments
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <SearchInput placeholder="Search contributors…" />
            {canWrite ? (
              <Button onClick={() => openCreate()}>
                <Plus className="size-4" />
                Record payment
              </Button>
            ) : null}
          </div>
        </div>

        <TabsContent value="contributors">
          {!hasAnything ? (
            <div className="rounded-xl border bg-card">
              <EmptyState
                icon={HandCoins}
                title="No contributions yet"
                description="Record the first payment towards this event."
                action={
                  canWrite ? (
                    <Button size="sm" onClick={() => openCreate()}>
                      <Plus className="size-4" />
                      Record payment
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card">
              <div className="thin-scrollbar overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="min-w-[220px]">Person</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Area</TableHead>
                      <TableHead className="text-right">Total paid</TableHead>
                      <TableHead className="text-right">Payments</TableHead>
                      <TableHead>Last payment</TableHead>
                      {canWrite ? <TableHead className="w-12" /> : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contributors.items.map((contributor) => (
                      <TableRow key={contributor.personId}>
                        <TableCell>
                          <Link
                            href={`/people/${contributor.personId}`}
                            className="font-medium hover:underline"
                          >
                            {contributor.fullName}
                          </Link>
                        </TableCell>
                        <TableCell className="tabular text-sm">
                          {contributor.mobileNumber || "—"}
                        </TableCell>
                        <TableCell className="text-sm">{contributor.area || "—"}</TableCell>
                        <TableCell className="tabular text-right font-semibold">
                          {formatCurrency(contributor.totalAmountMinor)}
                        </TableCell>
                        <TableCell className="tabular text-right text-sm">
                          {contributor.paymentCount}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(contributor.lastPaymentAt)}
                        </TableCell>
                        {canWrite ? (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              aria-label={`Add another payment for ${contributor.fullName}`}
                              onClick={() =>
                                openCreate({
                                  _id: contributor.personId,
                                  fullName: contributor.fullName,
                                  mobileNumber: contributor.mobileNumber,
                                  area: contributor.area,
                                })
                              }
                            >
                              <Plus className="size-4" />
                            </Button>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination {...contributors} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="payments">
          {payments.items.length === 0 ? (
            <div className="rounded-xl border bg-card">
              <EmptyState
                icon={Receipt}
                title="No payment records"
                description="Individual payments will be listed here as they are recorded."
              />
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card">
              <div className="thin-scrollbar overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="min-w-[200px]">Person</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Paid on</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Status</TableHead>
                      {canWrite || canDelete ? <TableHead className="w-12" /> : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.items.map((payment) => (
                      <TableRow key={payment._id}>
                        <TableCell>
                          {payment.person ? (
                            <Link
                              href={`/people/${payment.person._id}`}
                              className="font-medium hover:underline"
                            >
                              {payment.person.fullName}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">(deleted person)</span>
                          )}
                        </TableCell>
                        <TableCell className="tabular text-right font-medium">
                          {formatCurrency(payment.amountMinor)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(payment.paymentDate)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {LABELS.paymentMethod[payment.paymentMethod]}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {payment.transactionReference || "—"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={payment.status}
                            label={LABELS.contributionStatus[payment.status]}
                          />
                        </TableCell>
                        {canWrite || canDelete ? (
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                  aria-label="Payment actions"
                                >
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {canWrite ? (
                                  <DropdownMenuItem onSelect={() => openEdit(payment)}>
                                    <Pencil className="size-4" />
                                    Edit
                                  </DropdownMenuItem>
                                ) : null}
                                {canDelete && payment.status === "ACTIVE" ? (
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onSelect={() => setVoiding(payment)}
                                  >
                                    <Ban className="size-4" />
                                    Void
                                  </DropdownMenuItem>
                                ) : null}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination {...payments} />
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ContributionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        eventId={eventId}
        eventName={eventName}
        contribution={editing}
        lockedPerson={lockedPerson}
      />

      <ConfirmDialog
        open={voiding !== null}
        onOpenChange={(open) => !open && setVoiding(null)}
        title="Void this contribution?"
        description={
          <>
            The record is kept for the audit trail but its amount
            {voiding ? ` (${formatCurrency(voiding.amountMinor)})` : ""} is removed
            from every total. This cannot be undone from the UI.
          </>
        }
        confirmLabel="Void payment"
        destructive
        onConfirm={voidPayment}
      />
    </>
  );
}

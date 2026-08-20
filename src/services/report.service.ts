import "server-only";
import { connectToDatabase } from "@/lib/mongodb";
import { formatCurrencyAscii } from "@/lib/money";
import { describeFilters, type ReportDefinition } from "@/lib/report";
import { listPeople } from "@/services/people.service";
import { listChildren, type ChildWithRelations } from "@/services/children.service";
import {
  listInstitutions,
  type InstitutionListItem,
} from "@/services/institution.service";
import { listEvents, getEventById, getEventStats, type EventListItem } from "@/services/event.service";
import {
  listContributions,
  listContributorSummary,
  type ContributionRecord,
  type ContributorSummary,
} from "@/services/contribution.service";
import { listAuditLogs, type AuditLogEntry } from "@/services/audit.service";
import type { PersonListItem } from "@/services/people.service";
import { LABELS, type SessionUser } from "@/types";
import { calculateAge } from "@/lib/format";
import type { PersonListQuery } from "@/validations/people.schema";
import type { ChildListQuery } from "@/validations/children.schema";
import type { InstitutionListQuery } from "@/validations/institution.schema";
import type { EventListQuery } from "@/validations/event.schema";
import type { ContributionListQuery } from "@/validations/contribution.schema";
import type { AuditListQuery } from "@/validations/audit.schema";

/**
 * Reports export the full filtered result set rather than the current page,
 * capped so a runaway export cannot exhaust memory.
 */
const EXPORT_LIMIT = 5000;

function exportQuery<T extends { page: number; limit: number }>(query: T): T {
  return { ...query, page: 1, limit: EXPORT_LIMIT };
}

function base(
  title: string,
  filename: string,
  actor: SessionUser,
): Pick<ReportDefinition<never>, "title" | "filename" | "generatedBy" | "generatedAt"> {
  return {
    title,
    filename,
    generatedBy: `${actor.name} <${actor.email}>`,
    generatedAt: new Date(),
  };
}

export async function buildPeopleReport(
  query: PersonListQuery,
  actor: SessionUser,
): Promise<ReportDefinition<PersonListItem>> {
  await connectToDatabase();
  const { items, total } = await listPeople(exportQuery(query));

  const genderCounts = items.reduce<Record<string, number>>((acc, person) => {
    acc[person.gender] = (acc[person.gender] ?? 0) + 1;
    return acc;
  }, {});
  const totalChildren = items.reduce((sum, person) => sum + person.childrenCount, 0);

  return {
    ...base("People Directory", "people-directory", actor),
    subtitle: "Community members and their household details",
    filters: describeFilters(query, {
      search: "Search",
      gender: "Gender",
      status: "Status",
      area: "Area",
      hasChildren: "Has children",
    }),
    summary: [
      { label: "People exported", value: String(items.length) },
      { label: "Matching records", value: String(total) },
      { label: "Male", value: String(genderCounts.MALE ?? 0) },
      { label: "Female", value: String(genderCounts.FEMALE ?? 0) },
      { label: "Total children", value: String(totalChildren) },
    ],
    columns: [
      { header: "Full name", value: (p) => p.fullName, width: 26 },
      { header: "Father/Husband", value: (p) => p.fatherOrHusbandName, width: 24 },
      { header: "Mother", value: (p) => p.motherName, width: 22, pdfHidden: true },
      { header: "Gender", value: (p) => LABELS.gender[p.gender], width: 12 },
      { header: "Date of birth", value: (p) => p.dateOfBirth ?? null, format: "date", width: 16 },
      { header: "Age", value: (p) => calculateAge(p.dateOfBirth), format: "number", width: 8 },
      { header: "Mobile", value: (p) => p.mobileNumber, width: 16 },
      {
        header: "Alt. mobile",
        value: (p) => p.alternativeMobileNumber,
        width: 16,
        pdfHidden: true,
      },
      { header: "Email", value: (p) => p.email, width: 22, pdfHidden: true },
      { header: "Area", value: (p) => p.area, width: 16 },
      { header: "Address", value: (p) => p.address, width: 28, pdfHidden: true },
      { header: "Occupation", value: (p) => p.occupation, width: 18 },
      { header: "Children", value: (p) => p.childrenCount, format: "number", width: 10 },
      { header: "Status", value: (p) => LABELS.personStatus[p.status], width: 12 },
      {
        header: "Created",
        value: (p) => p.createdAt,
        format: "date",
        width: 16,
        pdfHidden: true,
      },
    ],
    rows: items,
  };
}

export async function buildChildrenReport(
  query: ChildListQuery,
  actor: SessionUser,
): Promise<ReportDefinition<ChildWithRelations>> {
  await connectToDatabase();
  const { items, total } = await listChildren(exportQuery(query));

  const studying = items.filter((child) => child.educationStatus === "STUDYING").length;

  return {
    ...base("Children Register", "children-register", actor),
    subtitle: "Children linked to community members, with education details",
    filters: describeFilters(query, {
      search: "Search",
      gender: "Gender",
      educationStatus: "Education status",
      institutionId: "Institution",
      parentId: "Parent",
    }),
    summary: [
      { label: "Children exported", value: String(items.length) },
      { label: "Matching records", value: String(total) },
      { label: "Currently studying", value: String(studying) },
    ],
    columns: [
      { header: "Child name", value: (c) => c.fullName, width: 24 },
      { header: "Parent", value: (c) => c.parent?.fullName, width: 24 },
      { header: "Parent mobile", value: (c) => c.parent?.mobileNumber, width: 16 },
      { header: "Relationship", value: (c) => LABELS.relationship[c.relationship], width: 14 },
      { header: "Gender", value: (c) => LABELS.gender[c.gender], width: 12 },
      { header: "Date of birth", value: (c) => c.dateOfBirth ?? null, format: "date", width: 16 },
      { header: "Age", value: (c) => calculateAge(c.dateOfBirth), format: "number", width: 8 },
      {
        header: "Education",
        value: (c) => LABELS.educationStatus[c.educationStatus],
        width: 16,
      },
      { header: "Institution", value: (c) => c.institution?.name, width: 28 },
      { header: "Class", value: (c) => c.classOrGrade, width: 12 },
      { header: "Section", value: (c) => c.section, width: 10, pdfHidden: true },
      { header: "Roll", value: (c) => c.rollNumber, width: 10 },
    ],
    rows: items,
  };
}

export async function buildInstitutionsReport(
  query: InstitutionListQuery,
  actor: SessionUser,
): Promise<ReportDefinition<InstitutionListItem>> {
  await connectToDatabase();
  const { items, total } = await listInstitutions(exportQuery(query));

  return {
    ...base("Institutions", "institutions", actor),
    subtitle: "Schools, colleges and other institutions on record",
    filters: describeFilters(query, {
      search: "Search",
      type: "Type",
      status: "Status",
      area: "Area",
    }),
    summary: [
      { label: "Institutions exported", value: String(items.length) },
      { label: "Matching records", value: String(total) },
      {
        label: "Linked students",
        value: String(items.reduce((sum, row) => sum + row.childrenCount, 0)),
      },
    ],
    columns: [
      { header: "Name", value: (i) => i.name, width: 32 },
      { header: "Type", value: (i) => LABELS.institutionType[i.type], width: 18 },
      { header: "Area", value: (i) => i.area, width: 18 },
      { header: "City", value: (i) => i.city, width: 16 },
      { header: "Country", value: (i) => i.country, width: 14 },
      { header: "Address", value: (i) => i.address, width: 30, pdfHidden: true },
      { header: "Students", value: (i) => i.childrenCount, format: "number", width: 12 },
      { header: "Status", value: (i) => LABELS.institutionStatus[i.status], width: 12 },
    ],
    rows: items,
  };
}

export async function buildEventsReport(
  query: EventListQuery,
  actor: SessionUser,
): Promise<ReportDefinition<EventListItem>> {
  await connectToDatabase();
  const { items, total } = await listEvents(exportQuery(query));

  const grandTotal = items.reduce((sum, event) => sum + event.totalAmountMinor, 0);

  return {
    ...base("Events", "events", actor),
    subtitle: "Community events with contribution totals",
    filters: describeFilters(query, {
      search: "Search",
      status: "Status",
      eventType: "Event type",
    }),
    summary: [
      { label: "Events exported", value: String(items.length) },
      { label: "Matching records", value: String(total) },
      { label: "Combined contributions", value: formatCurrencyAscii(grandTotal) },
    ],
    columns: [
      { header: "Event", value: (e) => e.name, width: 30 },
      { header: "Type", value: (e) => e.eventType, width: 16 },
      { header: "Status", value: (e) => LABELS.eventStatus[e.status], width: 14 },
      { header: "Starts", value: (e) => e.startDate ?? null, format: "date", width: 16 },
      { header: "Ends", value: (e) => e.endDate ?? null, format: "date", width: 16 },
      { header: "Location", value: (e) => e.location, width: 24 },
      {
        header: "Contributors",
        value: (e) => e.contributorCount,
        format: "number",
        width: 14,
      },
      { header: "Payments", value: (e) => e.paymentCount, format: "number", width: 12 },
      {
        header: "Total collected",
        value: (e) => e.totalAmountMinor,
        format: "currency",
        width: 18,
      },
    ],
    totalColumns: [8],
    rows: items,
  };
}

export type EventContributionRow = ContributionRecord;

export async function buildEventContributionsReport(
  eventId: string,
  query: ContributionListQuery,
  actor: SessionUser,
): Promise<ReportDefinition<EventContributionRow>> {
  await connectToDatabase();
  const [event, stats, { items }] = await Promise.all([
    getEventById(eventId),
    getEventStats(eventId),
    listContributions(exportQuery({ ...query, eventId })),
  ]);

  return {
    ...base(
      `${event.name} — Contribution Report`,
      `${event.name}-contributions`,
      actor,
    ),
    subtitle: event.location ? `Held at ${event.location}` : undefined,
    filters: describeFilters(query, {
      search: "Search",
      paymentMethod: "Payment method",
      status: "Status",
      dateFrom: "From",
      dateTo: "To",
      personId: "Person",
    }),
    summary: [
      { label: "Total contributors", value: String(stats.contributorCount) },
      { label: "Total amount", value: formatCurrencyAscii(stats.totalAmountMinor) },
      { label: "Payment records", value: String(stats.paymentCount) },
      {
        label: "Average per contributor",
        value: formatCurrencyAscii(stats.averagePerContributorMinor),
      },
      { label: "Largest single payment", value: formatCurrencyAscii(stats.largestPaymentMinor) },
    ],
    columns: [
      { header: "Person", value: (c) => c.person?.fullName, width: 26 },
      { header: "Mobile", value: (c) => c.person?.mobileNumber, width: 16 },
      { header: "Area", value: (c) => c.person?.area, width: 16 },
      { header: "Amount", value: (c) => c.amountMinor, format: "currency", width: 16 },
      { header: "Paid on", value: (c) => c.paymentDate, format: "date", width: 16 },
      {
        header: "Method",
        value: (c) => LABELS.paymentMethod[c.paymentMethod],
        width: 14,
      },
      { header: "Reference", value: (c) => c.transactionReference, width: 20 },
      { header: "Status", value: (c) => LABELS.contributionStatus[c.status], width: 12 },
      { header: "Notes", value: (c) => c.notes, width: 24, pdfHidden: true },
    ],
    totalColumns: [3],
    rows: items,
  };
}

export async function buildEventContributorsReport(
  eventId: string,
  query: ContributionListQuery,
  actor: SessionUser,
): Promise<ReportDefinition<ContributorSummary>> {
  await connectToDatabase();
  const [event, stats, { items }] = await Promise.all([
    getEventById(eventId),
    getEventStats(eventId),
    listContributorSummary(eventId, exportQuery(query)),
  ]);

  return {
    ...base(
      `${event.name} — Contributor Summary`,
      `${event.name}-contributors`,
      actor,
    ),
    subtitle: "One row per contributor, with their total for this event",
    filters: describeFilters(query, { search: "Search" }),
    summary: [
      { label: "Total contributors", value: String(stats.contributorCount) },
      { label: "Total amount", value: formatCurrencyAscii(stats.totalAmountMinor) },
      { label: "Payment records", value: String(stats.paymentCount) },
    ],
    columns: [
      { header: "Person", value: (c) => c.fullName, width: 30 },
      { header: "Mobile", value: (c) => c.mobileNumber, width: 18 },
      { header: "Area", value: (c) => c.area, width: 18 },
      {
        header: "Total paid",
        value: (c) => c.totalAmountMinor,
        format: "currency",
        width: 18,
      },
      { header: "Payments", value: (c) => c.paymentCount, format: "number", width: 12 },
      {
        header: "Last payment",
        value: (c) => c.lastPaymentAt,
        format: "date",
        width: 18,
      },
    ],
    totalColumns: [3],
    rows: items,
  };
}

export async function buildAuditLogsReport(
  query: AuditListQuery,
  actor: SessionUser,
): Promise<ReportDefinition<AuditLogEntry>> {
  await connectToDatabase();
  const { items, total } = await listAuditLogs(exportQuery(query));

  return {
    ...base("Audit Log", "audit-log", actor),
    subtitle: "Record of every change made in the system",
    filters: describeFilters(query, {
      search: "Search",
      action: "Action",
      entityType: "Module",
      entityId: "Record",
      performedBy: "User",
      dateFrom: "From",
      dateTo: "To",
    }),
    summary: [
      { label: "Entries exported", value: String(items.length) },
      { label: "Matching records", value: String(total) },
    ],
    columns: [
      { header: "Date & time", value: (l) => l.performedAt, format: "datetime", width: 20 },
      { header: "User", value: (l) => l.performer?.name ?? "System", width: 20 },
      { header: "Action", value: (l) => LABELS.auditAction[l.action], width: 14 },
      { header: "Module", value: (l) => l.entityType, width: 14 },
      { header: "Record", value: (l) => l.entityLabel, width: 26 },
      {
        header: "Changes",
        value: (l) =>
          (l.changes ?? [])
            .map(
              (change) =>
                `${change.field}: ${String(change.oldValue ?? "—")} -> ${String(change.newValue ?? "—")}`,
            )
            .join("; "),
        width: 40,
      },
      { header: "IP address", value: (l) => l.ipAddress, width: 16 },
    ],
    rows: items,
  };
}

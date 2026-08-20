import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DetailItem, DetailList } from "@/components/shared/detail-list";
import { PersonHeader } from "@/components/people/person-header";
import { ChildrenPanel, type ChildRow } from "@/components/children/children-panel";
import {
  PersonContributions,
  type PersonContributionGroup,
} from "@/components/people/person-contributions";
import { ActivityTimeline } from "@/components/audit/activity-timeline";
import { can, requirePermission } from "@/lib/permissions";
import { getPersonById, listAreas } from "@/services/people.service";
import { listChildren } from "@/services/children.service";
import { getPersonContributionsByEvent } from "@/services/contribution.service";
import { listEntityActivity } from "@/services/audit.service";
import { NotFoundError } from "@/lib/errors";
import { calculateAge, formatDate, formatDateTime } from "@/lib/format";
import { LABELS } from "@/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/people/[id]">): Promise<Metadata> {
  const { id } = await params;
  try {
    const person = await getPersonById(id);
    return { title: person.fullName };
  } catch {
    return { title: "Person" };
  }
}

export default async function PersonDetailPage({ params }: PageProps<"/people/[id]">) {
  const user = await requirePermission("people:read");
  const { id } = await params;

  let person;
  try {
    person = await getPersonById(id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const canReadAudit = can(user, "audit:read");

  const [children, contributions, activity, areas] = await Promise.all([
    listChildren({ parentId: id, page: 1, limit: 100, sortOrder: "desc" }),
    can(user, "contributions:read")
      ? getPersonContributionsByEvent(id)
      : Promise.resolve([]),
    canReadAudit ? listEntityActivity("Person", id, 100) : Promise.resolve([]),
    listAreas(),
  ]);

  const age = calculateAge(person.dateOfBirth);
  // Mongoose lean documents carry ObjectIds and Dates; serialize for the client.
  const plain = JSON.parse(JSON.stringify(person));

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
        <Link href="/people">
          <ArrowLeft className="size-4" />
          Back to people
        </Link>
      </Button>

      <PersonHeader
        person={plain}
        areas={areas}
        canWrite={can(user, "people:write")}
        canDelete={can(user, "people:delete")}
      />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="children">
            Children
            {children.total > 0 ? (
              <span className="tabular ml-1.5 rounded bg-muted px-1.5 text-xs">
                {children.total}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="contributions">
            Contributions
            {contributions.length > 0 ? (
              <span className="tabular ml-1.5 rounded bg-muted px-1.5 text-xs">
                {contributions.length}
              </span>
            ) : null}
          </TabsTrigger>
          {canReadAudit ? <TabsTrigger value="activity">Activity history</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="rounded-xl border bg-card p-5">
            <DetailList>
              <DetailItem label="Full name">{person.fullName}</DetailItem>
              <DetailItem label="Father / Husband">{person.fatherOrHusbandName}</DetailItem>
              <DetailItem label="Mother">{person.motherName}</DetailItem>
              <DetailItem label="Gender">{LABELS.gender[person.gender]}</DetailItem>
              <DetailItem label="Date of birth">
                {person.dateOfBirth
                  ? `${formatDate(person.dateOfBirth)}${age !== null ? ` (${age} yrs)` : ""}`
                  : null}
              </DetailItem>
              <DetailItem label="Occupation">{person.occupation}</DetailItem>

              <DetailItem label="Mobile">
                {person.mobileNumber ? (
                  <a
                    href={`tel:${person.mobileNumber}`}
                    className="tabular inline-flex items-center gap-1.5 hover:underline"
                  >
                    <Phone className="size-3.5 text-muted-foreground" aria-hidden />
                    {person.mobileNumber}
                  </a>
                ) : null}
              </DetailItem>
              <DetailItem label="Alternative mobile">
                {person.alternativeMobileNumber}
              </DetailItem>
              <DetailItem label="Email">
                {person.email ? (
                  <a
                    href={`mailto:${person.email}`}
                    className="inline-flex items-center gap-1.5 hover:underline"
                  >
                    <Mail className="size-3.5 text-muted-foreground" aria-hidden />
                    {person.email}
                  </a>
                ) : null}
              </DetailItem>

              <DetailItem label="Area">
                {person.area ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-muted-foreground" aria-hidden />
                    {person.area}
                  </span>
                ) : null}
              </DetailItem>
              <DetailItem label="Status">{LABELS.personStatus[person.status]}</DetailItem>
              <DetailItem label="Address" full>
                {person.address}
              </DetailItem>
              <DetailItem label="Notes" full>
                {person.notes ? (
                  <span className="whitespace-pre-wrap">{person.notes}</span>
                ) : null}
              </DetailItem>
            </DetailList>
          </div>

          <div className="rounded-xl border bg-muted/25 px-5 py-4 text-xs text-muted-foreground">
            Added {formatDateTime(person.createdAt)}
            {person.createdBy && typeof person.createdBy === "object" && "name" in person.createdBy
              ? ` by ${(person.createdBy as { name: string }).name}`
              : ""}
            {" · Last updated "}
            {formatDateTime(person.updatedAt)}
            {person.updatedBy && typeof person.updatedBy === "object" && "name" in person.updatedBy
              ? ` by ${(person.updatedBy as { name: string }).name}`
              : ""}
          </div>
        </TabsContent>

        <TabsContent value="children" className="space-y-4">
          <ChildrenPanel
            parentId={id}
            items={JSON.parse(JSON.stringify(children.items)) as ChildRow[]}
            canWrite={can(user, "children:write")}
            canDelete={can(user, "children:delete")}
          />
        </TabsContent>

        <TabsContent value="contributions">
          <PersonContributions
            groups={JSON.parse(JSON.stringify(contributions)) as PersonContributionGroup[]}
          />
        </TabsContent>

        {canReadAudit ? (
          <TabsContent value="activity">
            <div className="rounded-xl border bg-card p-5">
              <ActivityTimeline entries={JSON.parse(JSON.stringify(activity))} />
            </div>
          </TabsContent>
        ) : null}
      </Tabs>
    </>
  );
}

import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { UsersClient, type UserRow } from "./users-client";
import { can, requirePermission } from "@/lib/permissions";
import { listUsers } from "@/services/user.service";
import { userListQuerySchema } from "@/validations/user.schema";
import { parseSearchParams } from "@/lib/search-params";

export const metadata: Metadata = { title: "Users" };
export const dynamic = "force-dynamic";

export default async function UsersPage({ searchParams }: PageProps<"/users">) {
  const user = await requirePermission("users:read");
  const query = parseSearchParams(await searchParams, userListQuerySchema);
  const data = await listUsers(query);

  return (
    <>
      <PageHeader
        title="Users"
        description={`${data.total} administrator account${data.total === 1 ? "" : "s"}`}
      />

      <UsersClient
        data={{ ...data, items: JSON.parse(JSON.stringify(data.items)) as UserRow[] }}
        currentUserId={user.id}
        canWrite={can(user, "users:write")}
      />
    </>
  );
}

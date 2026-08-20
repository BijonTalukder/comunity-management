import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsClient } from "./settings-client";
import { requireAuth } from "@/lib/auth";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireAuth();

  return (
    <>
      <PageHeader title="Settings" description="Manage your account." />
      <SettingsClient user={user} />
    </>
  );
}

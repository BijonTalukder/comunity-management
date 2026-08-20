import { redirect } from "next/navigation";

/** The app has no marketing surface; "/" is just a gate to the dashboard. */
export default function RootPage() {
  redirect("/dashboard");
}

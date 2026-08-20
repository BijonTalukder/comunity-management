import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

export default function NotFound() {
  return (
    <div className="rounded-xl border bg-card">
      <EmptyState
        icon={FileQuestion}
        title="We couldn't find that record"
        description="It may have been deleted, or the link might be out of date."
        action={
          <Button asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        }
      />
    </div>
  );
}

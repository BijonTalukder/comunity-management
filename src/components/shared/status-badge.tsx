import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  success: "border-success/25 bg-success/12 text-success",
  warning: "border-warning/30 bg-warning/15 text-warning",
  danger: "border-destructive/25 bg-destructive/10 text-destructive",
  info: "border-primary/25 bg-primary/10 text-primary",
};

/** Maps every status enum in the app to a consistent colour tone. */
const STATUS_TONES: Record<string, Tone> = {
  ACTIVE: "success",
  INACTIVE: "neutral",
  ARCHIVED: "neutral",
  VOID: "danger",
  UPCOMING: "info",
  ONGOING: "warning",
  COMPLETED: "success",
  STUDYING: "info",
  NOT_STARTED: "neutral",
  SUPER_ADMIN: "info",
  ADMIN: "neutral",
  CREATE: "success",
  UPDATE: "info",
  DELETE: "danger",
  LOGIN: "neutral",
  LOGOUT: "neutral",
  PASSWORD_CHANGE: "warning",
  EXPORT: "warning",
};

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  const tone = STATUS_TONES[status] ?? "neutral";
  return (
    <Badge
      variant="outline"
      className={cn("font-medium whitespace-nowrap", TONE_CLASSES[tone], className)}
    >
      {label ?? status}
    </Badge>
  );
}

import type { ReactNode } from "react";

/** Consistent frame for every dashboard chart: title, optional note, body. */
export function ChartShell({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border bg-card p-5 ${className ?? ""}`}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {description ? (
            <p className="text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

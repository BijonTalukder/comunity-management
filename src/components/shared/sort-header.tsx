"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { useListParams } from "@/hooks/use-list-params";
import { cn } from "@/lib/utils";

export function SortHeader({
  field,
  children,
  className,
  align = "left",
}: {
  field: string;
  children: React.ReactNode;
  className?: string;
  align?: "left" | "right";
}) {
  const { get, setParams } = useListParams();
  const activeField = get("sortBy");
  const order = get("sortOrder", "desc");
  const isActive = activeField === field;

  const Icon = !isActive ? ChevronsUpDown : order === "asc" ? ArrowUp : ArrowDown;

  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() =>
          setParams({
            sortBy: field,
            // Re-clicking the active column flips direction; a new column
            // starts ascending, which is what people expect for names.
            sortOrder: isActive && order === "asc" ? "desc" : isActive ? "asc" : "asc",
          })
        }
        aria-label={`Sort by ${field}`}
        className={cn(
          "-mx-2 inline-flex items-center gap-1 rounded px-2 py-1 text-left transition-colors hover:text-foreground",
          isActive ? "text-foreground" : "text-muted-foreground",
          align === "right" && "flex-row-reverse",
        )}
      >
        {children}
        <Icon className="size-3.5 shrink-0" aria-hidden />
      </button>
    </TableHead>
  );
}

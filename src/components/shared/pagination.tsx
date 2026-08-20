"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useListParams } from "@/hooks/use-list-params";

export function Pagination({
  page,
  limit,
  total,
  totalPages,
}: {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}) {
  const { setParams } = useListParams();

  if (total === 0) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="tabular text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{from}</span>–
        <span className="font-medium text-foreground">{to}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span>
      </p>

      <div className="flex items-center gap-2">
        <Select
          value={String(limit)}
          onValueChange={(value) => setParams({ limit: value, page: 1 })}
        >
          <SelectTrigger size="sm" className="w-[110px]" aria-label="Rows per page">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 20, 50, 100].map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setParams({ page: page - 1 })}
        >
          <ChevronLeft className="size-4" />
          <span className="sr-only sm:not-sr-only">Previous</span>
        </Button>

        <span className="tabular px-1 text-sm text-muted-foreground">
          {page} / {totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => setParams({ page: page + 1 })}
        >
          <span className="sr-only sm:not-sr-only">Next</span>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

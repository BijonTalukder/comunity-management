"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Downloads the current view as Excel or PDF. The active filters are taken
 * from the URL, so what you see is exactly what gets exported.
 */
export function ExportMenu({
  basePath,
  searchParams,
  label = "Export",
}: {
  /** e.g. "/api/reports/people" — "/excel" and "/pdf" are appended. */
  basePath: string;
  searchParams?: Record<string, string | undefined>;
  label?: string;
}) {
  const [pending, setPending] = useState<"excel" | "pdf" | null>(null);

  const download = async (format: "excel" | "pdf") => {
    setPending(format);
    try {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(searchParams ?? {})) {
        if (value) query.set(key, value);
      }

      const response = await fetch(`${basePath}/${format}?${query.toString()}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? "Export failed");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(disposition);

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = match?.[1] ?? `report.${format === "excel" ? "xlsx" : "pdf"}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      toast.success(`${format === "excel" ? "Excel" : "PDF"} report downloaded`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setPending(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={pending !== null}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Download current view</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => download("excel")}>
          <FileSpreadsheet className="size-4" />
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => download("pdf")}>
          <FileText className="size-4" />
          PDF (.pdf)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/shared/search-input";
import { FilterSelect, optionsFromLabels } from "@/components/shared/filter-select";
import { ExportMenu } from "@/components/shared/export-menu";
import { InstitutionFormDialog } from "@/components/institutions/institution-form";
import { useListParams } from "@/hooks/use-list-params";
import { ListPendingBar } from "@/components/shared/list-pending-bar";
import { LABELS } from "@/types";

export function InstitutionsToolbar({
  canWrite,
  canExport,
}: {
  canWrite: boolean;
  canExport: boolean;
}) {
  const router = useRouter();
  const { params, reset } = useListParams();
  const [createOpen, setCreateOpen] = useState(false);

  const activeFilterCount = ["search", "type", "status", "area"].filter((key) =>
    params.get(key),
  ).length;

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput placeholder="Search institutions…" />
          <FilterSelect
            paramKey="type"
            placeholder="All types"
            options={optionsFromLabels(LABELS.institutionType)}
            className="w-[170px]"
          />
          <FilterSelect
            paramKey="status"
            placeholder="All statuses"
            options={optionsFromLabels(LABELS.institutionStatus)}
            className="w-[150px]"
          />
          {activeFilterCount > 0 ? (
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="size-3.5" />
              Reset ({activeFilterCount})
            </Button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {canExport ? (
            <ExportMenu
              basePath="/api/reports/institutions"
              searchParams={Object.fromEntries(params.entries())}
            />
          ) : null}
          {canWrite ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Add institution
            </Button>
          ) : null}
        </div>
      </div>

      <ListPendingBar />

      <InstitutionFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={() => router.refresh()}
      />
    </>
  );
}

"use client";

import { useState } from "react";
import { Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/shared/search-input";
import { FilterSelect, optionsFromLabels } from "@/components/shared/filter-select";
import { ExportMenu } from "@/components/shared/export-menu";
import { PersonFormDialog } from "@/components/people/person-form";
import { useListParams } from "@/hooks/use-list-params";
import { ListPendingBar } from "@/components/shared/list-pending-bar";
import { LABELS } from "@/types";

export function PeopleToolbar({
  areas,
  canWrite,
  canExport,
}: {
  areas: string[];
  canWrite: boolean;
  canExport: boolean;
}) {
  const { params, reset } = useListParams();
  const [createOpen, setCreateOpen] = useState(false);

  const activeFilterCount = ["search", "gender", "status", "area", "hasChildren"].filter(
    (key) => params.get(key),
  ).length;

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput placeholder="Search name, mobile, area…" />

          <FilterSelect
            paramKey="gender"
            placeholder="All genders"
            options={optionsFromLabels(LABELS.gender)}
            className="w-[140px]"
          />

          <FilterSelect
            paramKey="status"
            placeholder="All statuses"
            options={optionsFromLabels(LABELS.personStatus)}
            className="w-[150px]"
          />

          {areas.length > 0 ? (
            <FilterSelect
              paramKey="area"
              placeholder="All areas"
              options={areas.map((area) => ({ value: area, label: area }))}
              className="w-[150px]"
            />
          ) : null}

          <FilterSelect
            paramKey="hasChildren"
            placeholder="Any household"
            options={[
              { value: "true", label: "Has children" },
              { value: "false", label: "No children" },
            ]}
            className="w-[160px]"
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
              basePath="/api/reports/people"
              searchParams={Object.fromEntries(params.entries())}
            />
          ) : null}
          {canWrite ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Add person
            </Button>
          ) : null}
        </div>
      </div>

      <ListPendingBar />

      <PersonFormDialog open={createOpen} onOpenChange={setCreateOpen} areas={areas} />
    </>
  );
}

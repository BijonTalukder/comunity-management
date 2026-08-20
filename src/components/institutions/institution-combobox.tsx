"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Check, ChevronsUpDown, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  InstitutionFormDialog,
  type InstitutionSummary,
} from "@/components/institutions/institution-form";
import { api, toQueryString } from "@/lib/api-client";
import { useDebounced, useSyncedState } from "@/hooks/use-debounced";
import { LABELS, type InstitutionType } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Searchable institution picker with inline creation.
 *
 * Typing queries `/api/institutions/search`; when nothing matches, the list
 * offers `+ Add "<what you typed>"`, which opens a dialog, saves the
 * institution and selects it — all without leaving the child form. Only the
 * ObjectId is ever stored on the child record.
 */
export function InstitutionCombobox({
  value,
  onChange,
  selected,
  type,
  id = "institution",
  disabled,
}: {
  value?: string;
  onChange: (institutionId: string | undefined, institution?: InstitutionSummary) => void;
  /** Current selection, so the label shows before any search has run. */
  selected?: InstitutionSummary | null;
  type?: InstitutionType;
  id?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [current, setCurrent] = useSyncedState<InstitutionSummary | null>(selected ?? null);
  const debounced = useDebounced(search.trim());

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["institutions", "search", debounced, type],
    queryFn: () =>
      api.get<InstitutionSummary[]>(
        `/api/institutions/search${toQueryString({ q: debounced, type, limit: 10 })}`,
      ),
    enabled: open,
    staleTime: 15_000,
  });

  // Only offer creation when the typed name is not already an exact match.
  const canCreate = useMemo(() => {
    const trimmed = debounced.trim();
    if (trimmed.length < 2) return false;
    return !results.some((item) => item.name.toLowerCase() === trimmed.toLowerCase());
  }, [debounced, results]);

  const select = (institution: InstitutionSummary) => {
    setCurrent(institution);
    onChange(institution._id, institution);
    setOpen(false);
    setSearch("");
  };

  return (
    <>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={id}
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled}
              className="min-w-0 flex-1 justify-between font-normal"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Building2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className={cn("truncate", !current && "text-muted-foreground")}>
                  {current ? current.name : "Search for a school or college…"}
                </span>
              </span>
              <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Type an institution name…"
                value={search}
                onValueChange={setSearch}
              />
              <CommandList>
                {isFetching ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Searching…
                  </div>
                ) : null}

                {!isFetching && results.length === 0 && !canCreate ? (
                  <CommandEmpty>
                    {debounced.length < 2
                      ? "Type at least 2 characters to search."
                      : "No institution found."}
                  </CommandEmpty>
                ) : null}

                {results.length > 0 ? (
                  <CommandGroup heading="Institutions">
                    {results.map((institution) => (
                      <CommandItem
                        key={institution._id}
                        value={institution._id}
                        onSelect={() => select(institution)}
                      >
                        <Check
                          className={cn(
                            "size-4",
                            value === institution._id ? "opacity-100" : "opacity-0",
                          )}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{institution.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {LABELS.institutionType[institution.type as InstitutionType]}
                            {institution.area ? ` · ${institution.area}` : ""}
                            {institution.city ? `, ${institution.city}` : ""}
                          </span>
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : null}

                {canCreate ? (
                  <CommandGroup heading={results.length > 0 ? "Not the one?" : undefined}>
                    <CommandItem
                      value={`__create__${debounced}`}
                      onSelect={() => {
                        setOpen(false);
                        setCreateOpen(true);
                      }}
                      className="text-primary data-[selected=true]:text-primary"
                    >
                      <Plus className="size-4" aria-hidden />
                      Add &ldquo;{debounced}&rdquo;
                    </CommandItem>
                  </CommandGroup>
                ) : null}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {current ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Clear institution"
            disabled={disabled}
            onClick={() => {
              setCurrent(null);
              onChange(undefined);
            }}
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>

      <InstitutionFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultName={debounced}
        onSaved={(institution) => {
          // Newly created institutions are selected immediately, so the admin
          // never has to navigate away and come back.
          select(institution);
        }}
      />
    </>
  );
}

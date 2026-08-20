"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2, UserRound } from "lucide-react";
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
import { api, toQueryString } from "@/lib/api-client";
import { useDebounced, useSyncedState } from "@/hooks/use-debounced";
import type { Paginated } from "@/types";
import { cn } from "@/lib/utils";

export type PersonOption = {
  _id: string;
  fullName: string;
  mobileNumber?: string;
  area?: string;
};

/** Type-ahead person picker used when recording a contribution. */
export function PersonCombobox({
  value,
  onChange,
  selected,
  id = "person",
  disabled,
}: {
  value?: string;
  onChange: (personId: string | undefined, person?: PersonOption) => void;
  selected?: PersonOption | null;
  id?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [current, setCurrent] = useSyncedState<PersonOption | null>(selected ?? null);
  const debounced = useDebounced(search.trim());

  const { data, isFetching } = useQuery({
    queryKey: ["people", "picker", debounced],
    queryFn: () =>
      api.get<Paginated<PersonOption>>(
        `/api/people${toQueryString({ search: debounced, limit: 10, status: "ACTIVE", sortBy: "fullName", sortOrder: "asc" })}`,
      ),
    enabled: open,
    staleTime: 15_000,
  });

  const results = data?.items ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className="flex min-w-0 items-center gap-2">
            <UserRound className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className={cn("truncate", !current && "text-muted-foreground")}>
              {current ? current.fullName : "Search for a person…"}
            </span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Name or mobile number…"
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

            {!isFetching && results.length === 0 ? (
              <CommandEmpty>No matching person found.</CommandEmpty>
            ) : null}

            {results.length > 0 ? (
              <CommandGroup>
                {results.map((person) => (
                  <CommandItem
                    key={person._id}
                    value={person._id}
                    onSelect={() => {
                      setCurrent(person);
                      onChange(person._id, person);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <Check
                      className={cn("size-4", value === person._id ? "opacity-100" : "opacity-0")}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{person.fullName}</span>
                      <span className="tabular block truncate text-xs text-muted-foreground">
                        {[person.mobileNumber, person.area].filter(Boolean).join(" · ") ||
                          "No contact details"}
                      </span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

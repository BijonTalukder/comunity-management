"use client";

import { useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useListParams } from "@/hooks/use-list-params";
import { useDebounced, useSyncedState } from "@/hooks/use-debounced";

export function SearchInput({
  placeholder = "Search…",
  paramKey = "search",
}: {
  placeholder?: string;
  paramKey?: string;
}) {
  const { get, setParams } = useListParams();
  const initial = get(paramKey);
  // Mirrors the URL so an external change (e.g. Reset) refills the field.
  const [value, setValue] = useSyncedState(initial);
  // Debounced so typing does not fire a request per keystroke.
  const debounced = useDebounced(value, 350);

  useEffect(() => {
    if (debounced === initial) return;
    setParams({ [paramKey]: debounced || undefined });
  }, [debounced, initial, paramKey, setParams]);

  return (
    <div className="relative w-full sm:max-w-xs">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="pl-9 pr-9"
      />
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Clear search"
          className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
          onClick={() => setValue("")}
        >
          <X className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}

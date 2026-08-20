"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useListParams } from "@/hooks/use-list-params";

export type FilterOption = { value: string; label: string };

/**
 * A URL-backed dropdown filter. "all" is the sentinel for "no filter" because
 * Radix Select cannot hold an empty string value.
 */
export function FilterSelect({
  paramKey,
  placeholder,
  options,
  className = "w-[170px]",
}: {
  paramKey: string;
  placeholder: string;
  options: FilterOption[];
  className?: string;
}) {
  const { get, setParams } = useListParams();
  const value = get(paramKey) || "all";

  return (
    <Select value={value} onValueChange={(next) => setParams({ [paramKey]: next })}>
      <SelectTrigger className={className} aria-label={placeholder}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{placeholder}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Builds options from a label map keyed by enum value. */
export function optionsFromLabels(labels: Record<string, string>): FilterOption[] {
  return Object.entries(labels).map(([value, label]) => ({ value, label }));
}

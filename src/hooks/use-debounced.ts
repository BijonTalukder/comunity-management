"use client";

import { useEffect, useState } from "react";

/**
 * Debounces a rapidly changing value (typically a search box). The timer is an
 * effect by necessity — it schedules work outside the render — and is cleared
 * on every change so only the last value is committed.
 */
export function useDebounced<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

/**
 * Mirrors a prop into local state, re-syncing during render when the prop
 * changes. This is React's documented "adjusting state when a prop changes"
 * pattern — it avoids the extra commit an effect-based sync would cause.
 */
export function useSyncedState<T>(source: T): [T, (value: T) => void] {
  const [value, setValue] = useState(source);
  const [lastSource, setLastSource] = useState(source);

  if (source !== lastSource) {
    setLastSource(source);
    setValue(source);
  }

  return [value, setValue];
}

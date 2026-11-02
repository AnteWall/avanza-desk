import { useEffect, useState } from "react";

/** `value` once it has stopped changing for `ms` milliseconds: search as you type, not per key. */
export function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

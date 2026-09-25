import * as React from "react";

export type SortDir = "asc" | "desc";

/** Shared sort state for list pages: each click toggles asc → desc. */
export function useSort(initialKey: string, initialDir: SortDir = "asc") {
  const [state, setState] = React.useState<{ key: string; dir: SortDir }>({
    key: initialKey,
    dir: initialDir,
  });
  const onSort = React.useCallback((key: string) => {
    setState((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  }, []);
  return { ...state, onSort };
}

/** Immutable sort by a named accessor; null/undefined values always sink. */
export function compareBy<T>(
  rows: T[],
  key: string,
  dir: SortDir,
  accessors: Record<string, (row: T) => string | number | null | undefined>,
): T[] {
  const get = accessors[key];
  if (!get) return rows;
  const factor = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = get(a);
    const vb = get(b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * factor;
    return String(va).localeCompare(String(vb), undefined, { numeric: true }) * factor;
  });
}

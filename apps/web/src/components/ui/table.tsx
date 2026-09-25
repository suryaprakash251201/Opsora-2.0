import * as React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "../../lib/cn";
import { useUi } from "../../stores/ui";
import type { SortDir } from "../../lib/sort";

export type { SortDir };

export function Table({
  className,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>): React.JSX.Element {
  return (
    <div
      className="table-scroll-shell overflow-x-auto rounded-2xl border border-edge/80 bg-panel/70 shadow-sm"
      role="region"
      aria-label="Scrollable data table"
      tabIndex={0}
    >
      <table className={cn("w-full min-w-[640px] text-left text-[13px]", className)} {...props} />
    </div>
  );
}

/** Compact density tightens rows; comfortable keeps breathing room. */
function useRowPad(): string {
  const density = useUi((s) => s.density);
  return density === "compact" ? "py-1.5" : "py-2";
}

export function THead(props: React.HTMLAttributes<HTMLTableSectionElement>): React.JSX.Element {
  return (
    <thead
      className="border-b border-edge/80 bg-surface-muted/60 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3"
      {...props}
    />
  );
}

export function TRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>): React.JSX.Element {
  return (
    <tr
      className={cn(
        "border-b border-edge/60 last:border-0 transition-colors hover:bg-hover/60",
        className,
      )}
      {...props}
    />
  );
}

export interface THProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  /** Renders a sort control; pair with `useSort` + `compareBy`. */
  sortable?: boolean;
  active?: boolean;
  dir?: SortDir;
  onSort?: () => void;
}

export function TH({
  sortable,
  active,
  dir,
  onSort,
  className,
  children,
  ...props
}: THProps): React.JSX.Element {
  const pad = useRowPad();
  const base = cn("px-3 font-medium", pad, className);

  if (!sortable) {
    return (
      <th scope="col" className={base} {...props}>
        {children}
      </th>
    );
  }

  const SortIcon = active ? (dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th
      className={base}
      scope="col"
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      {...props}
    >
      <button
        type="button"
        onClick={onSort}
        className={cn(
          "group inline-flex items-center gap-1 rounded transition-colors hover:text-ink",
          active && "text-accent-strong",
        )}
        title={`Sort by ${typeof children === "string" ? children : "column"}`}
      >
        {children}
        <SortIcon
          className={cn(
            "size-3 shrink-0 transition-opacity",
            active ? "opacity-100" : "opacity-0 group-hover:opacity-60",
          )}
          aria-hidden
        />
      </button>
    </th>
  );
}

export function TD({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>): React.JSX.Element {
  const pad = useRowPad();
  return <td className={cn("px-3 text-ink-2", pad, className)} {...props} />;
}

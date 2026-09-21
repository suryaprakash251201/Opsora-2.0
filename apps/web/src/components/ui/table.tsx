import * as React from "react";
import { cn } from "../../lib/cn";

export function Table({
  className,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>): React.JSX.Element {
  return (
    <div className="overflow-x-auto rounded-lg border border-edge bg-panel">
      <table className={cn("w-full min-w-[640px] text-left text-[13px]", className)} {...props} />
    </div>
  );
}

export function THead(props: React.HTMLAttributes<HTMLTableSectionElement>): React.JSX.Element {
  return (
    <thead
      className="border-b border-edge bg-hover/60 text-[11px] uppercase tracking-wide text-ink-3"
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
      className={cn("border-b border-edge/60 last:border-0 hover:bg-hover/60", className)}
      {...props}
    />
  );
}

export function TH({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>): React.JSX.Element {
  return <th className={cn("px-3 py-2 font-medium", className)} {...props} />;
}

export function TD({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>): React.JSX.Element {
  return <td className={cn("px-3 py-2 text-ink-2", className)} {...props} />;
}

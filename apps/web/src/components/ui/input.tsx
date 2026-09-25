import * as React from "react";
import { cn } from "../../lib/cn";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>): React.JSX.Element {
  return (
    <input
      className={cn(
        "h-9 w-full rounded-lg border border-edge/80 bg-surface-muted/70 px-3 text-[13px] text-ink shadow-xs transition-colors placeholder:text-ink-3 hover:border-ink-3/50 focus:border-accent/70 focus:bg-surface",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  children,
  htmlFor,
}: {
  label: string;
  children: React.ReactNode;
  htmlFor?: string;
}): React.JSX.Element {
  return (
    <label
      htmlFor={htmlFor}
      className="grid gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3"
    >
      {label}
      {children}
    </label>
  );
}

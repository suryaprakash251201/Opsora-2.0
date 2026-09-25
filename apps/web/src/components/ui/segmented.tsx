import * as React from "react";
import { cn } from "../../lib/cn";

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
  count?: React.ReactNode;
}

/** A compact, keyboard-friendly control for mutually exclusive filters. */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
  size = "md",
}: {
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
  size?: "sm" | "md";
}): React.JSX.Element {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-xl border border-edge/80 bg-surface-muted/70 p-1",
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-semibold transition-all duration-150",
              size === "sm" ? "h-7 px-2.5 text-[11px]" : "h-8 px-3 text-xs",
              selected
                ? "bg-panel text-ink shadow-sm ring-1 ring-accent/20"
                : "text-ink-3 hover:bg-hover hover:text-ink",
            )}
          >
            <span>{option.label}</span>
            {option.count != null ? (
              <span
                className={cn("num text-[10px]", selected ? "text-accent-strong" : "text-ink-3")}
              >
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

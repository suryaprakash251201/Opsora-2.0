import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";

/** Native select with the same surface, height, and focus language as Input. */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <span className="relative block">
      <select
        ref={ref}
        className={cn(
          "h-9 w-full appearance-none rounded-lg border border-edge/80 bg-surface-muted/70 px-3 pr-9 text-[13px] text-ink shadow-xs transition-colors hover:border-ink-3/50 focus:border-accent/70 focus:bg-surface",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-3"
        aria-hidden
      />
    </span>
  );
});

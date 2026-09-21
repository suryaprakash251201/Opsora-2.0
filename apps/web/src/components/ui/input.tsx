import * as React from "react";
import { cn } from "../../lib/cn";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>): React.JSX.Element {
  return (
    <input
      className={cn(
        "h-8 w-full rounded-md border border-edge bg-void px-2.5 text-[13px] text-ink placeholder:text-ink-3 focus:border-sky-400/50 focus:outline-none",
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
    <label htmlFor={htmlFor} className="grid gap-1.5 text-xs font-medium text-ink-2">
      {label}
      {children}
    </label>
  );
}

import * as React from "react";
import { cn } from "../../lib/cn";
import { useUi } from "../../stores/ui";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "interactive" | "glass" | "accent" | "feature";
}

export function Card({
  className,
  variant = "default",
  onClick,
  ...props
}: CardProps): React.JSX.Element {
  const variantStyles = {
    default:
      "border-edge/80 bg-panel/95 shadow-sm transition-[border-color,box-shadow,background-color] duration-200 hover:border-accent/25 hover:shadow-md",
    interactive:
      "card-shell-interactive border-edge/80 bg-panel/95 shadow-sm transition-[border-color,box-shadow,transform,background-color] duration-200 cursor-pointer hover:-translate-y-0.5 hover:border-accent/45 hover:shadow-lg active:translate-y-0 active:scale-[0.995]",
    glass: "border-edge/70 bg-panel/75 shadow-sm backdrop-blur-xl",
    accent: "border-accent/30 bg-panel/95 shadow-sm shadow-accent/5",
    feature:
      "border-accent/25 bg-gradient-to-br from-panel via-panel to-accent/[0.06] shadow-lg shadow-accent/5",
  };

  return (
    <div
      // Clickable cards must behave like buttons for keyboard users.
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
              }
            }
          : undefined
      }
      data-interactive={onClick ? "true" : undefined}
      className={cn(
        "card-shell group/card relative isolate overflow-hidden rounded-2xl border",
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={cn("flex items-center justify-between gap-3 px-5 pt-4 pb-3", className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>): React.JSX.Element {
  return (
    <h3
      className={cn(
        "flex items-center gap-2 text-sm font-semibold tracking-tight text-ink",
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>): React.JSX.Element {
  return <p className={cn("text-[13px] leading-relaxed text-ink-3", className)} {...props} />;
}

export function CardAction({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return <div className={cn("flex shrink-0 items-center gap-1.5", className)} {...props} />;
}

export function CardBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  // Compact density tightens card padding along with table rows.
  const density = useUi((s) => s.density);
  return (
    <div className={cn(density === "compact" ? "px-3 pb-3" : "px-4 pb-4", className)} {...props} />
  );
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-b-2xl border-t border-edge/60 bg-panel-2/45 px-5 py-3 text-xs text-ink-3",
        className,
      )}
      {...props}
    />
  );
}

export function CardBadge({
  children,
  tone = "default",
  className,
}: {
  children: React.ReactNode;
  tone?: "default" | "ok" | "warn" | "crit" | "accent" | "normal";
  className?: string;
}): React.JSX.Element {
  const tones: Record<string, string> = {
    default: "bg-void border-edge text-ink-2",
    normal: "bg-void border-edge text-ink-2",
    ok: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    warn: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
    crit: "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
    accent: "bg-accent/10 border-accent/25 text-accent-strong",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

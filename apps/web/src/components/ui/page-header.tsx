import type * as React from "react";

/**
 * The one true page header — every route renders its title the same way so
 * rhythm and hierarchy stay consistent across the app.
 */
export interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  /** Right-aligned controls (filters, refresh, primary actions). */
  actions?: React.ReactNode;
  /** Status chip rendered next to the title. */
  badge?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  actions,
  badge,
}: PageHeaderProps): React.JSX.Element {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-edge/70 pb-5">
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-3">
          <span className="h-px w-5 bg-accent" aria-hidden />
          Opsora / Control plane
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-[-0.025em] text-ink sm:text-[1.75rem]">
            {title}
          </h1>
          {badge}
        </div>
        {description ? (
          <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-ink-2">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>
      ) : null}
    </header>
  );
}

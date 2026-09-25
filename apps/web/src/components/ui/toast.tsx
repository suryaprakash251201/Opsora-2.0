import * as React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useUi, type ToastItem, type ToastType } from "../../stores/ui";
import { cn } from "../../lib/cn";

/** Errors stay longer — they usually need a decision. */
const DURATION_MS: Record<ToastType, number> = {
  error: 6500,
  warning: 5500,
  success: 4000,
  info: 4000,
};

const EXIT_MS = 180;

/**
 * Toast viewport: owns the full lifecycle (auto-dismiss timers, hover-to-pause,
 * exit animation) so the store stays presentation-free.
 */
export function ToastContainer(): React.JSX.Element | null {
  const toasts = useUi((s) => s.toasts);
  const removeToast = useUi((s) => s.removeToast);
  const [closing, setClosing] = React.useState<ReadonlySet<string>>(new Set());
  const timers = React.useRef(new Map<string, number>());

  const clearTimer = React.useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t !== undefined) {
      window.clearTimeout(t);
      timers.current.delete(id);
    }
  }, []);

  /** Two-phase dismissal: animate out, then remove from the store. */
  const dismiss = React.useCallback(
    (id: string) => {
      clearTimer(id);
      setClosing((prev) => new Set(prev).add(id));
      window.setTimeout(() => {
        removeToast(id);
        setClosing((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, EXIT_MS);
    },
    [clearTimer, removeToast],
  );

  // Schedule auto-dismiss for freshly added toasts; prune timers for gone ones.
  React.useEffect(() => {
    const live = new Set(toasts.map((t) => t.id));
    for (const [id, t] of timers.current) {
      if (!live.has(id)) {
        window.clearTimeout(t);
        timers.current.delete(id);
      }
    }
    for (const t of toasts) {
      if (!timers.current.has(t.id) && !closing.has(t.id)) {
        timers.current.set(
          t.id,
          window.setTimeout(() => dismiss(t.id), DURATION_MS[t.type]),
        );
      }
    }
  }, [toasts, closing, dismiss]);

  // Never leak timers on unmount.
  React.useEffect(() => {
    const map = timers.current;
    return () => {
      for (const t of map.values()) window.clearTimeout(t);
      map.clear();
    };
  }, []);

  if (toasts.length === 0) return null;

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />,
    warning: <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />,
    error: <AlertCircle className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />,
    info: <Info className="size-4 shrink-0 text-sky-600 dark:text-sky-400" />,
  };

  const borders: Record<ToastType, string> = {
    success: "border-emerald-500/30 bg-panel/95 shadow-emerald-500/10",
    warning: "border-amber-500/30 bg-panel/95 shadow-amber-500/10",
    error: "border-rose-500/30 bg-panel/95 shadow-rose-500/10",
    info: "border-sky-500/30 bg-panel/95 shadow-sky-500/10",
  };

  /** Hover pauses the dismiss timer; leaving restarts it. */
  const pause = (t: ToastItem): void => clearTimer(t.id);
  const resume = (t: ToastItem): void => {
    if (closing.has(t.id) || timers.current.has(t.id)) return;
    timers.current.set(
      t.id,
      window.setTimeout(() => dismiss(t.id), DURATION_MS[t.type]),
    );
  };

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-3 z-50 flex max-w-[calc(100vw-1.5rem)] flex-col gap-2 sm:right-4 sm:max-w-sm"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.type === "error" ? "alert" : "status"}
          onMouseEnter={() => pause(t)}
          onMouseLeave={() => resume(t)}
          className={cn(
            "pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 shadow-xl backdrop-blur-md",
            closing.has(t.id) ? "toast-out" : "toast-in",
            borders[t.type],
          )}
        >
          <div className="mt-0.5">{icons[t.type]}</div>
          <div className="min-w-0 flex-1">
            {t.title ? (
              <h4 className="text-[13px] font-semibold tracking-tight text-ink">{t.title}</h4>
            ) : null}
            {t.message ? <p className="mt-0.5 text-xs text-ink-2">{t.message}</p> : null}
          </div>
          <button
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss notification"
            className="rounded p-1 text-ink-3 transition-colors hover:bg-hover hover:text-ink"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

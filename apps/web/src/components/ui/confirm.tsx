import { Dialog as BaseDialog } from "@base-ui-components/react/dialog";
import { TriangleAlert } from "lucide-react";
import * as React from "react";
import { Button } from "./button";
import { cn } from "../../lib/cn";

/** Accessible confirm dialog — required for destructive actions ( §40 ). */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  onConfirm,
  pending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  pending?: boolean;
}): React.JSX.Element {
  return (
    <BaseDialog.Root open={open} onOpenChange={(v) => onOpenChange(v)}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-50 bg-black/70" />
        <BaseDialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-edge bg-panel p-5 shadow-2xl">
          <div className="flex items-start gap-3">
            <span className="rounded-md bg-red-500/10 p-2 text-red-300">
              <TriangleAlert className="size-4" aria-hidden />
            </span>
            <div className="grid gap-1">
              <BaseDialog.Title className="text-sm font-semibold text-ink">
                {title}
              </BaseDialog.Title>
              <BaseDialog.Description className="text-xs leading-relaxed text-ink-2">
                {description}
              </BaseDialog.Description>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <BaseDialog.Close
              className={cn(
                "inline-flex h-8 items-center rounded-md border border-white/10 bg-white/5 px-3 text-[13px] font-medium text-zinc-200 hover:bg-white/10",
              )}
            >
              Cancel
            </BaseDialog.Close>
            <Button variant="danger" disabled={pending} onClick={() => void onConfirm()}>
              {pending ? "Working…" : confirmLabel}
            </Button>
          </div>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}

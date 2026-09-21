import type * as React from "react";
import { Dialog as BaseDialog } from "@base-ui-components/react/dialog";
import { useNavigate } from "react-router";
import { useUi } from "../../stores/ui";

const commands = [
  { label: "Go to Home", run: "/" },
  { label: "View Docker containers", run: "/docker" },
  { label: "Show critical alerts", run: "/alerts" },
  { label: "Open network dashboard", run: "/network" },
  { label: "Search devices", run: "/devices" },
  { label: "View services", run: "/services" },
  { label: "Open storage", run: "/storage" },
  { label: "Open DNS / Pi-hole", run: "/dns" },
  { label: "Open integrations", run: "/integrations" },
  { label: "Open settings", run: "/settings" },
];

/** Command palette — predefined safe operations only, never shell exec ( §30 ). */
export function CommandPalette(): React.JSX.Element {
  const open = useUi((s) => s.paletteOpen);
  const setOpen = useUi((s) => s.setPaletteOpen);
  const nav = useNavigate();

  return (
    <BaseDialog.Root open={open} onOpenChange={(v) => setOpen(v)}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-50 bg-black/70" />
        <BaseDialog.Popup className="fixed left-1/2 top-[12vh] z-50 w-[min(480px,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-edge bg-panel p-2 shadow-2xl">
          <BaseDialog.Title className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
            Commands
          </BaseDialog.Title>
          <div className="grid gap-0.5" role="menu">
            {commands.map((c) => (
              <button
                key={c.label}
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  nav(c.run);
                }}
                className="rounded-md px-2 py-1.5 text-left text-[13px] text-ink-2 hover:bg-hover hover:text-ink"
              >
                {c.label}
              </button>
            ))}
          </div>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}

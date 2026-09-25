import * as React from "react";
import { Dialog as BaseDialog } from "@base-ui-components/react/dialog";
import { useNavigate } from "react-router";
import { Keyboard, X } from "lucide-react";
import { useUi } from "../../stores/ui";

export function ShortcutsModal(): React.JSX.Element {
  const open = useUi((s) => s.shortcutsOpen);
  const setOpen = useUi((s) => s.setShortcutsOpen);
  const theme = useUi((s) => s.theme);
  const setTheme = useUi((s) => s.setTheme);
  const nav = useNavigate();

  const shortcutGroups = [
    {
      name: "Global Navigation",
      items: [
        { keys: ["G", "H"], label: "Go to Overview / Home", action: () => nav("/") },
        { keys: ["G", "S"], label: "Go to Servers", action: () => nav("/servers") },
        { keys: ["G", "D"], label: "Go to Docker Containers", action: () => nav("/docker") },
        { keys: ["G", "V"], label: "Go to Services & Uptime", action: () => nav("/services") },
        { keys: ["G", "A"], label: "Go to Alert Center", action: () => nav("/alerts") },
        { keys: ["G", "N"], label: "Go to Network Topology", action: () => nav("/network") },
        { keys: ["G", "T"], label: "Go to Storage", action: () => nav("/storage") },
        { keys: ["G", "O"], label: "Go to Settings", action: () => nav("/settings") },
      ],
    },
    {
      name: "Shortcuts & Actions",
      items: [
        { keys: ["Ctrl", "K"], label: "Global Search" },
        { keys: ["R"], label: "Refresh Overview metrics" },
        { keys: ["T"], label: "Toggle Dark / Light Theme", action: () => setTheme(theme === "dark" ? "light" : "dark") },
        { keys: ["?"], label: "Show Keyboard Shortcuts" },
        { keys: ["Esc"], label: "Close active dialog or menu" },
      ],
    },
  ];

  return (
    <BaseDialog.Root open={open} onOpenChange={(v) => setOpen(v)}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="backdrop-in fixed inset-0 z-50 bg-black/75 backdrop-blur-sm transition-opacity" />
        <BaseDialog.Popup className="dialog-drop-in fixed left-1/2 top-[12vh] z-50 w-[min(540px,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-edge bg-panel p-5 shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-edge">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-accent/15 text-accent-strong">
                <Keyboard className="size-4" />
              </span>
              <BaseDialog.Title className="text-sm font-semibold tracking-tight text-ink">
                Keyboard Shortcuts
              </BaseDialog.Title>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-ink-3 hover:bg-hover hover:text-ink transition-colors"
              aria-label="Close shortcuts dialog"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-4 max-h-[60vh] space-y-5 overflow-y-auto pr-1">
            {shortcutGroups.map((group) => (
              <div key={group.name} className="space-y-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                  {group.name}
                </h4>
                <div className="divide-y divide-edge/40 rounded-xl border border-edge/60 bg-void/50">
                  {group.items.map((item) => {
                    const inner = (
                      <>
                        <span className="text-ink-2">{item.label}</span>
                        <div className="flex items-center gap-1">
                          {item.keys.map((k) => (
                            <kbd
                              key={k}
                              className="rounded border border-edge bg-panel px-1.5 py-0.5 font-mono text-[11px] font-medium text-ink shadow-xs"
                            >
                              {k}
                            </kbd>
                          ))}
                        </div>
                      </>
                    );
                    // Actionable rows are real buttons so they work for keyboard users.
                    return item.action ? (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          item.action?.();
                        }}
                        className="flex w-full items-center justify-between px-3.5 py-2 text-left text-xs transition-colors hover:bg-hover cursor-pointer"
                      >
                        {inner}
                      </button>
                    ) : (
                      <div
                        key={item.label}
                        className="flex items-center justify-between px-3.5 py-2 text-xs"
                      >
                        {inner}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-edge pt-3 text-center text-xs text-ink-3">
            Press <kbd className="rounded border border-edge bg-void px-1 py-0.5 text-[10px]">?</kbd> anywhere to open this cheat sheet.
          </div>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}

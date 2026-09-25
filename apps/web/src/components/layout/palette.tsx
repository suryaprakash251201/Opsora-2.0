import * as React from "react";
import { Dialog as BaseDialog } from "@base-ui-components/react/dialog";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useUi } from "../../stores/ui";
import { cn } from "../../lib/cn";

interface Cmd {
  label: string;
  group: string;
  hint?: string;
  run: string | (() => void);
}

/** Command palette — predefined safe operations only, never shell exec ( §30 ). */
function buildCommands(theme: "dark" | "light", refresh: () => void): Cmd[] {
  return [
    { label: "Go to Overview", group: "Navigate", run: "/" },
    { label: "View Docker containers", group: "Navigate", run: "/docker" },
    { label: "Show alerts", group: "Navigate", run: "/alerts" },
    { label: "Open network dashboard", group: "Navigate", run: "/network" },
    { label: "View servers & nodes", group: "Navigate", run: "/servers" },
    { label: "Search devices", group: "Navigate", run: "/devices" },
    { label: "View services", group: "Navigate", run: "/services" },
    { label: "Open uptime monitor", group: "Navigate", run: "/uptime" },
    { label: "Open storage", group: "Navigate", run: "/storage" },
    { label: "Open DNS / Pi-hole", group: "Navigate", run: "/dns" },
    { label: "Open integrations", group: "Navigate", run: "/integrations" },
    { label: "Open activity log", group: "Navigate", run: "/activity" },
    { label: "Open settings", group: "Navigate", run: "/settings" },
    { label: "Open API reference", group: "Navigate", run: "/api" },
    {
      label: `Switch to ${theme === "dark" ? "light" : "dark"} theme`,
      group: "Actions",
      hint: "T",
      run: () => useUi.getState().setTheme(theme === "dark" ? "light" : "dark"),
    },
    { label: "Refresh dashboard data", group: "Actions", hint: "R", run: refresh },
    {
      label: "Show keyboard shortcuts",
      group: "Help",
      hint: "?",
      run: () => useUi.getState().setShortcutsOpen(true),
    },
  ];
}

/** Real palette UX: type to filter, ↑/↓ to move, ↵ to run. */
export function CommandPalette(): React.JSX.Element {
  const open = useUi((s) => s.paletteOpen);
  const setOpen = useUi((s) => s.setPaletteOpen);
  const theme = useUi((s) => s.theme);
  const nav = useNavigate();
  const qc = useQueryClient();
  const [q, setQ] = React.useState("");
  const [index, setIndex] = React.useState(0);

  const commands = React.useMemo(
    () => buildCommands(theme, () => void qc.invalidateQueries()),
    [theme, qc],
  );

  const needle = q.trim().toLowerCase();
  const filtered = React.useMemo(
    () => (needle ? commands.filter((c) => c.label.toLowerCase().includes(needle)) : commands),
    [commands, needle],
  );

  React.useEffect(() => {
    if (open) {
      setQ("");
      setIndex(0);
    }
  }, [open]);

  React.useEffect(() => {
    if (index >= filtered.length) setIndex(0);
  }, [filtered.length, index]);

  // Keep the highlighted row visible when the list scrolls.
  React.useEffect(() => {
    if (!open || filtered.length === 0) return;
    document.getElementById(`opsora-cmd-${index}`)?.scrollIntoView({ block: "nearest" });
  }, [index, open, filtered.length]);

  const runCmd = React.useCallback(
    (c: Cmd | undefined) => {
      if (!c) return;
      setOpen(false);
      if (typeof c.run === "string") nav(c.run);
      else c.run();
    },
    [nav, setOpen],
  );

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => (filtered.length === 0 ? 0 : (i + 1) % filtered.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => (filtered.length === 0 ? 0 : (i - 1 + filtered.length) % filtered.length));
    } else if (e.key === "Home") {
      e.preventDefault();
      setIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setIndex(Math.max(0, filtered.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      runCmd(filtered[index]);
    }
  };

  // Group labels only when nothing is typed (keeps filtered results flat).
  const showGroups = needle.length === 0;
  let lastGroup: string | null = showGroups ? "" : null;

  return (
    <BaseDialog.Root open={open} onOpenChange={(v) => setOpen(v)}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="backdrop-in fixed inset-0 z-50 bg-black/70" />
        <BaseDialog.Popup
          className="dialog-drop-in fixed left-1/2 top-[12vh] z-50 w-[min(520px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-edge/80 bg-panel shadow-2xl"
          onKeyDown={onKeyDown}
        >
          <BaseDialog.Title className="sr-only">Command palette</BaseDialog.Title>
          <BaseDialog.Description className="sr-only">
            Navigate Opsora or run a safe dashboard action.
          </BaseDialog.Description>
          <div className="flex items-center gap-2 border-b border-edge px-3 py-2.5">
            <span className="grid size-6 place-items-center rounded-md bg-accent/15 text-accent-strong">
              <CommandIcon />
            </span>
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Type a command or page name…"
              aria-label="Command"
              role="combobox"
              aria-expanded="true"
              aria-controls="opsora-cmd-list"
              aria-activedescendant={filtered[index] ? `opsora-cmd-${index}` : undefined}
              className="h-6 w-full bg-transparent text-[13px] text-ink placeholder:text-ink-3"
            />
            <kbd className="rounded border border-edge bg-void px-1.5 py-0.5 text-[10px] text-ink-3">
              esc
            </kbd>
          </div>

          <div
            id="opsora-cmd-list"
            role="listbox"
            aria-label="Commands"
            className="max-h-[50vh] overflow-y-auto p-1.5"
          >
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-ink-3">No commands match “{q}”.</p>
            ) : (
              filtered.map((c, i) => {
                const header = showGroups && c.group !== lastGroup ? (lastGroup = c.group) : null;
                const active = i === index;
                return (
                  <React.Fragment key={c.label}>
                    {header ? (
                      <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-ink-3">
                        {header}
                      </p>
                    ) : null}
                    <button
                      id={`opsora-cmd-${i}`}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onMouseEnter={() => setIndex(i)}
                      onClick={() => runCmd(c)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors",
                        active ? "bg-accent/12 text-ink" : "text-ink-2",
                      )}
                    >
                      <span className="truncate">{c.label}</span>
                      {c.hint ? (
                        <kbd className="ml-auto rounded border border-edge bg-void px-1.5 text-[10px] text-ink-3">
                          {c.hint}
                        </kbd>
                      ) : null}
                      {active && !c.hint ? (
                        <span className="ml-auto text-[10px] text-ink-3">↵</span>
                      ) : null}
                    </button>
                  </React.Fragment>
                );
              })
            )}
          </div>

          <div className="flex items-center gap-3 border-t border-edge bg-panel-2/50 px-3 py-1.5 text-[10px] text-ink-3">
            <span>
              <Kbd>↑</Kbd> <Kbd>↓</Kbd> navigate
            </span>
            <span>
              <Kbd>↵</Kbd> run
            </span>
            <span>
              <Kbd>esc</Kbd> close
            </span>
            <span className="ml-auto">{filtered.length} commands</span>
          </div>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}

function Kbd({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <kbd className="rounded border border-edge bg-void px-1 text-[9px] text-ink-2">{children}</kbd>
  );
}

function CommandIcon(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="size-3.5"
      aria-hidden
    >
      <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
    </svg>
  );
}

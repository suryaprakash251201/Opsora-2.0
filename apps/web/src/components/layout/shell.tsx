import * as React from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUp, Bell, Home, Network, Server, Settings, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";
import { useUi } from "../../stores/ui";
import { CommandPalette } from "./palette";
import { SearchDialog } from "./search";
import { Sidebar } from "./sidebar";
import { TopBar } from "./topbar";
import { ToastContainer } from "../ui/toast";
import { ShortcutsModal } from "../ui/shortcuts-modal";

export function AppShell({ updatedAt }: { updatedAt?: string }): React.JSX.Element {
  const open = useUi((s) => s.sidebarOpen);
  const collapsed = useUi((s) => s.sidebarCollapsed);
  const mobileNavOpen = useUi((s) => s.mobileNavOpen);
  const setMobileNavOpen = useUi((s) => s.setMobileNavOpen);
  const toggleSidebar = useUi((s) => s.toggleSidebar);
  const nav = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();

  const mainRef = React.useRef<HTMLElement | null>(null);
  const drawerRef = React.useRef<HTMLElement | null>(null);
  const drawerReturnFocus = React.useRef<HTMLElement | null>(null);
  const [showBackToTop, setShowBackToTop] = React.useState(false);

  const isMobile = (): boolean =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;

  /** Hamburger: desktop toggles the rail, mobile opens the drawer. */
  const handleMenu = React.useCallback(() => {
    if (isMobile()) setMobileNavOpen(!useUi.getState().mobileNavOpen);
    else toggleSidebar();
  }, [setMobileNavOpen, toggleSidebar]);

  // Close the mobile drawer whenever the route changes…
  React.useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname, setMobileNavOpen]);

  // …and Escape closes it too.
  React.useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNavOpen, setMobileNavOpen]);

  // Drawer focus management: move focus in on open, hand it back on close.
  React.useEffect(() => {
    if (mobileNavOpen) {
      drawerReturnFocus.current = document.activeElement as HTMLElement | null;
      drawerRef.current?.focus();
    } else if (drawerReturnFocus.current) {
      drawerReturnFocus.current.focus();
      drawerReturnFocus.current = null;
    }
  }, [mobileNavOpen]);

  // New page = top of page (the scroll container is <main>, not window).
  React.useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
    setShowBackToTop(false);
  }, [location.pathname]);

  React.useEffect(() => {
    let pendingG = false;
    let pendingGTimeout: NodeJS.Timeout | null = null;

    const onKey = (e: KeyboardEvent): void => {
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      const isInput =
        activeTag === "input" ||
        activeTag === "textarea" ||
        activeTag === "select" ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        useUi.getState().setSearchOpen(true);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        useUi.getState().setPaletteOpen(true);
        return;
      }

      if (isInput) return;

      if (e.key === "?") {
        e.preventDefault();
        useUi.getState().setShortcutsOpen(true);
        return;
      }

      if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        void qc.invalidateQueries();
        useUi.getState().addToast({
          title: "Refreshed",
          message: "Synced with live backend.",
          type: "info",
        });
        return;
      }

      if (e.key.toLowerCase() === "t") {
        e.preventDefault();
        const curTheme = useUi.getState().theme;
        useUi.getState().setTheme(curTheme === "dark" ? "light" : "dark");
        return;
      }

      // Two-stroke navigation: press 'g' then another key
      if (e.key.toLowerCase() === "g" && !pendingG) {
        pendingG = true;
        pendingGTimeout = setTimeout(() => {
          pendingG = false;
        }, 1200);
        return;
      }

      if (pendingG) {
        pendingG = false;
        if (pendingGTimeout) clearTimeout(pendingGTimeout);
        const k = e.key.toLowerCase();
        if (k === "h") nav("/");
        else if (k === "s") nav("/servers");
        else if (k === "d") nav("/docker");
        else if (k === "v") nav("/services");
        else if (k === "a") nav("/alerts");
        else if (k === "n") nav("/network");
        else if (k === "t") nav("/storage");
        else if (k === "o") nav("/settings");
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (pendingGTimeout) clearTimeout(pendingGTimeout);
    };
  }, [nav, qc]);

  const backToTop = (): void => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    mainRef.current?.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-void text-ink selection:bg-accent/30 selection:text-ink">
      {/* Skip link — first tab stop, jumps past nav to the scrollable content. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-lg focus:border focus:border-accent/60 focus:bg-panel focus:px-3.5 focus:py-2 focus:text-[13px] focus:font-medium focus:text-ink focus:shadow-lg"
      >
        Skip to main content
      </a>
      <TopBar updatedAt={updatedAt} onMenu={handleMenu} />
      <div className="flex min-h-0 flex-1 gap-3 p-3 pt-3 md:p-4">
        {open ? (
          <aside
            className={cn(
              "hidden shrink-0 flex-col overflow-hidden rounded-3xl border border-edge/80 bg-panel/90 shadow-sm backdrop-blur-xl transition-all duration-300 md:flex",
              collapsed ? "w-[76px]" : "w-[264px]",
            )}
          >
            <Sidebar />
          </aside>
        ) : null}
        <main
          ref={mainRef}
          onScroll={(e) => setShowBackToTop(e.currentTarget.scrollTop > 480)}
          className="app-canvas min-w-0 flex-1 overflow-y-auto rounded-3xl border border-edge/70 shadow-sm focus:outline-none"
          id="main"
          tabIndex={-1}
        >
          {/* Keyed wrapper = subtle enter animation on every navigation */}
          <div key={location.pathname} className="page-enter page-surface">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile drawer (the desktop rail above is hidden < md) */}
      {mobileNavOpen ? (
        <>
          <div
            className="backdrop-in fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] md:hidden"
            aria-hidden
            onClick={() => setMobileNavOpen(false)}
          />
          <aside
            ref={drawerRef}
            tabIndex={-1}
            aria-label="Navigation menu"
            role="dialog"
            aria-modal="true"
            onKeyDown={(e) => {
              if (e.key !== "Tab") return;
              const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
                "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])",
              );
              if (!focusable || focusable.length === 0) return;
              const first = focusable[0];
              const last = focusable[focusable.length - 1];
              if (!first || !last) return;
              if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
              }
            }}
            className="drawer-in fixed bottom-[4.5rem] left-3 top-[4.5rem] z-50 w-[min(19rem,calc(100vw-1.5rem))] overflow-hidden rounded-3xl border border-edge/80 bg-panel shadow-2xl focus:outline-none md:hidden"
          >
            <Sidebar mobile />
          </aside>
        </>
      ) : null}

      {/* Back to top — appears on long pages */}
      {showBackToTop ? (
        <button
          onClick={backToTop}
          aria-label="Back to top"
          title="Back to top"
          className="fixed bottom-20 right-4 z-30 grid size-10 place-items-center rounded-full border border-edge/80 bg-panel/90 text-ink-2 shadow-xl backdrop-blur-xl transition-all duration-150 hover:border-accent/40 hover:text-ink active:scale-95 md:bottom-6"
        >
          <ArrowUp className="size-4" />
        </button>
      ) : null}

      {/* Mobile bottom nav */}
      <nav
        aria-label="Primary (mobile)"
        className="flex shrink-0 items-stretch justify-around border-t border-edge/80 bg-panel/95 px-2 pb-[calc(0.375rem+env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-10px_30px_-24px_rgb(0_0_0/0.6)] backdrop-blur-xl md:hidden"
      >
        <MobileLink to="/" label="Home" icon={Home} />
        <MobileLink to="/servers" label="Hosts" icon={Server} />
        <MobileLink to="/network" label="Network" icon={Network} />
        <MobileLink to="/alerts" label="Alerts" icon={Bell} />
        <MobileLink to="/settings" label="Settings" icon={Settings} />
      </nav>
      <SearchDialog />
      <CommandPalette />
      <ShortcutsModal />
      <ToastContainer />
    </div>
  );
}

/** Mobile bottom-nav link: icon tile + label with a clear active state. */
function MobileLink({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: LucideIcon;
}): React.JSX.Element {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      aria-label={label}
      className={({ isActive }) =>
        cn(
          "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1 text-[10px] font-medium transition-colors",
          isActive ? "text-accent-strong" : "text-ink-3 hover:text-ink",
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              "grid size-8 place-items-center rounded-xl transition-colors",
              isActive && "bg-accent/15",
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
          {label}
        </>
      )}
    </NavLink>
  );
}

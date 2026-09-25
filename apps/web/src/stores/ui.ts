import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AccentName = "sky" | "emerald" | "violet" | "amber" | "rose";

export const accents: { name: AccentName; swatch: string; label: string }[] = [
  { name: "sky", swatch: "#38bdf8", label: "Sky" },
  { name: "emerald", swatch: "#34d399", label: "Emerald" },
  { name: "violet", swatch: "#a78bfa", label: "Violet" },
  { name: "amber", swatch: "#fbbf24", label: "Amber" },
  { name: "rose", swatch: "#fb7185", label: "Rose" },
];

export type ToastType = "info" | "success" | "warning" | "error";

export interface ToastItem {
  id: string;
  title?: string;
  message?: string;
  type: ToastType;
}

interface UiState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  paletteOpen: boolean;
  searchOpen: boolean;
  shortcutsOpen: boolean;
  theme: "dark" | "light";
  accent: AccentName;
  range: string;
  autoRefresh: number; // 0 (off), 10, 30, 60 seconds
  serverView: "grid" | "list";
  density: "comfortable" | "compact";
  toasts: ToastItem[];
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  setMobileNavOpen: (v: boolean) => void;
  setPaletteOpen: (v: boolean) => void;
  setSearchOpen: (v: boolean) => void;
  setShortcutsOpen: (v: boolean) => void;
  setTheme: (t: "dark" | "light") => void;
  setAccent: (a: AccentName) => void;
  setRange: (r: string) => void;
  setAutoRefresh: (s: number) => void;
  setServerView: (v: "grid" | "list") => void;
  setDensity: (d: "comfortable" | "compact") => void;
  addToast: (t: Omit<ToastItem, "id">) => void;
  removeToast: (id: string) => void;
}

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      sidebarCollapsed: false,
      mobileNavOpen: false,
      paletteOpen: false,
      searchOpen: false,
      shortcutsOpen: false,
      theme: "dark",
      accent: "sky",
      range: "1h",
      autoRefresh: 30,
      serverView: "grid",
      density: "comfortable",
      toasts: [],
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      setMobileNavOpen: (v) => set({ mobileNavOpen: v }),
      setPaletteOpen: (v) => set({ paletteOpen: v }),
      setSearchOpen: (v) => set({ searchOpen: v }),
      setShortcutsOpen: (v) => set({ shortcutsOpen: v }),
      setTheme: (theme) => set({ theme }),
      setAccent: (accent) => set({ accent }),
      setRange: (range) => set({ range }),
      setAutoRefresh: (autoRefresh) => set({ autoRefresh }),
      setServerView: (serverView) => set({ serverView }),
      setDensity: (density) => set({ density }),
      addToast: (t) => {
        const id = Math.random().toString(36).slice(2, 9);
        // Auto-dismiss + exit animation are owned by <ToastContainer/> so
        // toasts can animate out before removal. Keep the stack shallow.
        set((s) => ({ toasts: [...s.toasts, { ...t, id }].slice(-5) }));
      },
      removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((item) => item.id !== id) })),
    }),
    {
      name: "opsora-ui",
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
        accent: state.accent,
        range: state.range,
        autoRefresh: state.autoRefresh,
        serverView: state.serverView,
        density: state.density,
      }),
    },
  ),
);

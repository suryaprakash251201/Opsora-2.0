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

interface UiState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  paletteOpen: boolean;
  searchOpen: boolean;
  theme: "dark" | "light";
  accent: AccentName;
  range: string;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  setPaletteOpen: (v: boolean) => void;
  setSearchOpen: (v: boolean) => void;
  setTheme: (t: "dark" | "light") => void;
  setAccent: (a: AccentName) => void;
  setRange: (r: string) => void;
}

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      sidebarCollapsed: false,
      paletteOpen: false,
      searchOpen: false,
      theme: "dark",
      accent: "sky",
      range: "1h",
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      setPaletteOpen: (v) => set({ paletteOpen: v }),
      setSearchOpen: (v) => set({ searchOpen: v }),
      setTheme: (theme) => set({ theme }),
      setAccent: (accent) => set({ accent }),
      setRange: (range) => set({ range }),
    }),
    { name: "opsora-ui" },
  ),
);

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UiState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  paletteOpen: boolean;
  searchOpen: boolean;
  theme: "dark" | "light";
  range: string;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  setPaletteOpen: (v: boolean) => void;
  setSearchOpen: (v: boolean) => void;
  setTheme: (t: "dark" | "light") => void;
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
      range: "1h",
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      setPaletteOpen: (v) => set({ paletteOpen: v }),
      setSearchOpen: (v) => set({ searchOpen: v }),
      setTheme: (theme) => set({ theme }),
      setRange: (range) => set({ range }),
    }),
    { name: "opsora-ui" },
  ),
);

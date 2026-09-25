import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DeviceFilter, NetworkView, NodePosition } from "./types";

interface NetworkUiState {
  selectedDeviceId: string | null;
  selectedConnectionId: string | null;
  view: NetworkView;
  filter: DeviceFilter;
  query: string;
  eventsOpen: boolean;
  animationsPaused: boolean;
  positions: Record<string, NodePosition>;
  selectDevice: (id: string | null) => void;
  selectConnection: (id: string | null) => void;
  setView: (v: NetworkView) => void;
  setFilter: (f: DeviceFilter) => void;
  setQuery: (q: string) => void;
  setEventsOpen: (v: boolean) => void;
  toggleAnimations: () => void;
  setPosition: (id: string, pos: NodePosition) => void;
  resetPositions: () => void;
}

/** Client/UI state only — server topology lives in TanStack Query. */
export const useNetworkUi = create<NetworkUiState>()(
  persist(
    (set) => ({
      selectedDeviceId: null,
      selectedConnectionId: null,
      view: "topology",
      filter: "all",
      query: "",
      eventsOpen: true,
      animationsPaused: false,
      positions: {},
      selectDevice: (id) => set({ selectedDeviceId: id, selectedConnectionId: null }),
      selectConnection: (id) => set({ selectedConnectionId: id, selectedDeviceId: null }),
      setView: (view) => set({ view }),
      setFilter: (filter) => set({ filter }),
      setQuery: (query) => set({ query }),
      setEventsOpen: (eventsOpen) => set({ eventsOpen }),
      toggleAnimations: () => set((s) => ({ animationsPaused: !s.animationsPaused })),
      setPosition: (id, pos) =>
        set((s) => ({ positions: { ...s.positions, [id]: pos } })),
      resetPositions: () => set({ positions: {} }),
    }),
    {
      name: "opsora-network-ui",
      partialize: (s) => ({
        selectedDeviceId: s.selectedDeviceId,
        selectedConnectionId: s.selectedConnectionId,
        view: s.view,
        filter: s.filter,
        query: s.query,
        eventsOpen: s.eventsOpen,
        animationsPaused: s.animationsPaused,
        positions: s.positions,
      }),
    },
  ),
);

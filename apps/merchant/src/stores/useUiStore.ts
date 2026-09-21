"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
interface UiState {
  theme: "light" | "dark";
  sidebarOpen: boolean;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  closeSidebar: () => void;
}
// Persist presentation only. Never persist auth tokens or API response caches.
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: "light",
      sidebarOpen: false,
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === "light" ? "dark" : "light" })),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      closeSidebar: () => set({ sidebarOpen: false }),
    }),
    {
      name: "eyn-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ theme: s.theme }),
      skipHydration: true,
    },
  ),
);

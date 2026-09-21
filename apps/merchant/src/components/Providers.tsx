"use client";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { useUiStore } from "../stores/useUiStore";
export function Providers({ children }: { children: React.ReactNode }) {
  const theme = useUiStore((s) => s.theme);
  useEffect(() => {
    void useUiStore.persist.rehydrate();
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "var(--panel)",
            color: "var(--ink)",
            border: "1px solid var(--line)",
            borderRadius: 12,
          },
        }}
      />
    </>
  );
}

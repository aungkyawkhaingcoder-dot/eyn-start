"use client";
import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";
import EYNFill from "./EYNFill";
export function EynLoader({ label = "Signing in" }: { label?: string }) {
  const overlay = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    overlay.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return typeof document === "undefined" ? null : createPortal(
    <div ref={overlay} tabIndex={-1} className="eyn-auth-transition" role="status" aria-live="polite" aria-label={label}
      onKeyDown={(event) => { if (event.key === "Tab") event.preventDefault(); }}>
      <EYNFill size={160} />
    </div>, document.body,
  );
}

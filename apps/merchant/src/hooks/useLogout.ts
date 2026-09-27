"use client";
import { useRef, useTransition } from "react";
import { clearCache } from "ahooks";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { storeApi } from "../services/storeApi";
export function useLogout() {
  const router = useRouter();
  const locked = useRef(false);
  const [isPending, startTransition] = useTransition();
  function logout() {
    if (locked.current || isPending) return;
    locked.current = true;
    startTransition(async () => {
      try {
        await storeApi.logout();
        clearCache();
        toast.success("Signed out");
        startTransition(() => router.replace("/login"));
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to sign out. Try again.",
        );
      } finally {
        locked.current = false;
      }
    });
  }
  return { isPending, logout };
}

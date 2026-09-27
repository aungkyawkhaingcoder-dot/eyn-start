import toast from "react-hot-toast";
import { clearCache } from "ahooks";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRequest } from "ahooks";
import { createAuthApi } from "../services/authApi";
import { useRequestHistory } from "./useRequestHistory";
import type { ApiData, Notice, Session } from "../types/auth";
export function useWorkbench(onSignedIn: () => void) {
  const history = useRequestHistory();
  const auth = createAuthApi(history.call);
  const [notice, setNotice] = useState<Notice>(null);
  const [session, setSession] = useState<Session>(null);
  const running = useRef(false);
  const [isPending, startTransition] = useTransition();
  const [activeAction, setActiveAction] = useState<
    "credentials" | "resend" | "google" | null
  >(null);
  useEffect(() => {
    // A back/forward-cache return must not retain the Google redirect spinner.
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) {
        running.current = false;
        setActiveAction(null);
      }
    };
    window.addEventListener("pageshow", restore);
    return () => window.removeEventListener("pageshow", restore);
  }, []);
  // Manual useRequest prevents registration/login requests on mount or focus.
  const action = useRequest(
    async (operation: () => Promise<unknown>) => operation(),
    {
      manual: true,
      onBefore: () => setNotice(null),
      onError: (error) => {
        toast.error(error.message);
        setNotice({ error: true, text: error.message });
      },
    },
  );
  function run(
    operation: () => Promise<unknown>,
    source: "credentials" | "resend" | "google" = "credentials",
    keepPending = false,
  ) {
    if (running.current || isPending) return;
    running.current = true;
    setActiveAction(source);
    startTransition(async () => {
      let completed = false;
      try {
        await action.runAsync(operation);
        completed = true;
      } catch {
        /* useRequest.onError owns the visible error. */
      } finally {
        if (!completed || !keepPending) {
          running.current = false;
          startTransition(() => setActiveAction(null));
        }
      }
    });
  }
  function signedIn(data: ApiData) {
    clearCache();
    toast.success("Welcome to EYN");
    startTransition(() => onSignedIn());
    setSession({
      id: data.id ?? data.userId,
      at: new Date().toLocaleTimeString(),
    });
    setNotice({ text: data.message || "Signed in successfully." });
  }
  return {
    auth,
    ...history,
    notice,
    setNotice,
    session,
    setSession,
    signedIn,
    run,
    activeAction,
    isPending,
    busy: isPending || activeAction !== null,
  };
}
export type Workbench = ReturnType<typeof useWorkbench>;

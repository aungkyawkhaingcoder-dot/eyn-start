import { useRef, useState } from "react";
import { useRequest } from "ahooks";
import { createAuthApi } from "../services/authApi";
import { useRequestHistory } from "./useRequestHistory";
import type { ApiData, Notice, Session } from "../types/auth";
export function useWorkbench() {
  const history = useRequestHistory();
  const auth = createAuthApi(history.call);
  const [notice, setNotice] = useState<Notice>(null);
  const [session, setSession] = useState<Session>(null);
  const running = useRef(false);
  // Manual useRequest prevents registration/login requests on mount or focus.
  const action = useRequest(
    async (operation: () => Promise<unknown>) => operation(),
    {
      manual: true,
      onBefore: () => setNotice(null),
      onError: (error) => setNotice({ error: true, text: error.message }),
    },
  );
  async function run(operation: () => Promise<unknown>) {
    if (running.current) return;
    running.current = true;
    try {
      await action.runAsync(operation);
    } catch {
      /* useRequest.onError owns the visible error. */
    } finally {
      running.current = false;
    }
  }
  function signedIn(data: ApiData) {
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
    busy: action.loading,
  };
}
export type Workbench = ReturnType<typeof useWorkbench>;

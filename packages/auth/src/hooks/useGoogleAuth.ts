import { api } from "../lib/axios";
import type { Workbench } from "./useWorkbench";

export function useGoogleAuth({ run, busy, activeAction }: Workbench) {
  function startGoogle() {
    run(async () => {
      const { data } = await api.post<{ authorizationUrl: string }>("/api/v1/google/redirect/start", {});
      const destination = new URL(data.authorizationUrl);
      if (destination.origin !== "https://accounts.google.com" || destination.pathname !== "/o/oauth2/v2/auth") {
        throw new Error("Google sign-in could not start. Try again.");
      }
      window.location.assign(destination.href);
    }, "google", true);
  }
  return { busy: activeAction === "google", disabled: busy, startGoogle };
}

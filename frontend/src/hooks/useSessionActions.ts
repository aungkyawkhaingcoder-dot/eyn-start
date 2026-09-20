import type { ApiData } from "../types/auth";
import type { Workbench } from "./useWorkbench";
export function useSessionActions({
  auth,
  setSession,
  setNotice,
  run,
}: Workbench) {
  async function checkSession(parallel = false) {
    const check = async () => {
      try {
        const data = await auth.session();
        setSession({
          id: data.currentUserId,
          at: new Date().toLocaleTimeString(),
        });
        return data;
      } catch (caught) {
        const error = caught as Error & {
          status?: number | string;
          data?: ApiData;
        };
        if (error.status === 401) setSession(null);
        throw error;
      }
    };
    if (parallel) {
      const results = await Promise.allSettled([check(), check(), check()]);
      const passed = results.filter(
        (result) => result.status === "fulfilled",
      ).length;
      setNotice({
        error: passed < 3,
        text: `${passed}/3 concurrent requests succeeded. See the request history.`,
      });
    } else {
      await check();
      setNotice({
        text: "Protected request succeeded. Your browser session is valid.",
      });
    }
  }

  return {
    check: (parallel = false) => run(() => checkSession(parallel)),
    logout: () =>
      run(async () => {
        await auth.logout();
        setSession(null);
        setNotice({ text: "Signed out. Session cookies cleared." });
      }),
    health: () =>
      run(async () => {
        await auth.health();
        setNotice({
          text: "API is reachable. Health check does not check DB or Redis.",
        });
      }),
  };
}

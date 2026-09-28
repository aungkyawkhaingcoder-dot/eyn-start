"use client";

import { createContext, useContext, useEffect, useId } from "react";
import { clearCache } from "ahooks";
import { useRouter } from "next/navigation";
import { api } from "../lib/axios";

const CacheContext = createContext<string | null>(null);

// Cache scope belongs to this workspace visit, not to a fetched user profile.
export function MerchantCache({ children }: { children: React.ReactNode }) {
  const scope = useId();
  const router = useRouter();
  useEffect(() => {
    // Protected store requests remain the authority for authentication.
    const interceptor = api.interceptors.response.use(undefined, (error) => {
      if (error.status === 401) {
        clearCache();
        router.replace("/login");
      }
      return Promise.reject(error);
    });
    return () => {
      api.interceptors.response.eject(interceptor);
      clearCache();
    };
  }, [router, scope]);
  return <CacheContext.Provider value={scope}>{children}</CacheContext.Provider>;
}

export function useMerchantCacheScope() {
  const scope = useContext(CacheContext);
  if (scope === null) throw new Error("MerchantCache is required");
  return scope;
}

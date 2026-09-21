"use client";
import { useRequest, clearCache } from "ahooks";
import { useRef } from "react";
import toast from "react-hot-toast";
import { storeApi } from "../services/storeApi";
export function useStores(userId: number) {
  return useRequest(storeApi.list, {
    cacheKey: `stores:${userId}`,
    staleTime: 15000,
    cacheTime: 60000,
  });
}
export function useStore(id: number, userId: number) {
  return useRequest(() => storeApi.get(id), {
    cacheKey: `store:${userId}:${id}`,
    refreshDeps: [id],
    staleTime: 15000,
    cacheTime: 60000,
  });
}
export function useProducts(id: number, userId: number) {
  return useRequest(() => storeApi.products(id), {
    cacheKey: `products:${userId}:${id}`,
    refreshDeps: [id],
    staleTime: 15000,
    cacheTime: 60000,
  });
}
// Mutation promises show one toast lifecycle; reject to keep forms open on errors.
export function useSaveAction() {
  const locked = useRef(false);
  const { loading, runAsync } = useRequest(
    async (work: () => Promise<unknown>, message: string) => {
      return toast.promise(work(), {
        loading: "Saving changes",
        success: message,
        error: (error: Error) => error.message,
      });
    },
    { manual: true },
  );
  async function save(
    work: () => Promise<unknown>,
    message: string,
    success: () => void,
  ) {
    if (locked.current) return;
    locked.current = true;
    try {
      await runAsync(work, message);
      clearCache();
      success();
    } catch {
      /* toast.promise displays the error */
    } finally {
      locked.current = false;
    }
  }
  return { loading, save };
}

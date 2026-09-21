import { useState } from "react";
import { request } from "../lib/axios";
import { redact } from "../lib/redact";
import type { ApiData, RequestLog } from "../types/auth";
export function useRequestHistory() {
  const [logs, setLogs] = useState<RequestLog[]>([]);
  async function call(
    path: string,
    body?: Record<string, string>,
    method?: string,
  ) {
    const start = performance.now();
    try {
      const result = await request(path, body, method);
      record(result.status, result.data);
      return result.data;
    } catch (caught) {
      const error = caught as Error & {
        status?: number | string;
        data?: ApiData;
      };
      record(error.status || "ERROR", error.data || { message: error.message });
      throw error;
    }
    function record(status: number | string, data: unknown) {
      setLogs((old) =>
        [
          {
            id: crypto.randomUUID(),
            path,
            method: method || "POST",
            status,
            time: new Date().toLocaleTimeString(),
            ms: Math.round(performance.now() - start),
            data: redact(data),
          },
          ...old,
        ].slice(0, 20),
      );
    }
  }

  return { call, logs, clearLogs: () => setLogs([]) };
}

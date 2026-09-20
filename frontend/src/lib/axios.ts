import axios from "axios";
import type { ApiData } from "../types/auth";
export const API_URL = (
  import.meta.env?.VITE_API_URL || "http://localhost:8080"
).replace(/\/$/, "");
export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 30000,
});
// Normalize errors once. Browser refresh remains server-side; never retry mutations here.
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);
    const data = error.response?.data as ApiData | undefined;
    const message =
      data?.message ||
      (error.response
        ? "Request failed"
        : "No response. Check the API server, connection and CORS. The request may have reached the server; it was not retried.");
    return Promise.reject(
      Object.assign(new Error(message), {
        status: error.response?.status || "NETWORK",
        data,
      }),
    );
  },
);
export async function request(
  path: string,
  body?: Record<string, string>,
  method = "POST",
) {
  return api.request<ApiData>({ url: path, method, data: body });
}

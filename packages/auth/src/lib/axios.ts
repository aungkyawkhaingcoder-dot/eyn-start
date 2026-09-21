import axios from "axios";
import type { ApiData } from "../types/auth";
export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
).replace(/\/$/, "");
export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 30000,
});
api.interceptors.response.use(
  (r) => r,
  (error) =>
    Promise.reject(
      Object.assign(
        new Error(
          error.response?.data?.message ||
            "Unable to connect. Check your connection and try again.",
        ),
        { status: error.response?.status, data: error.response?.data },
      ),
    ),
);
export const request = (
  path: string,
  body?: Record<string, string>,
  method = "POST",
) => api.request<ApiData>({ url: path, data: body, method });

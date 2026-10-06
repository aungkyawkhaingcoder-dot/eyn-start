import axios from "axios";
const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/$/, "");
import type { CheckoutInput, OrderReceipt, Storefront } from "@eyn/contracts/store";
// Public reads stay anonymous. Checkout includes any existing API session so
// the server can prevent owner purchases; no credentials still means guest checkout.
const client = axios.create({
  baseURL: API_URL,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});
client.interceptors.response.use(
  (r) => r,
  (error) =>
    Promise.reject(
      Object.assign(
        new Error(
          error.response?.data?.message ||
            "Connection interrupted. Please retry.",
        ),
        { status: error.response?.status, code: error.response?.data?.error },
      ),
    ),
);
export const storefrontApi = {
  get: async (slug: string) =>
    (
      await client.get<Storefront>(
        `/api/v1/storefront/${encodeURIComponent(slug)}`,
      )
    ).data,
  checkout: async (slug: string, data: CheckoutInput, key: string) =>
    (
      await client.post<OrderReceipt>(
        `/api/v1/storefront/${encodeURIComponent(slug)}/orders`,
        data,
        { withCredentials: true, headers: { "Idempotency-Key": key } },
      )
    ).data,
};

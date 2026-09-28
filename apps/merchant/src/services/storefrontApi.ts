import axios from "axios";
import { API_URL } from "../lib/axios";
import type { CheckoutInput, OrderReceipt, Storefront } from "../types/store";
// Guest checkout has no dependency on a merchant session or token refresh.
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
        { status: error.response?.status },
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
        { headers: { "Idempotency-Key": key } },
      )
    ).data,
};

import { api } from "../lib/axios";
import type {
  Store,
  Product,
  StoreDraft,
  ProductDraft,
  Storefront,
  StoreOrder,
} from "../types/store";
export const storeApi = {
  orders: async (id: number, page: number) =>
    (
      await api.get<StoreOrder[]>(`/api/v1/stores/${id}/orders`, {
        params: { page },
      })
    ).data,
  orderStatus: async (storeId: number, id: number, status: string) =>
    (await api.patch(`/api/v1/stores/${storeId}/orders/${id}`, { status }))
      .data,
  me: async () =>
    (await api.get<{ currentUserId: number }>("/api/v1/admin/user")).data,
  list: async () => (await api.get<Store[]>("/api/v1/stores")).data,
  get: async (id: number) =>
    (await api.get<Store>(`/api/v1/stores/${id}`)).data,
  create: async (data: StoreDraft) =>
    (await api.post<Store>("/api/v1/stores", data)).data,
  update: async (id: number, data: StoreDraft) =>
    (await api.put<Store>(`/api/v1/stores/${id}`, data)).data,
  products: async (id: number) =>
    (await api.get<Product[]>(`/api/v1/stores/${id}/products`)).data,
  saveProduct: async (storeId: number, data: ProductDraft, id?: number) =>
    (
      await api.request<Product>({
        url: `/api/v1/stores/${storeId}/products${id ? `/${id}` : ""}`,
        method: id ? "PUT" : "POST",
        data: { ...data, tags: data.tags?.filter(Boolean) },
      })
    ).data,
  deleteProduct: async (storeId: number, id: number) =>
    api.delete(`/api/v1/stores/${storeId}/products/${id}`),
  storefront: async (slug: string) =>
    (
      await api.get<Storefront>(
        `/api/v1/storefront/${encodeURIComponent(slug)}`,
      )
    ).data,
  logout: () => api.post("/api/v1/logout", {}),
};

export interface Store {
  id: number;
  name: string;
  slug: string;
  description: string;
  currency: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { products: number };
}
export interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  inventory: number;
  imageUrl: string;
  published: boolean;
}
export type StoreDraft = Pick<
  Store,
  "name" | "slug" | "description" | "currency" | "published"
>;
export type ProductDraft = Omit<Product, "id">;
export type Storefront = Pick<
  Store,
  "id" | "name" | "slug" | "description" | "currency"
> & { products: Product[] };

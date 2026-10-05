export type StorefrontConfig = Partial<
  Record<
    | "themeHue"
    | "themeChroma"
    | "themeLightness"
    | "themeBase"
    | "designStyle"
    | "fontFamily"
    | "radius"
    | "formRadius"
    | "heroTitle"
    | "heroText"
    | "buttonLabel"
    | "collectionTitle"
    | "featuredTitle"
    | "bestTitle"
    | "aboutTitle"
    | "aboutText"
    | "background"
    | "surface"
    | "text"
    | "muted"
    | "primary"
    | "buttonText"
    | "accent",
    string
  >
> &
  Partial<
    Record<"themeVibrant" | "showHero" | "showFeatured" | "showBest" | "showAbout", boolean>
  >;
export interface Store {
  storefrontConfig?: StorefrontConfig;
  id: number;
  name: string;
  slug: string;
  description: string;
  currency: string;
  published: boolean;
  logoUrl?: string;
  coverUrl?: string;
  theme?: "eyn-light" | "eyn-dark";
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
  category?: { id: number; name: string } | null;
  taggables?: { tag: { name: string } }[];
}
export type StoreDraft = Pick<
  Store,
  | "name"
  | "slug"
  | "description"
  | "currency"
  | "published"
  | "logoUrl"
  | "coverUrl"
  | "theme"
  | "storefrontConfig"
>;
export type ProductDraft = Omit<Product, "id" | "category" | "taggables"> & {
  categoryName?: string;
  tags?: string[];
};
export type Storefront = Pick<
  Store,
  | "id"
  | "name"
  | "slug"
  | "description"
  | "currency"
  | "logoUrl"
  | "coverUrl"
  | "theme"
  | "storefrontConfig"
> & { products: Product[]; bestSellerIds: number[] };
export type CheckoutInput = {
  customerName: string;
  phone: string;
  address: string;
  notes: string;
  items: { productId: number; quantity: number }[];
};
export type OrderReceipt = {
  code: string;
  status: string;
  currency: string;
  totalPrice: string;
  createdAt: string;
};
export type StoreOrder = OrderReceipt & {
  id: number;
  customerName: string;
  phone: string;
  address: string;
  notes: string;
  products: {
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: string;
  }[];
};

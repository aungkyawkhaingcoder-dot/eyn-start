"use client";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";
import { Button } from "@heroui/react";
import { Search, X, ShoppingBag } from "lucide-react";
import type { Product, Storefront } from "../../types/store";
import { CartProvider, money } from "./CartProvider";
import { CartPanel } from "./CartPanel";
import { ProductCard, ProductImage, AddToCart } from "./ProductCard";
import "./storefront.css";
import { EditableCopy, type CopyKey } from "./EditableCopy";
import { backgroundEffect } from "./backgrounds";
import { designStyle } from "./styles";
import { themeStyle } from "./design";
import { loadStorefrontFont } from "./fonts";

function Collection({
  title,
  subtitle,
  products,
  currency,
  open,
}: {
  title: ReactNode;
  subtitle: string;
  products: Product[];
  currency: string;
  open: (p: Product) => void;
}) {
  if (!products.length) return null;
  return (
    <section className="sf-section">
      <div className="sf-section-title">
        <div>
          <span className="sf-overline">{subtitle}</span>
          <h2>{title}</h2>
        </div>
        <span>{products.length} products</span>
      </div>
      <div className="sf-grid">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} currency={currency} open={open} />
        ))}
      </div>
    </section>
  );
}
function ProductDetail({
  product,
  currency,
  close,
}: {
  product: Product;
  currency: string;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="sf-dialog sf-product-dialog"
      onClose={close}
    >
      <div className="sf-dialog-heading">
        <span>Product details</span>
        <Button
          isIconOnly
          variant="ghost"
          aria-label="Close product details"
          onPress={close}
        >
          <X size={20} />
        </Button>
      </div>
      <div className="sf-detail-layout">
        <div className="sf-product-image">
          <ProductImage product={product} />
        </div>
        <div>
          <span className="sf-overline">
            {product.category?.name || "The collection"}
          </span>
          <h2>{product.name}</h2>
          <strong>{money(product.price, currency)}</strong>
          <p className="sf-description">
            {product.description ||
              "Contact the store for more product details."}
          </p>
          <p>
            {product.inventory
              ? `${product.inventory} available`
              : "Currently sold out"}
          </p>
          <AddToCart product={product} />
        </div>
      </div>
    </dialog>
  );
}
export function StorefrontView({
  store,
  preview = false,
}: {
  store: Storefront;
  preview?: boolean;
}) {
  const config = store.storefrontConfig || {};
  const fontRoot = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (fontRoot.current)
      loadStorefrontFont(fontRoot.current.ownerDocument, config.fontFamily);
  }, [config.fontFamily]);
  const [failedCover, setFailedCover] = useState<string | null>(null);
  const [failedLogo, setFailedLogo] = useState<string | null>(null);
  const hasCover = !!store.coverUrl && failedCover !== store.coverUrl;
  const copy = (name: CopyKey, fallback: string) => (
    <EditableCopy name={name} value={config[name]} fallback={fallback} />
  );
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState(""),
    [selected, select] = useState<Product | null>(null);
  const categories = [
    ...new Set(
      store.products
        .map((p) => p.category?.name)
        .filter((name): name is string => !!name),
    ),
  ];
  const filtered = store.products.filter(
    (p) =>
      (!category || p.category?.name === category) &&
      `${p.name} ${p.description} ${(p.taggables || []).map((t) => t.tag.name).join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const best = (store.bestSellerIds || []).flatMap((id) =>
    store.products.filter((p) => p.id === id),
  );
  const featured = store.products.filter((p) =>
    p.taggables?.some((t) => t.tag.name === "featured"),
  );
  const spotlight =
    featured[0] ||
    best[0] ||
    store.products.find((product) => product.inventory > 0) ||
    store.products[0];
  return (
    <CartProvider store={store} preview={preview}>
      <div
        ref={fontRoot}
        className="sf"
        data-background={backgroundEffect(config.backgroundEffect)}
        data-design={designStyle(config.designStyle)}
        data-store-theme={store.theme || "eyn-light"}
        style={themeStyle(config, store.theme === "eyn-dark") as CSSProperties}
      >
        <div className="sf-announcement">{store.name}</div>
        <header className="sf-header">
          <Link className="sf-store-brand" href={`/shop/${store.slug}`}>
            {store.logoUrl && failedLogo !== store.logoUrl ? (
              <img
                src={store.logoUrl}
                onError={() => setFailedLogo(store.logoUrl || "")}
                alt={store.name}
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="sf-monogram">{store.name.slice(0, 1)}</span>
            )}
            <span>{store.name}</span>
          </Link>
          <nav aria-label="Store navigation">
            <a href="#collection">Shop the collection</a>
          </nav>
          {!preview && <CartPanel store={store} />}
        </header>
        <main className="sf-main">
          <section
            className={`sf-hero ${hasCover ? "sf-hero-image" : "sf-hero-placeholder"} ${!hasCover && spotlight ? "sf-hero-with-product" : ""}`}
          >
            <div className="sf-hero-copy">
              <span className="sf-overline">
                WELCOME TO {store.name.toUpperCase()}
              </span>
              <h1>{copy("heroTitle", "Find your next favourite.")}</h1>
              <p>
                {copy(
                  "heroText",
                  store.description ||
                    "Explore the collection. Find the details you love, all in one place.",
                )}
              </p>
              <a className="sf-shop-link" href="#collection">
                {copy("buttonLabel", "Explore products")}
              </a>
            </div>
            {hasCover ? (
              <img
                className="sf-cover"
                src={store.coverUrl}
                onError={() => setFailedCover(store.coverUrl || "")}
                alt={`${store.name} collection`}
                referrerPolicy="no-referrer"
              />
            ) : spotlight ? (
              <button
                className="sf-spotlight"
                data-image={Boolean(spotlight.imageUrl)}
                onClick={() => select(spotlight)}
                aria-label={`Discover ${spotlight.name}`}
              >
                <span className="sf-spotlight-top">
                  <span>{spotlight.category?.name || "IN THE SPOTLIGHT"}</span>
                  <span>Discover</span>
                </span>
                <span className="sf-spotlight-image">
                  <ProductImage product={spotlight} />
                </span>
                <span className="sf-spotlight-caption">
                  <strong>{spotlight.name}</strong>
                  <span>{money(spotlight.price, store.currency)}</span>
                </span>
              </button>
            ) : null}
          </section>
          <Collection
            title={copy("bestTitle", "Best sellers")}
            subtitle="BEST SELLERS"
            products={best}
            currency={store.currency}
            open={select}
          />
          <Collection
            title={copy("featuredTitle", "Featured products")}
            subtitle="HANDPICKED FOR YOU"
            products={featured}
            currency={store.currency}
            open={select}
          />
          <section id="collection" className="sf-section">
            <div className="sf-section-title">
              <div>
                <span className="sf-overline">FIND YOUR FAVOURITES</span>
                <h2>{copy("collectionTitle", "Our products")}</h2>
              </div>
              <span>{filtered.length} products</span>
            </div>
            {store.products.length > 0 && (
              <div className="sf-filters">
                <label className="sf-search">
                  <Search size={18} />
                  <input
                    type="search"
                    aria-label="Search products"
                    placeholder="Search the collection"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <div className="sf-categories" aria-label="Product categories">
                  <Button
                    variant={category === "" ? "primary" : "ghost"}
                    onPress={() => setCategory("")}
                    aria-pressed={category === ""}
                  >
                    All products
                  </Button>
                  {categories.map((name) => (
                    <Button
                      key={name}
                      variant={category === name ? "primary" : "ghost"}
                      onPress={() => setCategory(name)}
                      aria-pressed={category === name}
                    >
                      {name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <div className="sf-grid">
              {filtered.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  currency={store.currency}
                  open={select}
                />
              ))}
            </div>
            {!filtered.length && (
              <div className="sf-empty">
                <ShoppingBag size={40} />
                <h3>
                  {store.products.length
                    ? "Nothing matches just yet."
                    : "Something good is coming."}
                </h3>
                <p>
                  {store.products.length
                    ? "Try another search or category."
                    : "Come back soon to explore our collection."}
                </p>
                {store.products.length > 0 && (
                  <Button
                    variant="secondary"
                    onPress={() => {
                      setQuery("");
                      setCategory("");
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            )}
          </section>
          <section className="sf-about">
            <span className="sf-overline">A NOTE FROM THE STORE</span>
            <h2>{copy("aboutTitle", `About ${store.name}`)}</h2>
            <p>
              {copy(
                "aboutText",
                store.description ||
                  `Welcome to ${store.name}. Thank you for supporting our store.`,
              )}
            </p>
          </section>
        </main>
        <footer className="sf-footer">
          <strong>{store.name}</strong>
          <span>
            © {new Date().getFullYear()} {store.name}
          </span>
          <Link href="/">Powered by EYN</Link>
        </footer>
        {selected && (
          <ProductDetail
            product={
              store.products.find((p) => p.id === selected.id) || selected
            }
            currency={store.currency}
            close={() => select(null)}
          />
        )}
      </div>
    </CartProvider>
  );
}

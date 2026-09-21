"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Chip, Spinner, Switch } from "@heroui/react";
import {
  Save,
  X,
  Plus,
  ArrowUpRight,
  Package,
  Search,
  Pencil,
  Trash2,
} from "lucide-react";
import { useStore, useProducts, useSaveAction } from "../hooks/useStores";
import { storeApi } from "../services/storeApi";
import { StoreEditor } from "./StoreEditor";
import { Field } from "./Fields";
import { Loading, Failure } from "./Feedback";
import type { Product, ProductDraft, Store } from "../types/store";
export function StoreWorkspace({
  id,
  userId,
  view,
}: {
  id: number;
  userId: number;
  view: "overview" | "products" | "settings";
}) {
  const store = useStore(id, userId);
  const products = useProducts(id, userId);
  if ((store.loading && !store.data) || (products.loading && !products.data))
    return <Loading />;
  if (store.error) return <Failure error={store.error} retry={store.refresh} />;
  if (products.error)
    return <Failure error={products.error} retry={products.refresh} />;
  if (!store.data) return null;
  const s = store.data;
  const items = products.data || [];
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {s.name} / {view}
          </span>
          <h1>
            {view === "overview"
              ? "Make it yours."
              : view === "products"
                ? "Your collection."
                : "Store settings."}
          </h1>
          <p>
            {view === "products"
              ? "Thoughtfully chosen. Beautifully presented."
              : "Everything you need to build what comes next."}
          </p>
        </div>
        {s.published ? (
          <Link
            className="button button--secondary"
            href={`/shop/${s.slug}`}
            target="_blank"
          >
            View storefront <ArrowUpRight size={16} />
          </Link>
        ) : (
          <Chip>Draft storefront</Chip>
        )}
      </div>
      {view === "settings" ? (
        <StoreEditor key={s.updatedAt} store={s} onSaved={store.refresh} />
      ) : view === "products" ? (
        <ProductManager
          store={s}
          items={items}
          refresh={() => {
            products.refresh();
            store.refresh();
          }}
        />
      ) : (
        <>
          <div className="overview-banner">
            <div>
              <Chip color={s.published ? "success" : "default"}>
                {s.published ? "Live" : "Getting ready"}
              </Chip>
              <h2>{s.name}</h2>
              <p>
                {s.description ||
                  "A new story is taking shape. Add your description and start building your collection."}
              </p>
              <Link
                href={`/stores/${id}/settings`}
                className="button button--secondary"
              >
                Customize store <ArrowUpRight size={16} />
              </Link>
            </div>
            <span className="store-monogram">{s.name[0]}</span>
          </div>
          <div className="stats">
            <Card>
              <span>Products</span>
              <strong>{items.length}</strong>
            </Card>
            <Card>
              <span>Published products</span>
              <strong>{items.filter((p) => p.published).length}</strong>
            </Card>
            <Card>
              <span>In-stock units</span>
              <strong>{items.reduce((n, p) => n + p.inventory, 0)}</strong>
            </Card>
          </div>
          <Card className="checklist">
            <h2>Bring your store to life</h2>
            {[
              {
                done: true,
                label: "Create your store",
                description: "Your business has a new home.",
                href: `/stores/${id}/settings`,
              },
              {
                done: items.length > 0,
                label: "Add your first product",
                description: "Start with something your customers will love.",
                href: `/stores/${id}/products`,
              },
              {
                done: s.published,
                label: "Open your storefront",
                description: "Publish when you are ready to share.",
                href: `/stores/${id}/settings`,
              },
            ].map((item, i) => (
              <Link href={item.href} key={item.label}>
                <span className={item.done ? "complete" : ""}>
                  {item.done ? "✓" : i + 1}
                </span>
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.description}</p>
                </div>
                <ArrowUpRight size={18} />
              </Link>
            ))}
          </Card>
        </>
      )}
    </>
  );
}
function ProductManager({
  store,
  items,
  refresh,
}: {
  store: Store;
  items: Product[];
  refresh: () => void;
}) {
  const [query, setQuery] = useState(""),
    [editing, setEditing] = useState<Product | null | undefined>(undefined),
    [deleting, setDeleting] = useState<Product | null>(null);
  const remove = useSaveAction();
  const filtered = items.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()),
  );
  if (editing !== undefined)
    return (
      <ProductEditor
        storeId={store.id}
        currency={store.currency}
        product={editing}
        done={() => {
          setEditing(undefined);
          refresh();
        }}
        cancel={() => setEditing(undefined)}
      />
    );
  return (
    <>
      <div className="product-toolbar">
        <div className="search">
          <Search size={17} />
          <input
            aria-label="Search products"
            placeholder="Find a product…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button onPress={() => setEditing(null)}>
          <Plus size={17} />
          Add product
        </Button>
      </div>
      {deleting && (
        <div className="delete-confirm" role="alert">
          <p>
            Delete <strong>{deleting.name}</strong>? This permanently removes
            the product.
          </p>
          <Button
            variant="secondary"
            isDisabled={remove.loading}
            onPress={() => setDeleting(null)}
          >
            Keep product
          </Button>
          <Button
            variant="danger"
            isPending={remove.loading}
            onPress={() =>
              remove.save(
                () => storeApi.deleteProduct(store.id, deleting.id),
                "Product deleted",
                () => {
                  setDeleting(null);
                  refresh();
                },
              )
            }
          >
            {remove.loading ? (
              <Spinner size="sm" />
            ) : (
              <Trash2 size={16} aria-hidden="true" />
            )}
            Delete product
          </Button>
        </div>
      )}
      {filtered.length ? (
        <div className="product-table">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Status</th>
                <th>Inventory</th>
                <th>Price</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="product-identity">
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt=""
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span>
                          <Package size={22} />
                        </span>
                      )}
                      <strong>{p.name}</strong>
                    </div>
                  </td>
                  <td>
                    <Chip size="sm" color={p.published ? "success" : "default"}>
                      {p.published ? "Active" : "Draft"}
                    </Chip>
                  </td>
                  <td>{p.inventory} available</td>
                  <td>
                    {Number(p.price).toLocaleString()} {store.currency}
                  </td>
                  <td>
                    <Button
                      isIconOnly
                      variant="ghost"
                      aria-label={`Edit ${p.name}`}
                      onPress={() => setEditing(p)}
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      isIconOnly
                      variant="ghost"
                      aria-label={`Delete ${p.name}`}
                      onPress={() => setDeleting(p)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">
          <Package size={40} />
          <h2>{query ? "No matching products" : "Make your first addition"}</h2>
          <p>
            {query
              ? "Try another search."
              : "Every collection starts with one great product."}
          </p>
          {!query && (
            <Button variant="secondary" onPress={() => setEditing(null)}>
              Add your first product
            </Button>
          )}
        </div>
      )}
    </>
  );
}
function ProductEditor({
  storeId,
  currency,
  product,
  done,
  cancel,
}: {
  storeId: number;
  currency: string;
  product: Product | null;
  done: () => void;
  cancel: () => void;
}) {
  const [form, setForm] = useState<ProductDraft>({
    name: product?.name || "",
    description: product?.description || "",
    price: product?.price || "0",
    inventory: product?.inventory || 0,
    imageUrl: product?.imageUrl || "",
    published: product?.published || false,
  });
  const action = useSaveAction();
  const set = (key: keyof ProductDraft, value: string | number | boolean) =>
    setForm((s) => ({ ...s, [key]: value }));
  return (
    <form
      className="editor"
      onSubmit={(e) => {
        e.preventDefault();
        action.save(
          () => storeApi.saveProduct(storeId, form, product?.id),
          "Product saved",
          done,
        );
      }}
    >
      <fieldset disabled={action.loading}>
        <h2>
          {product ? "Edit product" : "Something new for your collection"}
        </h2>
        <Field
          label="Product name"
          required
          value={form.name}
          onChange={(v) => set("name", v)}
          maxLength={160}
        />
        <Field
          area
          label="Description"
          value={form.description}
          onChange={(v) => set("description", v)}
          maxLength={3000}
        />
        <div className="form-grid">
          <Field
            label={`Price (${currency})`}
            type="number"
            required
            min={0}
            step="0.01"
            value={form.price}
            onChange={(v) => set("price", v)}
          />
          <Field
            label="Inventory"
            type="number"
            required
            min={0}
            step="1"
            value={String(form.inventory)}
            onChange={(v) => set("inventory", Number(v))}
          />
        </div>
        <Field
          label="Product image URL (HTTPS)"
          type="url"
          value={form.imageUrl}
          onChange={(v) => set("imageUrl", v)}
          maxLength={2000}
        />
        <div className="visibility">
          <div>
            <h3>Publish product</h3>
            <p>Visible when your store is also published.</p>
          </div>
          <Switch
            aria-label="Publish product"
            isSelected={form.published}
            onChange={(v) => set("published", v)}
          >
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch>
        </div>
        <div className="form-actions">
          <Button
            type="button"
            variant="secondary"
            onPress={cancel}
            isDisabled={action.loading}
          >
            <X size={16} aria-hidden="true" />
            Cancel
          </Button>
          <Button type="submit" isPending={action.loading}>
            {action.loading ? (
              <Spinner size="sm" />
            ) : (
              <Save size={16} aria-hidden="true" />
            )}
            Save product
          </Button>
        </div>
      </fieldset>
    </form>
  );
}

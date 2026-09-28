"use client";
import { Save, Plus, X } from "lucide-react";
import { useState } from "react";
import { observable, type Observable } from "@legendapp/state";
import { useSelector } from "@legendapp/state/react";
import { StorePreview } from "./StorePreview";
import { useRouter } from "next/navigation";
import { Button, Spinner, Switch } from "@heroui/react";
import { Field } from "./Fields";
import { storeApi } from "../services/storeApi";
import { useSaveAction } from "../hooks/useStores";
import type { Store, StoreDraft, Product } from "../types/store";
export function StoreEditor({
  store,
  onSaved,
  products = [],
}: {
  store?: Store;
  products?: Product[];
  onSaved?: () => void;
}) {
  const [draft] = useState(() => observable<StoreDraft>({
    name: store?.name || "",
    slug: store?.slug || "",
    description: store?.description || "",
    currency: store?.currency || "MMK",
    published: store?.published || false,
    logoUrl: store?.logoUrl || "",
    coverUrl: store?.coverUrl || "",
    theme: store?.theme || "eyn-light",
  }));
  return <div className="store-editor-preview">
    <StoreEditorForm draft={draft} store={store} onSaved={onSaved} />
    <StorePreview draft={draft} store={store} products={products} />
  </div>;
}

function StoreEditorForm({ draft, store, onSaved }: { draft: Observable<StoreDraft>; store?: Store; onSaved?: () => void }) {
  const router = useRouter();
  const { loading, save } = useSaveAction();
  const form = useSelector(() => draft.get());
  const set = (key: keyof StoreDraft, value: string | boolean) =>
    draft.assign({ [key]: value });
  return (
    <form
      className="editor"
      onSubmit={(e) => {
        e.preventDefault();
        void save(
          async () => {
            const result = store
              ? await storeApi.update(store.id, form)
              : await storeApi.create(form);
            if (!store) router.push(`/stores/${result.id}`);
          },
          store ? "Store updated" : "Your store is ready",
          () => onSaved?.(),
        );
      }}
    >
      <fieldset disabled={loading}>
        <div className="section-title">
          <span>01</span>
          <div>
            <h2>The essentials</h2>
            <p>Introduce your business to the world.</p>
          </div>
        </div>
        <div className="form-grid">
          <Field
            label="Store name"
            value={form.name}
            onChange={(v) => set("name", v)}
            required
            maxLength={80}
          />
          <Field
            label="Store URL"
            value={form.slug}
            onChange={(v) => set("slug", v.toLowerCase())}
            required
            maxLength={60}
          />
        </div>
        <p className="field-help">
          Your storefront: /shop/{form.slug || "your-store"} · letters, numbers
          and hyphens
        </p>
        <Field
          area
          label="About your store"
          value={form.description}
          onChange={(v) => set("description", v)}
          maxLength={1000}
        />
        <label className="select-label">
          Currency
          <select
            value={form.currency}
            onChange={(e) => set("currency", e.target.value)}
          >
            {["MMK", "USD", "THB"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <p className="field-help">
          Changing currency changes the label only. Existing prices are not
          converted.
        </p>
        <h2>Storefront appearance</h2>
        <Field
          label="Logo URL (HTTPS)"
          type="url"
          value={form.logoUrl || ""}
          onChange={(v) => set("logoUrl", v)}
          maxLength={2000}
        />
        <Field
          label="Cover image URL (HTTPS)"
          type="url"
          value={form.coverUrl || ""}
          onChange={(v) => set("coverUrl", v)}
          maxLength={2000}
        />
        <label className="select-label">
          Storefront theme
          <select
            value={form.theme}
            onChange={(e) => set("theme", e.target.value)}
          >
            <option value="eyn-light">EYN Light</option>
            <option value="eyn-dark">EYN Dark</option>
          </select>
        </label>
        <p className="field-help">
          Your storefront uses this theme independently of your merchant
          workspace.
        </p>
        <div className="visibility">
          <div>
            <h3>Publish your storefront</h3>
            <p>Let visitors browse your published products.</p>
          </div>
          <Switch
            className="eyn-publish-switch"
            aria-label="Publish store"
            isSelected={form.published}
            onChange={(v) => set("published", v)}
          >
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <span className="eyn-switch-status" aria-hidden="true">{form.published ? "On" : "Off"}</span>
            </Switch.Content>
          </Switch>
        </div>
        <div className="form-actions">
          <Button
            type="button"
            variant="secondary"
            onPress={() =>
              router.push(store ? `/stores/${store.id}` : "/stores")
            }
          >
            <X size={16} aria-hidden="true" />
            Cancel
          </Button>
          <Button type="submit" isPending={loading}>
            {loading ? (
              <Spinner size="sm" />
            ) : store ? (
              <Save size={16} aria-hidden="true" />
            ) : (
              <Plus size={16} aria-hidden="true" />
            )}
            {store ? "Save changes" : "Create store"}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}

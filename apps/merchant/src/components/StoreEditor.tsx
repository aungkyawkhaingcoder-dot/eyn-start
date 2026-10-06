"use client";
import { Save, Plus, X } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { observable, type Observable } from "@legendapp/state";
import { useSelector } from "@legendapp/state/react";
import { useRouter } from "next/navigation";
import { Button, Spinner, Switch } from "@heroui/react";
import { Field } from "./Fields";
import { storeApi } from "../services/storeApi";
import { useSaveAction } from "../hooks/useStores";
import type { Store, StoreDraft } from "../types/store";
export function StoreEditor({
  store,
  onSaved,
}: {
  store?: Store;
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
    storefrontConfig: store?.storefrontConfig || {},
  }));
  return <StoreEditorForm draft={draft} store={store} onSaved={onSaved} />;
}

function StoreEditorForm({ draft, store, onSaved }: { draft: Observable<StoreDraft>; store?: Store; onSaved?: () => void }) {
  const router = useRouter();
  const { loading, save } = useSaveAction();
  return (
    <form
      className="editor"
      onSubmit={(e) => {
        e.preventDefault();
        void save(
          async () => {
            const { name, slug, description, currency, published } = draft.peek();
            const settings = { name, slug, description, currency, published };
            const result = store
              ? await storeApi.update(store.id, settings)
              : await storeApi.create(settings);
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
          <DraftField draft={draft} name="name" label="Store name" required maxLength={80} />
          <DraftField draft={draft} name="slug" label="Store URL" required maxLength={60} />
        </div>
        <StoreUrlHint draft={draft} />
        <DraftField draft={draft} name="description" label="About your store" area maxLength={1000} />
        <CurrencyField draft={draft} />
        <p className="field-help">
          Changing currency changes the label only. Existing prices are not
          converted.
        </p>
        <div className="visibility">
          <div>
            <h3>Publish your storefront</h3>
            <p>Let visitors browse your published products.</p>
          </div>
          <PublicationField draft={draft} />
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

// Each input owns its subscription; saving reads a fresh snapshot only on submit.
function DraftField({draft, name, ...props}: Omit<ComponentProps<typeof Field>, "value" | "onChange"> & {draft: Observable<StoreDraft>; name: "name" | "slug" | "description"}) {
 const value = useSelector(draft[name]);
 return <Field {...props} value={value} onChange={value => draft[name].set(name === "slug" ? value.toLowerCase() : value)} />;
}
function StoreUrlHint({draft}: {draft: Observable<StoreDraft>}) {
 const slug = useSelector(draft.slug);
 return <p className="field-help">Your storefront: /shop/{slug || "your-store"} · letters, numbers and hyphens</p>;
}
function CurrencyField({draft}: {draft: Observable<StoreDraft>}) {
 const currency = useSelector(draft.currency);
 return <label className="select-label">Currency<select value={currency} onChange={e => draft.currency.set(e.target.value)}>{["MMK", "USD", "THB"].map(c => <option key={c}>{c}</option>)}</select></label>;
}
function PublicationField({draft}: {draft: Observable<StoreDraft>}) {
 const published = useSelector(draft.published);
 return (          <Switch
            className="eyn-publish-switch"
            aria-label="Publish store"
            isSelected={published}
            onChange={(v) => draft.published.set(v)}
          >
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <span className="eyn-switch-status" aria-hidden="true">{published ? "On" : "Off"}</span>
            </Switch.Content>
          </Switch>);
}

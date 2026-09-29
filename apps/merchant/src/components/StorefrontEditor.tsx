"use client";
import { useEffect, useState } from "react";
import { batch, observable, type Observable } from "@legendapp/state";
import { useSelector } from "@legendapp/state/react";
import { Button, Spinner, Popover } from "@heroui/react";
import { Field } from "./Fields";
import { copyLimits, type CopyKey } from "./storefront/EditableCopy";
import { ThemeToolbar } from "./ThemeToolbar";
import { StorePreview } from "./StorePreview";
import { useSaveAction } from "../hooks/useStores";
import { storeApi } from "../services/storeApi";
import type { Store, StoreDraft, Product } from "../types/store";

type Draft = Observable<StoreDraft>;
function BrandingField({
  draft,
  name,
  label,
}: {
  draft: Draft;
  name: "logoUrl" | "coverUrl";
  label: string;
}) {
  const value = useSelector(() => draft[name].get() || "");
  return (
    <Field
      label={label}
      type="url"
      value={value}
      maxLength={2000}
      onChange={(value) => draft[name].set(value)}
    />
  );
}
function designSnapshot(value: StoreDraft | Store) {
  return JSON.stringify({
    config: value.storefrontConfig || {},
    theme: value.theme || "eyn-light",
    logoUrl: value.logoUrl || "",
    coverUrl: value.coverUrl || "",
  });
}
function ApplyButton({
  draft,
  store,
  loading,
}: {
  draft: Draft;
  store: Store;
  loading: boolean;
}) {
  const dirty = useSelector(
    () => designSnapshot(draft.get()) !== designSnapshot(store),
  );
  return (
    <Button type="submit" isDisabled={!dirty || loading} isPending={loading}>
      {loading && <Spinner size="sm" />}Apply to storefront
    </Button>
  );
}
function DraftStatus({ draft, store }: { draft: Draft; store: Store }) {
  const [status, setStatus] = useState("Saved version");
  useEffect(() => {
    const key = `eyn-design-draft:${store.id}`;
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) || "null");
      if (
        saved?.version === store.updatedAt &&
        saved.config &&
        typeof saved.config === "object"
      ) {
        draft.storefrontConfig.set(saved.config);
        if (saved.theme === "eyn-dark" || saved.theme === "eyn-light")
          draft.theme.set(saved.theme);
        if (typeof saved.logoUrl === "string") draft.logoUrl.set(saved.logoUrl);
        if (typeof saved.coverUrl === "string")
          draft.coverUrl.set(saved.coverUrl);
        setStatus("Local draft restored");
      }
    } catch {
      /* Storage is optional. */
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const flush = () => {
      if (!timer) return;
      clearTimeout(timer);
      timer = undefined;
      try {
        if (designSnapshot(draft.peek()) === designSnapshot(store)) {
          sessionStorage.removeItem(key);
          setStatus("Saved version");
          return;
        }
        sessionStorage.setItem(
          key,
          JSON.stringify({
            version: store.updatedAt,
            config: draft.storefrontConfig.peek(),
            theme: draft.theme.peek(),
            logoUrl: draft.logoUrl.peek(),
            coverUrl: draft.coverUrl.peek(),
          }),
        );
        setStatus("Local draft saved");
      } catch {
        setStatus("Unsaved draft — browser storage unavailable");
      }
    };
    const dispose = draft.onChange(() => {
      setStatus(
        designSnapshot(draft.peek()) === designSnapshot(store)
          ? "Saved version"
          : "Unsaved changes",
      );
      clearTimeout(timer);
      timer = setTimeout(flush, 400);
    });
    window.addEventListener("pagehide", flush);
    return () => {
      flush();
      dispose();
      window.removeEventListener("pagehide", flush);
    };
  }, [draft, store.id, store.updatedAt]);
  return (
    <div className="design-draft-status">
      <p role="status">{status}</p>
      <Button
        variant="secondary"
        onPress={() => {
          batch(() => {
            draft.storefrontConfig.set(
              structuredClone(store.storefrontConfig || {}),
            );
            draft.theme.set(store.theme || "eyn-light");
            draft.logoUrl.set(store.logoUrl || "");
            draft.coverUrl.set(store.coverUrl || "");
          });
          try {
            sessionStorage.removeItem(`eyn-design-draft:${store.id}`);
          } catch {
            /* Optional storage. */
          }
          setStatus("Saved version restored");
        }}
      >
        Discard draft
      </Button>
      <Button
        variant="secondary"
        onPress={() => {
          for (const key of Object.keys(copyLimits) as CopyKey[])
            draft.storefrontConfig[key].set("");
        }}
      >
        Reset text
      </Button>
    </div>
  );
}

export function StorefrontEditor({
  store,
  products,
  onSaved,
}: {
  store: Store;
  products: Product[];
  onSaved: () => void;
}) {
  const [draft] = useState(() =>
    observable<StoreDraft>({
      name: store.name,
      slug: store.slug,
      description: store.description,
      currency: store.currency,
      published: store.published,
      theme: store.theme || "eyn-light",
      logoUrl: store.logoUrl || "",
      coverUrl: store.coverUrl || "",
      storefrontConfig: structuredClone(store.storefrontConfig || {}),
    }),
  );
  const [toolbarTarget, setToolbarTarget] = useState<HTMLDivElement | null>(
    null,
  );
  const { loading, save } = useSaveAction();
  return (
    <div className="store-editor-preview storefront-design-workspace design-button-workspace">
      <div className="design-top-toolbar" ref={setToolbarTarget} />
      <form
        className="editor"
        onSubmit={(e) => {
          e.preventDefault();
          void save(
            () => storeApi.update(store.id, draft.peek()),
            "Storefront saved",
            () => {
              try {
                sessionStorage.removeItem(`eyn-design-draft:${store.id}`);
              } catch {
                /* Optional storage. */
              }
              onSaved();
            },
          );
        }}
      >
        <fieldset disabled={loading}>
          <DraftStatus draft={draft} store={store} />
          <Popover>
            <Button variant="secondary" isDisabled={loading}>
              Logo & cover
            </Button>
            <Popover.Content
              placement="bottom start"
              className="design-tools-popover"
            >
              <Popover.Dialog>
                <Popover.Heading>Logo & cover</Popover.Heading>
                <div className="design-group">
                  <div className="design-group-body">
                    <BrandingField
                      draft={draft}
                      name="logoUrl"
                      label="Logo URL (HTTPS)"
                    />
                    <BrandingField
                      draft={draft}
                      name="coverUrl"
                      label="Cover image URL (HTTPS)"
                    />
                  </div>
                </div>
              </Popover.Dialog>
            </Popover.Content>
          </Popover>
          <div className="design-apply">
            <ApplyButton draft={draft} store={store} loading={loading} />
          </div>
        </fieldset>
      </form>
      <div inert={loading} className="design-theme-controls">
        <ThemeToolbar draft={draft} />
      </div>
      <div inert={loading} className="design-canvas-content">
        <StorePreview
          toolbarTarget={toolbarTarget}
          editable
          draft={draft}
          store={store}
          products={products}
        />
      </div>
    </div>
  );
}

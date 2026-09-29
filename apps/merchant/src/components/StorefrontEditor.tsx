"use client";
import { useEffect, useState } from "react";
import { observable, type Observable } from "@legendapp/state";
import { useSelector } from "@legendapp/state/react";
import { Button, Spinner, ColorSwatchPicker, Popover } from "@heroui/react";
import { BrandColorControl } from "./BrandColorControl";
import { Field } from "./Fields";
import { copyLimits, type CopyKey } from "./storefront/EditableCopy";
import { ThemeToolbar } from "./ThemeToolbar";
import { StorePreview } from "./StorePreview";
import { useSaveAction } from "../hooks/useStores";
import { storeApi } from "../services/storeApi";
import {
  colorKeys,
  brandColors,
  defaultColors,
  palette,
} from "./storefront/design";
import type {
  Store,
  StoreDraft,
  Product,
  StorefrontConfig,
} from "../types/store";

type Draft = Observable<StoreDraft>;
function BrandingField({ draft, name, label }: { draft: Draft; name: "logoUrl" | "coverUrl"; label: string }) {
  const value = useSelector(() => draft[name].get() || "");
  return <Field label={label} type="url" value={value} maxLength={2000} onChange={value => draft[name].set(value)} />;
}
function Colors({ draft }: { draft: Draft }) {
  const dark = useSelector(() => draft.theme.get() === "eyn-dark");
  const colorSnapshot = useSelector(() => JSON.stringify(Object.fromEntries(colorKeys.map(key => [key, draft.storefrontConfig[key].get()]).filter(([,value]) => value !== undefined))));
  const custom = JSON.parse(colorSnapshot);
  const colors = { ...defaultColors(dark), ...custom };
  const [base, setBase] = useState(() => draft.storefrontConfig.primary.peek() || "#c8a46b"),
    [mode, setMode] = useState("Analogous");
  const [auto, setAuto] = useState(true);
  const generate = (color = base, harmony = mode, isDark = dark) => draft.storefrontConfig.assign(brandColors(color, harmony, isDark));
  return (
    <details className="design-group" open>
      <summary>Colors & theme</summary>
      <div className="design-group-body">
      <Button className="design-reset-colors" variant="secondary" onPress={() => draft.storefrontConfig.assign(defaultColors(dark))}>Reset colors</Button>
      <label className="select-label">
        Theme
        <select
          value={dark ? "eyn-dark" : "eyn-light"}
          onChange={(e) => { draft.theme.set(e.target.value as Store["theme"]); if (auto) generate(base, mode, e.target.value === "eyn-dark"); }}
        >
          <option value="eyn-light">Light</option>
          <option value="eyn-dark">Dark</option>
        </select>
      </label>
      <p className="field-help">
        Choose a brand color to generate a coordinated theme. Individual colors remain editable.
      </p>
      <details className="design-subgroup"><summary>Brand color & palette</summary><div className="design-group-body">
      <label className="design-section-toggle"><input type="checkbox" checked={auto} onChange={e => { setAuto(e.target.checked); if (e.target.checked) generate(); }} />Auto-match all colors</label>
      <BrandColorControl label="Base brand color" value={base} onChange={color => { setBase(color); if(auto) generate(color); }} />
      <label className="select-label">
        Color harmony
        <select value={mode} onChange={(e) => { setMode(e.target.value); if (auto) generate(base, e.target.value); }}>
          {[
            "Monochromatic",
            "Analogous",
            "Complementary",
            "Triadic",
            "Tetradic",
          ].map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </label>
      <Button variant="secondary" onPress={() => generate()}>Apply brand palette</Button>
      <ColorSwatchPicker aria-label="Palette accent" value={colors.accent} onChange={color=>draft.storefrontConfig.accent.set(color.toString("hex"))}>
        {[...new Set(palette(base, mode))].map(color=><ColorSwatchPicker.Item key={color} color={color} aria-label={`Use ${color} as accent`}><ColorSwatchPicker.Swatch/><ColorSwatchPicker.Indicator/></ColorSwatchPicker.Item>)}
      </ColorSwatchPicker>
      <p className="field-help">
        Select a swatch to set the accent. Assign each color role below.
      </p>
      </div></details>
      {colorKeys.map(key => <BrandColorControl key={key} label={key === "buttonText" ? "Button text" : key} value={colors[key]} onChange={color=>draft.storefrontConfig[key].set(color)}/>)}
      </div>
    </details>
  );
}
function DraftStatus({ draft, store }: { draft: Draft; store: Store }) {
  const [status, setStatus] = useState("Saved version");
  useEffect(() => {
    const key = `eyn-design-draft:${store.id}`;
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) || "null");
      if (saved?.version === store.updatedAt && saved.config && typeof saved.config === "object") {
        draft.storefrontConfig.set(saved.config);
        if (saved.theme === "eyn-dark" || saved.theme === "eyn-light") draft.theme.set(saved.theme);
        if (typeof saved.logoUrl === "string") draft.logoUrl.set(saved.logoUrl);
        if (typeof saved.coverUrl === "string") draft.coverUrl.set(saved.coverUrl);
        setStatus("Local draft restored");
      }
    } catch { /* Storage is optional. */ }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const flush = () => {
      if (!timer) return;
      clearTimeout(timer); timer = undefined;
      try {
        sessionStorage.setItem(key, JSON.stringify({ version: store.updatedAt, config: draft.storefrontConfig.peek(), theme: draft.theme.peek(), logoUrl: draft.logoUrl.peek(), coverUrl: draft.coverUrl.peek() }));
        setStatus("Local draft saved");
      } catch { setStatus("Unsaved draft — browser storage unavailable"); }
    };
    const dispose = draft.onChange(() => { clearTimeout(timer); timer = setTimeout(flush, 400); });
    window.addEventListener("pagehide", flush);
    return () => { flush(); dispose(); window.removeEventListener("pagehide", flush); };
  }, [draft, store.id, store.updatedAt]);
  return <div className="design-draft-status"><p role="status">{status}</p><Button variant="secondary" onPress={() => {
    draft.storefrontConfig.set(store.storefrontConfig || {});
    draft.theme.set(store.theme || "eyn-light");
    draft.logoUrl.set(store.logoUrl || "");
    draft.coverUrl.set(store.coverUrl || "");
    try { sessionStorage.removeItem(`eyn-design-draft:${store.id}`); } catch { /* Optional storage. */ }
    setStatus("Saved version restored");
  }}>Discard draft</Button>
  <Button variant="secondary" onPress={() => {
    for (const key of Object.keys(copyLimits) as CopyKey[]) draft.storefrontConfig[key].set("");
  }}>Reset text</Button></div>;
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
      storefrontConfig: store.storefrontConfig || {},
    }),
  );
  const [toolbarTarget, setToolbarTarget] = useState<HTMLDivElement | null>(null);
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
              try { sessionStorage.removeItem(`eyn-design-draft:${store.id}`); } catch { /* Optional storage. */ }
              onSaved();
            },
          );
        }}
      >
        <fieldset disabled={loading}>
          <DraftStatus draft={draft} store={store} />
          <Popover><Button variant="secondary" isDisabled={loading}>Logo & cover</Button><Popover.Content placement="bottom start" className="design-tools-popover"><Popover.Dialog><Popover.Heading>Logo & cover</Popover.Heading>
          <details className="design-group"><summary>Logo & cover</summary><div className="design-group-body">
          <BrandingField draft={draft} name="logoUrl" label="Logo URL (HTTPS)" />
          <BrandingField draft={draft} name="coverUrl" label="Cover image URL (HTTPS)" />
          </div></details>
          </Popover.Dialog></Popover.Content></Popover>
          <Popover><Button variant="secondary" isDisabled={loading}>Edit colors</Button><Popover.Content placement="bottom start" className="design-tools-popover"><Popover.Dialog><Popover.Heading>Color editor</Popover.Heading><Colors draft={draft} /></Popover.Dialog></Popover.Content></Popover>
          <div className="design-apply"><Button type="submit" isPending={loading}>
            {loading && <Spinner size="sm" />}Apply to storefront
          </Button></div>
        </fieldset>
      </form>
      <ThemeToolbar draft={draft} />
      <StorePreview toolbarTarget={toolbarTarget} editable draft={draft} store={store} products={products} />
    </div>
  );
}

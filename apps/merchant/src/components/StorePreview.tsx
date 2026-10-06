"use client";
import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Observable } from "@legendapp/state";
import { useSelector } from "@legendapp/state/react";
import { Button } from "@heroui/react";
import { Copy, ExternalLink, Monitor, Smartphone, PanelsTopLeft, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import type { Product, Store, StoreDraft } from "../types/store";
import { CopyEditorContext, copyLimits } from "./storefront/EditableCopy";
import { StorefrontView } from "./storefront/StorefrontView";
import { storeApi } from "../services/storeApi";
import { backgroundEffect } from "./storefront/backgrounds";
import { designStyle } from "./storefront/styles";
import { loadStorefrontFont } from "./storefront/fonts";
import { themeStyle, colorKeys } from "./storefront/design";
import "./store-preview.css";

type Props = {
  draft: Observable<StoreDraft>;
  store?: Store;
  products: Product[];
  editable?: boolean;
  toolbarTarget?: HTMLElement | null;
  bestSellerIds?: number[];
};

function PublicLink({
  store,
  compact = false,
}: {
  store?: Store;
  compact?: boolean;
}) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const href = store ? `${origin}/shop/${encodeURIComponent(store.slug)}` : "";
  return (
    <div className={`preview-link ${compact ? "preview-link-compact" : ""}`}>
      {!compact && <strong>Storefront link</strong>}
      <code title={href}>
        {compact && store
          ? `/shop/${store.slug}`
          : href || "Create your store to get a shareable link."}
      </code>
      <span
        className="preview-publication"
        title="Publication status of your saved storefront"
      >
        {store?.published
          ? "Published"
          : compact
            ? "Not published"
            : "Not published — customers cannot visit yet."}
      </span>
      <div className="preview-actions">
        <Button
          variant={compact ? "ghost" : "secondary"}
          isIconOnly={compact}
          aria-label="Copy link"
          isDisabled={!href}
          onPress={async () => {
            try {
              await navigator.clipboard.writeText(href);
              toast.success("Link copied");
            } catch {
              toast.error(
                "Unable to copy. Select the link and copy it manually.",
              );
            }
          }}
        >
          <Copy size={16} />
          {!compact && "Copy link"}
        </Button>
        {store?.published && (
          <a
            aria-label="Open storefront"
            title="Open storefront"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={16} />
            {!compact && "Open storefront"}
          </a>
        )}
      </div>
      {!compact && (
        <small>
          This link reflects your saved store. Save changes to publish edits.
        </small>
      )}
    </div>
  );
}

// Only this subscriber receives draft changes; the toolbar and link stay stable.
const PreviewContent = memo(function PreviewContent({ draft, store, products, editable, bestSellerIds = [] }: Props) {
  const appearanceRoot = useRef<HTMLDivElement>(null);
  // Inline copy subscribes per field; typing does not rerender the storefront tree.
  const snapshot = useSelector(() => {
    const form = draft.get();
    if (!editable) return JSON.stringify(form);
    const config = { ...form.storefrontConfig };
    for (const key of [
      ...Object.keys(copyLimits),
      ...colorKeys,
      "themeHue",
      "themeChroma",
      "themeLightness",
      "themeBase",
      "themeVibrant",
      "fontFamily",
      "designStyle",
      "backgroundEffect",
      "radius",
      "formRadius",
    ])
      delete config[key as keyof typeof config];
    return JSON.stringify({ ...form, storefrontConfig: config });
  });
  // Update CSS variables without rerendering product cards or disrupting editable text.
  useLayoutEffect(() => {
    if (!editable) return;
    let frame: number | null = null;
    const apply = () => {
      frame = null;
      const node = appearanceRoot.current?.querySelector<HTMLElement>(".sf");
      if (node)
        node.dataset.background = backgroundEffect(
          draft.storefrontConfig.backgroundEffect.peek(),
        );
      if (node)
        node.dataset.design = designStyle(
          draft.storefrontConfig.designStyle.peek(),
        );
      if (node)
        loadStorefrontFont(
          node.ownerDocument,
          draft.storefrontConfig.fontFamily.peek(),
        );
      if (node)
        for (const [key, value] of Object.entries(
          themeStyle(
            draft.storefrontConfig.peek() || {},
            draft.theme.peek() === "eyn-dark",
          ),
        ))
          node.style.setProperty(key, value);
    };
    const appearance = () => {
      const config = draft.storefrontConfig.peek() || {};
      return JSON.stringify([draft.theme.peek(), ...[
        ...colorKeys, "themeHue", "themeChroma", "themeLightness", "themeBase",
        "themeVibrant", "fontFamily", "designStyle", "backgroundEffect", "radius", "formRadius",
      ].map(key => config[key as keyof typeof config])]);
    };
    let previousAppearance = appearance();
    apply();
    const dispose = draft.onChange(() => {
      const next = appearance();
      if (next === previousAppearance) return;
      previousAppearance = next;
      if (frame === null) frame = requestAnimationFrame(apply);
    });
    return () => {
      dispose();
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [draft, editable, snapshot]);
  const form = JSON.parse(snapshot) as StoreDraft;
  useEffect(() => {
    const doc = appearanceRoot.current?.ownerDocument;
    if (doc) loadStorefrontFont(doc, form.storefrontConfig?.fontFamily);
  }, [form.storefrontConfig?.fontFamily]);
  return (
    <CopyEditorContext.Provider value={editable ? draft : null}>
      <div
        ref={appearanceRoot}
        onClickCapture={(event) => {
          const target = event.target as Element;
          const anchor = target.closest("a");
          if (anchor && !anchor.getAttribute("href")?.startsWith("#"))
            event.preventDefault();
        }}
      >
        <StorefrontView
          preview
          store={{
            ...form,
            id: store?.id || 0,
            name: form.name || "Your store",
            products: products.filter((product) => product.published),
            bestSellerIds,
          }}
        />
      </div>
    </CopyEditorContext.Provider>
  );
});

export function StorePreview(props: Props) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [available, setAvailable] = useState(600);
  const [detached, setDetached] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(760);
  const [bestSellerIds, setBestSellerIds] = useState<number[]>([]);
  useEffect(() => {
    setDetached(new URLSearchParams(window.location.search).get("editorWindow") === "1");
  }, []);
  useEffect(() => {
    let active = true;
    setBestSellerIds([]);
    if (props.store?.published) void storeApi.storefront(props.store.slug).then(value => {
      if (active) setBestSellerIds(value.bestSellerIds || []);
    }).catch(() => {});
    return () => { active = false; };
  }, [props.store?.slug, props.store?.published]);
  const previewWindow = useRef<Window | null>(null);
  useEffect(() => {
    const detached = new URLSearchParams(window.location.search).get("editorWindow") === "1";
    const peer = () => detached ? window.opener as Window | null : previewWindow.current;
    const send = () => {
      const other = peer();
      if (other && !other.closed) other.postMessage({type:"eyn-editor-draft",storeId:props.store?.id,draft:JSON.parse(JSON.stringify(props.draft.peek()))},window.location.origin);
    };
    let receiving = false;
    let pending: ReturnType<typeof setTimeout> | undefined;
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== peer() || event.data?.storeId !== props.store?.id) return;
      if (event.data.type === "eyn-editor-ready") send();
      if (event.data.type === "eyn-editor-draft" && event.data.draft && JSON.stringify(event.data.draft) !== JSON.stringify(props.draft.peek())) { receiving = true; try { props.draft.set(event.data.draft); } finally { receiving = false; } }
    };
    window.addEventListener("message",receive);
    const dispose = props.draft.onChange(() => {
      if (receiving || pending) return;
      pending = setTimeout(() => { pending = undefined; send(); }, 32);
    });
    if (detached && window.opener) window.opener.postMessage({type:"eyn-editor-ready",storeId:props.store?.id},window.location.origin);
    return () => { dispose(); clearTimeout(pending); window.removeEventListener("message",receive); };
  },[props.draft,props.store?.id]);
  const openWindow = () => {
    if (previewWindow.current && !previewWindow.current.closed) { previewWindow.current.focus(); return; }
    const url = new URL(window.location.href);
    url.searchParams.set("editorWindow","1");
    const popup = window.open(url.href,"","popup,width=1440,height=1000,resizable=yes,scrollbars=yes");
    if (!popup) { toast.error("Allow pop-ups for this site to open the editor."); return; }
    previewWindow.current = popup;
    popup.focus();
  };
  const container = useRef<HTMLDivElement>(null);
  const width = device === "mobile" ? 390 : detached ? available : 1200;
  const scale = Math.min(1, available / width);
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setAvailable(entry.contentRect.width);
      setViewportHeight(entry.contentRect.height);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const toolbar = (
    <div
      className={`preview-toolbar ${props.editable ? "design-canvas-toolbar" : ""}`}
    >
      {props.editable ? (
        <PublicLink store={props.store} compact />
      ) : (
        <div>
          <h2>Live preview</h2>
          <small>Unsaved changes · checkout disabled</small>
        </div>
      )}
      <div
        className="preview-actions preview-device-group"
        role="group"
        aria-label="Canvas size"
      >
        <Button
          isIconOnly
          variant="secondary"
          aria-label="Desktop preview"
          aria-pressed={device === "desktop"}
          onPress={() => setDevice("desktop")}
        >
          <Monitor size={18} />
        </Button>
        <Button
          isIconOnly
          variant="secondary"
          aria-label="Mobile preview"
          aria-pressed={device === "mobile"}
          onPress={() => setDevice("mobile")}
        >
          <Smartphone size={18} />
        </Button>
        <Button
          isIconOnly
          variant="secondary"
          className={detached ? "preview-back-editor" : undefined}
          aria-label={detached ? "Back to editor" : "Open draft preview window"}
          onPress={() => {
            if (!detached) { openWindow(); return; }
            if (window.opener && !window.opener.closed) { window.opener.focus(); window.close(); }
            else { const url = new URL(window.location.href); url.searchParams.delete("editorWindow"); window.location.assign(url.href); }
          }}
        >
          {detached ? <ArrowLeft size={18}><title>Back to editor</title></ArrowLeft> : <PanelsTopLeft size={18}><title>Open full editor</title></PanelsTopLeft>}
        </Button>
      </div>
    </div>
  );
  return (
    <aside className="store-preview" aria-label="Storefront preview">
      {!props.editable && <PublicLink store={props.store} />}
      {props.toolbarTarget
        ? createPortal(toolbar, props.toolbarTarget)
        : toolbar}
      <div
        ref={container}
        className="preview-viewport"
        style={{ height: 760 * scale }}
      >
        <iframe
          title="Live storefront preview"
          srcDoc={
            '<!doctype html><html><head></head><body style="margin:0"><div id="preview-root"></div></body></html>'
          }
          style={{
            width,
            height: detached ? viewportHeight / scale : 760,
            transform: `scale(${scale})`,
            marginLeft: Math.max(0, (available - width * scale) / 2),
          }}
          onLoad={(event) => {
            const doc = event.currentTarget.contentDocument;
            if (!doc) return;
            document
              .querySelectorAll('link[rel="stylesheet"], style')
              .forEach((node) => doc.head.appendChild(node.cloneNode(true)));
            setTarget(doc.getElementById("preview-root"));
          }}
        />
        {target && createPortal(<PreviewContent {...props} bestSellerIds={bestSellerIds} />, target)}
      </div>
      <small>
        Published products are shown. Best sellers appear on the live store when
        sales data is available.
      </small>
    </aside>
  );
}

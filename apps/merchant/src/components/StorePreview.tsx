"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Observable } from "@legendapp/state";
import { useSelector } from "@legendapp/state/react";
import { Button } from "@heroui/react";
import { Copy, ExternalLink, Monitor, Smartphone } from "lucide-react";
import toast from "react-hot-toast";
import type { Product, Store, StoreDraft } from "../types/store";
import { StorefrontView } from "./storefront/StorefrontView";
import "./store-preview.css";

type Props = { draft: Observable<StoreDraft>; store?: Store; products: Product[] };

function PublicLink({ store }: { store?: Store }) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const href = store ? `${origin}/shop/${encodeURIComponent(store.slug)}` : "";
  return <div className="preview-link">
    <strong>Storefront link</strong>
    <code>{href || "Create your store to get a shareable link."}</code>
    <span>{store?.published ? "Published" : "Not published — customers cannot visit yet."}</span>
    <div className="preview-actions">
      <Button variant="secondary" isDisabled={!href} onPress={async () => {
        try { await navigator.clipboard.writeText(href); toast.success("Link copied"); }
        catch { toast.error("Unable to copy. Select the link and copy it manually."); }
      }}><Copy size={16} />Copy link</Button>
      {store?.published && <a href={href} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} />Open storefront</a>}
    </div>
    <small>This link reflects your saved store. Save changes to publish edits.</small>
  </div>;
}

// Only this subscriber receives draft changes; the toolbar and link stay stable.
function PreviewContent({ draft, store, products }: Props) {
  const form = useSelector(() => draft.get());
  return <div onClickCapture={(event) => {
    const target = event.target as Element;
    const anchor = target.closest("a");
    if (anchor && !anchor.getAttribute("href")?.startsWith("#")) event.preventDefault();
  }}>
    <StorefrontView preview store={{
      ...form, id: store?.id || 0, name: form.name || "Your store",
      products: products.filter(product => product.published), bestSellerIds: [],
    }} />
  </div>;
}

export function StorePreview(props: Props) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [available, setAvailable] = useState(600);
  const container = useRef<HTMLDivElement>(null);
  const width = device === "mobile" ? 390 : 1200;
  const scale = Math.min(1, available / width);
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setAvailable(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <aside className="store-preview" aria-label="Storefront preview">
    <PublicLink store={props.store} />
    <div className="preview-toolbar">
      <div><h2>Live preview</h2><small>Unsaved changes · checkout disabled</small></div>
      <div className="preview-actions">
        <Button isIconOnly variant="secondary" aria-label="Desktop preview" aria-pressed={device === "desktop"} onPress={() => setDevice("desktop")}><Monitor size={18} /></Button>
        <Button isIconOnly variant="secondary" aria-label="Mobile preview" aria-pressed={device === "mobile"} onPress={() => setDevice("mobile")}><Smartphone size={18} /></Button>
      </div>
    </div>
    <div ref={container} className="preview-viewport" style={{ height: 760 * scale }}>
      <iframe title="Live storefront preview" srcDoc={'<!doctype html><html><head></head><body style="margin:0"><div id="preview-root"></div></body></html>'}
        style={{ width, height: 760, transform: `scale(${scale})`, marginLeft: Math.max(0, (available - width * scale) / 2) }}
        onLoad={(event) => {
          const doc = event.currentTarget.contentDocument;
          if (!doc) return;
          document.querySelectorAll('link[rel="stylesheet"], style').forEach(node => doc.head.appendChild(node.cloneNode(true)));
          setTarget(doc.getElementById("preview-root"));
        }} />
      {target && createPortal(<PreviewContent {...props} />, target)}
    </div>
    <small>Published products are shown. Best sellers appear on the live store when sales data is available.</small>
  </aside>;
}

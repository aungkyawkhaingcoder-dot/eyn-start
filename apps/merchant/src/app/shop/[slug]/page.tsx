"use client";
import { use, useState } from "react";
import Link from "next/link";
import { useRequest } from "ahooks";
import { Card, Chip, Button } from "@heroui/react";
import { Package, ArrowUpRight } from "lucide-react";
import { storeApi } from "../../../services/storeApi";
import { Brand } from "../../../components/Brand";
import { Loading, Failure } from "../../../components/Feedback";
import type { Product } from "../../../types/store";
export default function Shop({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [selected, setSelected] = useState<Product | null>(null);
  const store = useRequest(() => storeApi.storefront(slug), {
    refreshDeps: [slug],
  });
  if (store.loading) return <Loading />;
  if (store.error) return <Failure error={store.error} retry={store.refresh} />;
  if (!store.data) return null;
  const s = store.data;
  return (
    <div className="public-shop">
      <header>
        <Brand />
        <span>{s.name}</span>
        <Link href="/login">
          Create your own store <ArrowUpRight size={16} />
        </Link>
      </header>
      <section className="shop-hero">
        <span className="eyebrow">WELCOME TO OUR WORLD</span>
        <h1>{s.name}</h1>
        <p>{s.description}</p>
      </section>
      <div className="section-heading">
        <h2>The collection</h2>
        <span>{s.products.length} thoughtfully chosen products</span>
      </div>
      <div className="catalog">
        {s.products.map((p) => (
          <Card key={p.id} className="catalog-card">
            <button
              onClick={() => setSelected(p)}
              aria-label={`View ${p.name}`}
            >
              <div className="catalog-image">
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Package size={50} />
                )}
              </div>
              <div className="catalog-info">
                <h3>{p.name}</h3>
                <p>
                  {Number(p.price).toLocaleString()} {s.currency}
                </p>
                <Chip size="sm">
                  {p.inventory > 0 ? "In stock" : "Out of stock"}
                </Chip>
              </div>
            </button>
          </Card>
        ))}
      </div>
      {!s.products.length && (
        <div className="empty">
          <h2>Something good is on its way.</h2>
          <p>Our collection is coming soon.</p>
        </div>
      )}
      {selected && (
        <div className="product-detail">
          <Button variant="secondary" onPress={() => setSelected(null)}>
            Close details
          </Button>
          <h2>{selected.name}</h2>
          <p>{selected.description}</p>
          <strong>
            {Number(selected.price).toLocaleString()} {s.currency}
          </strong>
          <p>Online checkout is not available yet.</p>
        </div>
      )}
      <footer>
        Powered by EYN <span>Everything you need.</span>
      </footer>
    </div>
  );
}

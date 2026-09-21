"use client";
import Link from "next/link";
import { Button, Card, Chip } from "@heroui/react";
import {
  Sparkles,
  Plus,
  ArrowUpRight,
  Store as StoreIcon,
  Package,
  Globe,
  ArrowRight,
} from "lucide-react";
import { useStores } from "../hooks/useStores";
import { Loading, Failure } from "./Feedback";
export function StoreList({ userId }: { userId: number }) {
  const stores = useStores(userId);
  if (stores.loading && !stores.data) return <Loading />;
  if (stores.error)
    return <Failure error={stores.error} retry={stores.refresh} />;
  const data = stores.data || [];
  const published = data.filter((s) => s.published).length;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">MAKE ROOM FOR WHAT’S NEXT</span>
          <h1>
            Your stores<span className="gold-text">.</span>
          </h1>
          <p>A home for every idea. Manage them all from here.</p>
        </div>
        <Link href="/stores/new" className="button button--primary">
          <Plus size={17} />
          Create store
        </Link>
      </div>
      <div className="hero-banner">
        <div>
          <span className="eyebrow">YOUR NEXT CHAPTER</span>
          <h2>
            Small beginnings.
            <br />
            <em>Unlimited possibilities.</em>
          </h2>
          <p>
            Build a store that feels like you.
            <br />
            We’ll take care of the space to grow.
          </p>
          <Link href="/stores/new">
            Bring your idea to life <ArrowRight size={17} />
          </Link>
        </div>
        <div className="brand-art" aria-hidden="true">
          <div className="orbit one" />
          <div className="orbit two" />
          <img src="/brand/only-white-logo-no-bg.png" alt="" />
          <span>EVERYTHING YOU NEED</span>
          <div className="art-tag">YOUR BRAND. YOUR WORLD.</div>
        </div>
      </div>
      <div className="stats">
        <Card>
          <StoreIcon />
          <span>Total stores</span>
          <strong>{data.length.toString().padStart(2, "0")}</strong>
          <small>Your ideas, brought to life</small>
        </Card>
        <Card>
          <Globe />
          <span>Live storefronts</span>
          <strong>{published.toString().padStart(2, "0")}</strong>
          <small>Ready for visitors</small>
        </Card>
        <Card>
          <Package />
          <span>Products</span>
          <strong>
            {data
              .reduce((n, s) => n + (s._count?.products || 0), 0)
              .toString()
              .padStart(2, "0")}
          </strong>
          <small>Across all your stores</small>
        </Card>
      </div>
      <div className="section-heading">
        <h2>
          All stores <span className="count">{data.length}</span>
        </h2>
        <span>Made by you. Powered by EYN.</span>
      </div>
      <div className="store-grid">
        {data.map((s, i) => (
          <Card key={s.id} className="store-card">
            <div className={`store-cover cover-${i % 3}`}>
              <span>{s.name.slice(0, 1).toUpperCase()}</span>
              <Chip color={s.published ? "success" : "default"} size="sm">
                {s.published ? "Live" : "Draft"}
              </Chip>
            </div>
            <div className="store-card-body">
              <div>
                <h3>{s.name}</h3>
                <p>/shop/{s.slug}</p>
              </div>
              <p className="store-description">
                {s.description ||
                  "Your story starts here. Add a description in store settings."}
              </p>
              <div className="store-meta">
                <span>{s._count?.products || 0} products</span>
                <span>{s.currency}</span>
              </div>
              <Link href={`/stores/${s.id}`} className="manage-link">
                Manage store <ArrowUpRight size={18} />
              </Link>
            </div>
          </Card>
        ))}
        <Link href="/stores/new" className="create-card">
          <span>
            <Plus size={25} />
          </span>
          <h3>
            {data.length ? "Another idea?" : "Your first store starts here"}
          </h3>
          <p>Give it a place to grow.</p>
          <b>
            Create a store <ArrowRight size={15} />
          </b>
        </Link>
      </div>
      <div className="quiet-note">
        <Sparkles size={22} aria-hidden="true" />
        <p>
          Good things start with a first step.
          <br />
          <strong>Let’s make yours count.</strong>
        </p>
      </div>
    </>
  );
}

import Link from "next/link";
import { Card } from "@heroui/react";
import type { Store, Product } from "../types/store";
export function MerchantWelcome() {
  return (
    <section className="merchant-welcome">
      <span className="eyebrow">WELCOME TO EYN</span>
      <h1>Let’s open your first store.</h1>
      <p>
        Start with your store details. Add products, make it yours, then publish
        when you’re ready.
      </p>
      <div className="stats">
        {[
          ["1", "Create your store", "Choose a name, URL and currency."],
          [
            "2",
            "Build your collection",
            "Add products, prices and available stock.",
          ],
          [
            "3",
            "Make it yours",
            "Preview your design and publish from settings.",
          ],
        ].map(([step, title, copy]) => (
          <Card key={step}>
            <span>Step {step}</span>
            <h2>{title}</h2>
            <p>{copy}</p>
          </Card>
        ))}
      </div>
      <Link className="button button--primary" href="/stores/new">
        Create your first store →
      </Link>
      <p className="field-help">
        You can save your store as a draft and continue later.
      </p>
    </section>
  );
}
export function StoreSetup({
  store,
  products,
}: {
  store: Store;
  products: Product[];
}) {
  const root = `/stores/${store.id}`;
  const steps = [
    {
      done: true,
      label: "Create your store",
      description: "Your name, URL and currency are saved.",
      href: `${root}/settings`,
    },
    {
      done: !!store.description.trim(),
      label: "Introduce your business",
      description: "Tell customers what your store is about.",
      href: `${root}/settings`,
    },
    {
      done: products.some((p) => p.published && p.inventory > 0),
      label: "Prepare a product for sale",
      description: "Add a product, set stock and make it visible.",
      href: `${root}/products`,
    },
    {
      done: Object.keys(store.storefrontConfig || {}).length > 0,
      label: "Customize your storefront",
      description: "Optional: use the default design or apply your own theme.",
      href: `${root}/editor`,
    },
    {
      done: store.published,
      label: "Publish your storefront",
      description: "Review your store and publish from settings when ready.",
      href: `${root}/settings`,
    },
  ];
  return (
    <Card className="checklist">
      <h2>Store setup</h2>
      <p>Suggested next steps — your saved progress stays with this store.</p>
      {steps.map((step, i) => (
        <Link href={step.href} key={step.label}>
          <span className={step.done ? "complete" : ""}>
            {step.done ? "✓" : i + 1}
          </span>
          <div>
            <strong>{step.label}</strong>
            <p>{step.description}</p>
          </div>
          <span aria-hidden="true">→</span>
        </Link>
      ))}
    </Card>
  );
}

const merchant = (
  process.env.NEXT_PUBLIC_MERCHANT_URL || "http://localhost:3000"
).replace(/\/$/, "");
export default function Landing() {
  return (
    <main>
      <header>
        <a className="brand" href="/">
          EYN<span style={{ color: "#b8955d" }}>.</span>
        </a>
        <nav aria-label="Main">
          <a href="#benefits">Why EYN</a>
          <a href="#pricing">Pricing</a>
          <a href={`${merchant}/login`}>Sign in</a>
          <a className="button" href={`${merchant}/login`}>
            Create your store ↗
          </a>
        </nav>
      </header>
      <section className="hero">
        <div>
          <span className="eyebrow">Your idea. Your business.</span>
          <h1>
            A beautiful home
            <br />
            for what you sell.
          </h1>
          <p>
            EYN brings your storefront, products and orders together. Make your
            store feel like you, then give customers a simple way to shop.
          </p>
          <div className="actions">
            <a className="button" href={`${merchant}/login`}>
              Create your store ↗
            </a>
            <a href="#preview">Take a look ↓</a>
          </div>
        </div>
        <div className="panel" id="preview">
          <span className="muted">Illustrative storefront preview</span>
          <div className="row">
            <strong>Studio goods</strong>
            <span>Collection · Bag</span>
          </div>
          <h2>Everyday, thoughtfully made.</h2>
          <div className="preview">
            <div className="product" aria-hidden="true">
              ◒
            </div>
            <div className="row">
              <strong>Everyday bowl</strong>
              <span>12,000 MMK</span>
            </div>
          </div>
          <p className="muted">
            Your colors, typography and products. One storefront that feels
            yours.
          </p>
        </div>
      </section>
      <section id="benefits">
        <span className="eyebrow">Less juggling. More building.</span>
        <h2>From your first product to your next order.</h2>
        <div className="grid">
          {[
            [
              "Make it yours",
              "Customize your storefront with the existing theme editor and see changes in preview before applying them.",
            ],
            [
              "Keep products organized",
              "Manage your catalog, prices and inventory from your merchant workspace.",
            ],
            [
              "Stay on top of orders",
              "Give customers a checkout flow and manage incoming orders in one place.",
            ],
          ].map(([title, copy]) => (
            <article className="panel" key={title}>
              <h2>{title}</h2>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="panel">
        <span className="eyebrow">Your merchant workspace</span>
        <h2>A clear view of your day.</h2>
        <p className="muted">
          Illustrative product and order management preview — sample data.
        </p>
        <div className="row">
          <strong>Products</strong>
          <span>Inventory</span>
        </div>
        <div className="row">
          <span>Everyday bowl</span>
          <span>24 in stock</span>
        </div>
        <div className="row">
          <strong>Orders</strong>
          <span>Status</span>
        </div>
        <div className="row">
          <span>Sample order #001</span>
          <span>Pending</span>
        </div>
      </section>
      <div
        className="grid"
        style={{ gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}
      >
        <section className="panel" id="pricing">
          <span className="eyebrow">Pricing</span>
          <h2>Built to grow with you.</h2>
          <p>Plans and pricing will be announced before launch.</p>
        </section>
        <section className="panel">
          <span className="eyebrow">Contact & support</span>
          <h2>We’re building your support home.</h2>
          <p>Support channels and contact details are coming soon.</p>
        </section>
      </div>
      <footer>
        <div className="actions">
          <strong>EYN</strong>
          <span className="muted">
            Everything you need. For everything you’re building.
          </span>
          <a href={`${merchant}/login`}>Start building ↗</a>
        </div>
      </footer>
    </main>
  );
}

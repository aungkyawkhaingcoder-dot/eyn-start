# Storefront and checkout

The public storefront lives at `/shop/:slug` in `apps/merchant`. It uses modular storefront components, HeroUI, a guest Axios instance, ahooks requests and Legend-State v2 subscribers. The catalog itself does not subscribe to cart changes. Each cart row, count and total subscribes independently.

## Running locally

1. Back up the database and review `apps/api/prisma/migrations/20260928000100_storefront_checkout/migration.sql`.
2. Run `pnpm db:deploy` against the intended development database, then `pnpm --filter @eyn/api exec prisma generate`.
3. Start the API and merchant app with `pnpm dev`.
4. In the merchant workspace, publish a store and products. Add a category and the `featured` tag if desired.
5. Open `/shop/<store-slug>`, add products, check out as a guest and view the result under the store's **Orders** navigation item.

The migration is prepared and tested independently; it is not automatically applied to your configured database by the implementation. Keep the existing `NEXT_PUBLIC_API_URL` and allow the merchant origin in the API's CORS configuration.

## Data migration

`Product` is the active product model for store management, storefront and orders. `storeId` is nullable only to preserve unassigned historical products/orders. New storefront products and orders always have a store. Existing `StoreProduct` rows are copied into `Product`, with a unique `legacyStoreProductId` mapping. Their new IDs may differ. The original table is retained as an archive; do not write through the old model or roll back application code without reconciling data.

Category and Tag now have optional store ownership for historical compatibility. New merchant entries are store-scoped. Taggable retains its original polymorphic fields and gains a product foreign key for new product associations. Historical polymorphic tags are retained unchanged; they are not silently assigned to a store.

Existing order lines are backfilled with current product names/prices because historical snapshots cannot be recovered. New order lines always store their purchase-time name and unit price. Existing product prices are rounded to two decimal places when converting Float to Decimal; review out-of-range legacy prices before deploying.

## Orders

- `POST /api/v1/storefront/:slug/orders`: JSON guest checkout with a required `Idempotency-Key` (16–80 letters, digits, underscores or hyphens).
- `GET /api/v1/stores/:storeId/orders?page=1`: owner-only, 30 orders per page.
- `PATCH /api/v1/stores/:storeId/orders/:id`: owner-only status update.

Checkout accepts `customerName`, `phone`, `address`, optional `notes`, and `items: [{ productId, quantity }]`. There are at most 50 distinct products and 999 units per line. The server ignores submitted prices/totals, requires an active published store/product, computes Decimal totals, stores snapshots and atomically decrements inventory in a serializable transaction. Any line failure rolls back the whole order.

Reusing a key with the same normalized request returns the same receipt. Changed input with an existing key returns 409. The frontend retains an uncertain request in session storage and retries its original payload/key after a connection failure. Cart quantities persist in local storage by store ID; customer details are only temporarily retained in session storage for recovery and removed after success or a definitive failure.

Status transitions: PENDING → CONFIRMED → COMPLETED, or PENDING/CONFIRMED → CANCELLED. Cancellation restores stock once. Completed/cancelled orders cannot be reopened. Best sellers use summed quantities from COMPLETED orders only; the section is hidden until qualifying orders exist. Merchant-selected products use the `featured` tag, not fabricated sales counts.

No payment is collected or marked paid. Totals cover products only. Checkout explicitly tells customers that delivery charges and arrangements will be confirmed by the store. There is no payment gateway, refund, tax or shipping-rate calculation in this version.

## Appearance and future extensions

Store settings support HTTPS logo/cover URLs and EYN light/dark presets, independently of the merchant dashboard theme. Scoped CSS variables drive colors; buttons use 8px radius. Product images and logos preserve their aspect ratios. The default preset is EYN light. A full theme editor with draft/preview/publish, custom colors/fonts and AI suggestions is deferred. File uploads and product variants are also not provided by the current schema/UI.

The existing Post schema remains unchanged for a later blog feature. Before adding public blog routes, add store ownership and publication controls; do not expose historical global posts automatically.

## Verification

- `pnpm test`: API regression, checkout logic and an isolated PGlite PostgreSQL migration test. No configured database is used by these tests.
- `pnpm --filter @eyn/merchant exec playwright test`: browser tests with intercepted API fixtures, including mobile layout, cart persistence/isolation and retry idempotency.
- `pnpm build`: both production builds.

Browser fixtures verify the UI/transport contract, not a live deployment. A real database migration and a manual store → checkout → merchant-order smoke test remain deployment steps.

Component references: [Legend-State React API](https://legendapp.com/open-source/state/v2/react/react-api/) and [HeroUI Button](https://heroui.com/en/docs/react/components/button).

### Storefront editor

Merchant owners can open `/stores/:id/editor` to edit bounded plain-text copy,
section visibility, and seven color roles. Empty copy uses the generic storefront
defaults. Color harmonies are generated locally (no AI or external image service).
Contrast feedback uses the WCAG relative luminance formula and a 4.5:1 text target;
it is advisory. Custom colors override light/dark defaults; Reset colors applies
the selected theme's palette.

Configuration is stored in `Store.storefrontConfig` (JSONB) via the existing
owner-scoped store update endpoint. Omitted config is preserved for older clients;
an explicit empty object resets it. Migration: `20260929000100_storefront_editor`.
The public endpoint returns config only for eligible published stores. Preview
changes remain local until saved, with checkout and cart persistence disabled.
Logo upload, background removal, automatic logo recoloring, AI palette suggestions,
and section drag-and-drop are not included in this version.

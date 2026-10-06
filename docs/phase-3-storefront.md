# Phase 3: shared public storefront

## Boundaries

- `apps/storefront` (`@eyn/storefront-app`, port 3003) serves `/shop/[slug]`.
- `apps/merchant` retains its editor and original `/shop/[slug]` compatibility route.
- `packages/storefront` owns the single public renderer, cart, checkout, published-store loader and CSS. Neither app imports source from the other app.
- `packages/theme` owns the existing theme fields, tokens, font loading, background and design functions. `normalizeStorefrontConfig` adds an in-memory version/default-template boundary without modifying stored JSON or resetting legacy styles. The nested future configuration format is not written yet; introducing it will require an explicit version adapter.
- `packages/contracts` is the shared store/product/checkout type boundary. Merchant imports remain supported through re-exports.

There is one template (`default`). Public copy is plain text. Only the merchant wrapper injects `EditableCopy`; the public bundle never imports the editor or draft store. Legend state in the public package is cart state, not merchant draft state.

## Published data

Both public routes request only `GET /api/v1/storefront/:slug`. The existing API requires a published store, an ACTIVE owner, and published ACTIVE products. There is no editor-draft fallback. The current backend still stores a single published configuration; Apply on a published store updates it immediately. Persistent draft revisions are a separate future change.

## Run and verify

`pnpm dev:storefront` runs port 3003; `pnpm dev:platform` includes it with the other apps.

Configure `apps/storefront/.env.local` using `.env.example`. `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_MERCHANT_URL` are build-time values; set the merchant URL in production so owner checkout errors link to the correct editor. Explicit API `CORS_ORIGINS` must include the storefront origin for credentialed checkout. Local defaults now include port 3003.

- `pnpm typecheck:platform`
- `pnpm test`
- `pnpm --filter @eyn/merchant test:storefront`
- `pnpm test:public-storefront` (same public regression tests on the extracted app, plus published/draft boundary tests)
- `pnpm --filter @eyn/storefront-app build`

Cart localStorage and pending checkout sessionStorage are origin-specific. Moving an existing public domain to another origin does not transfer browser carts. Existing merchant-origin routes remain available during migration. Production routing/domain cutover and API cookie behavior across deployed domains belong to the later routing/security phases; no deployment or database migration is applied here.

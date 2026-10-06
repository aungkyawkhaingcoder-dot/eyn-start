# Phase 2: landing and admin foundation

The merchant editor and public `/shop/[slug]` stay in `apps/merchant`. No storefront configuration or database migration changes are made in this phase.

## Run

- `pnpm install --frozen-lockfile`
- `pnpm dev:platform`: API (8080), merchant (3000), landing (3001), admin console (3002).
- Or use `pnpm dev:landing` and `pnpm dev:admin` separately.
- `pnpm typecheck:platform` checks API and all three frontends.
- `pnpm build:platform` builds all apps; start each app separately with its package `start` script.
- `pnpm test:platform` checks landing and admin browser flows with mocked API responses. `pnpm test` runs API tests; `pnpm --filter @eyn/merchant test:storefront` runs storefront tests.

Copy the new apps' `.env.example` to `.env.local` as needed. These NEXT_PUBLIC URLs are build-time configuration. The default local API origins include port 3002. If `CORS_ORIGINS` is explicitly configured, add `http://localhost:3002` and retain the merchant origin. Use the same hostname consistently, not localhost mixed with 127.0.0.1. Production origins/cookie deployment need validation in the later domain/security phases.

## Landing

Marketing, sample storefront and catalog/order previews, merchant entry CTAs, and explicitly labeled pricing/support placeholders. Both CTAs enter the existing merchant authentication flow. No fabricated live statistics or published store data.

## Admin

Sign in with an existing verified email ADMIN account. No new administrator creation or self-promotion flow. The browser uses the shared auth transport and API cookies, including existing session rotation. `GET /api/v1/admin/session` is behind existing authentication and ADMIN middleware, additionally rejects non-ACTIVE administrators, returns only id/role/status and disables caching. The frontend access gate is not an authorization boundary: future data endpoints must independently enforce these policies.

Merchant/store lists, approval/suspension, publication, metrics, support notes and audit logs are clearly labeled foundations, not operational controls. No fake counts or destructive actions. Sign out uses the existing shared API session and consequently also signs out the merchant app using that session.

The legacy `/api/v1/admin/user` response is unchanged for compatibility; its full-user serialization remains an identified security follow-up and is not used by this console. Phase 2 is not production approval for that endpoint.

## Next boundary

Phase 3 should introduce a backward-compatible theme normalizer and public renderer before moving `/shop/[slug]`. Keep the editor in merchant and never expose local drafts. Persistent draft/publication revisions, platform moderation enforcement and audit persistence need explicit backend/schema work; no migrations are introduced by these scaffolds.

# EYN workspace

One pnpm workspace for the API, merchant application and reusable frontend packages.
Use Node 24 and pnpm 10.2.1. The repository folder is still `prisma-7`.

```text
apps/api          Express, Prisma, authentication, store API and tests
apps/merchant     Next.js merchant dashboard and /shop/[slug] storefront
packages/auth     Shared auth forms, Google sign-in, hooks, Axios and types
packages/ui       EYN theme, HeroUI styling and reusable Field component
deploy            Separate online development/production environment templates
docs              API and architecture documentation
```

## Local development

```sh
pnpm install --frozen-lockfile
pnpm --filter @eyn/api exec prisma generate
pnpm dev
```

`pnpm dev` starts both apps. Use `pnpm dev:api` or `pnpm dev:merchant` to start
one. Merchant runs at http://localhost:3000; API uses its `PORT` environment setting.
PostgreSQL and Redis must be available separately.

The existing backend `.env` now lives at **apps/api/.env**, beside its
`.env.example`. Its values were preserved. Frontend overrides belong in
**apps/merchant/.env.local** (see its `.env.example`). Never put secrets into
`NEXT_PUBLIC_*` variables. Root `.env` is not loaded by the filtered app scripts.

```sh
pnpm test
pnpm typecheck
pnpm build
```

Prisma commands run from the API package, e.g.
`pnpm --filter @eyn/api exec prisma studio`. `pnpm db:deploy` applies migrations
only when explicitly run; moving the project does not require a database reset.

## Shared code

Merchant imports `@eyn/auth` and `@eyn/ui` using `workspace:*`. Next transpiles
their TypeScript source. There is no package publishing or separate package build.
The auth hook accepts an `onSignedIn` callback, so a future CRM can choose its own
destination instead of inheriting `/stores`. The API keeps token signing, secrets,
OTP verification and database operations server-side.

The UI package currently includes the existing EYN layout/auth/store styles as
well as theme tokens. Import Tailwind, HeroUI styles, then `@eyn/ui/theme.css`;
include the shared source directories in Tailwind scanning. See merchant's globals.css.

This migration preserves existing auth/store behavior and schema. Landing, CRM,
payment/order workflows and legacy Product consolidation are separate follow-ups.
The original Desktop `eyn-store` folder remains a backup; continue editing
`apps/merchant` here. Stop old frontend/backend dev processes before running the
new workspace so they do not compete for the same ports.

See [deployment instructions](deploy/README.md) and [store API](docs/stores.md).

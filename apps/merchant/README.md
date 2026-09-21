# EYN — Everything You Need

Next.js App Router workspace application. Stack: TypeScript, pnpm, HeroUI v3,
Tailwind v4, ahooks useRequest, Axios, Zustand and react-hot-toast.

## Start

```sh
pnpm install --frozen-lockfile
pnpm dev:merchant
```

Run these commands from the repository root. Open http://localhost:3000. Backend defaults to http://localhost:8080.
Copy `.env.example` to `.env.local` to change `NEXT_PUBLIC_API_URL`.
Never put backend secrets into NEXT_PUBLIC variables.

Backend: `apps/api`. Run `pnpm db:deploy` for the additive
`20260921000100_add_stores` migration, then `pnpm dev`. Existing auth needs
PostgreSQL / Prisma Accelerate and Redis available.
Backend CORS must include http://localhost:3000. Google web client authorized
JavaScript origins must also include http://localhost:3000. Google Client ID
stays on the backend. Existing email/phone OTP limits still apply.

## Included

- Email/phone registration, OTP verification, login, Google login, logout.
- Merchant store list, create, settings and publish/unpublish.
- Store-scoped product create/edit/delete, search, inventory and draft visibility.
- Public `/shop/[slug]` catalog showing only published stores/products.
- Light/dark EYN palette, supplied transparent logos, responsive navigation.
- HeroUI Button (`isPending` + Spinner), Card, Chip, Switch, Tabs, TextField,
  Input, TextArea, Label and FieldError. Buttons use 0.25rem radius.
- Zustand persists theme only, sidebar is transient. No auth tokens in storage.
- useRequest caches reads by user/store; mutations clear cache and refresh data.
  Logout/login clear caches. Axios sends HttpOnly cookies without mobile headers.
- toast.promise for save/delete/logout. No mutation auto-retries.

## Structure

- `src/app`: route composition and EYN global theme
- `src/components`: HeroUI forms, shell, store list, catalog and workspace
- `src/hooks`: useRequest workflows, mutations and auth flows
- `src/services`: typed API functions
- `src/lib`: shared Axios, Google SDK loader
- `src/stores/useUiStore.ts`: Zustand presentation state
- `src/types`: API contracts
- `public/brand`: original EYN logo assets

## Scope

Each store currently has one owner; staff roles/invitations are future work.
StoreProduct is the new tenant-scoped catalog; the old Product/Order models are
not migrated or used. Prices use Decimal strings. Currency changes relabel
existing amounts and do not convert them. Product images use HTTPS URLs;
file upload/storage is not included. Checkout, payments, fulfillment, analytics,
custom domains, and account linking are not implemented. Counts reflect real
store data; no fabricated sales figures or demo API fallback.

## Validation

`pnpm build` checks TypeScript and produces the Next.js production build.
Backend `pnpm test` includes ownership isolation, input validation and public
visibility query tests. Real browser OAuth and end-to-end DB writes require
running services and the migration. See backend `docs/stores.md` for API details.

References: https://heroui.com/en/docs/react/getting-started/frameworks
https://heroui.com/en/docs/react/components/button

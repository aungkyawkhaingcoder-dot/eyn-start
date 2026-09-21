# EYN API

Express 5, TypeScript, Prisma 7 and PostgreSQL. Part of the root pnpm workspace.
Use Node 24 and install dependencies from the repository root.

```sh
pnpm dev:api
pnpm --filter @eyn/api build
pnpm test
pnpm --filter @eyn/api exec prisma studio
```

Configuration lives in `apps/api/.env`; see `.env.example` here. Prisma config,
schema, migrations, source and tests stay together in this app. Compiled output
is `apps/api/dist`. Root scripts use this app's working directory for dotenv
and Prisma resolution.

Email/password, phone/password and Google authentication remain server-side,
including token signing and refresh rotation. Shared browser forms/hooks live
in `packages/auth`; this API does not import that frontend package.

See [auth documentation](src/auth/README.md), [store API](../../docs/stores.md)
and [deployment](../../deploy/README.md). No schema migration is needed for the move.

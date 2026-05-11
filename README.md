# Prisma-7

Node.js and TypeScript REST API built with Express, Prisma 7, and PostgreSQL.

## Features

- Express 5 API server
- TypeScript source with compiled output in `dist/`
- Prisma 7 client generated to `src/generated/prisma`
- PostgreSQL support through `@prisma/adapter-pg`
- Prisma Accelerate support for `prisma://` and `prisma+postgres://` URLs
- User CRUD endpoints
- Common API middleware: CORS, Helmet, compression, Morgan logging, JSON parsing, and rate limiting
- Centralized Express error handler

## Project Structure

```text
prisma-7/
|-- prisma/
|   `-- schema.prisma          # Prisma datasource, generator, and models
|-- src/
|   |-- app.ts                 # Express app setup and middleware
|   |-- index.ts               # Server entry point
|   |-- generated/prisma/      # Generated Prisma client
|   |-- lib/
|   |   `-- prisma.ts          # Prisma client setup
|   |-- middleware/
|   |   |-- check.ts           # JWT auth middleware
|   |   `-- raterLimiter.ts    # Rate limiting middleware
|   `-- routes/
|       `-- userRoutes.ts      # User CRUD routes
|-- package.json
|-- pnpm-lock.yaml
|-- prisma.config.ts
`-- tsconfig.json
```

## Prerequisites

- Node.js 18 or newer
- pnpm
- PostgreSQL database, or a Prisma Accelerate/Postgres connection URL

## Environment Variables

Create a `.env` file in the project root:

```env
PORT=4000
DATABASE_URL="postgresql://username:password@localhost:5432/database_name?schema=public"
JWT_SECRET="replace-with-a-secure-secret"
```

`DATABASE_URL` is required. The app supports regular PostgreSQL URLs and Prisma Accelerate URLs that start with `prisma://` or `prisma+postgres://`.

## Installation

```bash
pnpm install
```

Generate the Prisma client:

```bash
pnpm prisma generate
```

If you need to create or update the database schema locally, run:

```bash
pnpm prisma migrate dev
```

## Development

Start the development server:

```bash
pnpm dev
```

The server listens on `http://localhost:4000` by default, or the value configured in `PORT`.

## Build and Run

Build the project:

```bash
pnpm build
```

Start the compiled server:

```bash
pnpm start
```

## Scripts

| Script | Description |
| --- | --- |
| `pnpm dev` | Start the development server with Nodemon |
| `pnpm build` | Generate the Prisma client without the engine and compile TypeScript |
| `pnpm start` | Run the compiled server from `dist/index.js` |
| `pnpm test` | Placeholder test command |

## API Routes

All user routes are mounted under `/api/users`.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/users` | List all users |
| `GET` | `/api/users/:id` | Get one user by ID |
| `POST` | `/api/users` | Create a user |
| `PUT` | `/api/users/:id` | Update a user |
| `DELETE` | `/api/users/:id` | Delete a user |

Example create request:

```bash
curl -X POST http://localhost:4000/api/users \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"user@example.com\",\"name\":\"Example User\"}"
```

## Database Models

The Prisma schema defines these models:

- `User`: `id`, `email`, `name`, and related `posts`
- `Post`: `id`, `title`, `content`, `published`, and `author`
- `Shop`: `id`, `name`, and related `products`
- `Product`: `id`, `name`, `price`, and related `shop`

## Middleware

- `src/middleware/raterLimiter.ts` limits each IP to 100 requests per 15 minutes.
- `src/middleware/check.ts` verifies JWT bearer tokens and attaches `userId` to the request.

Note: the current user CRUD routes are registered before the `check` middleware in `src/app.ts`, so they are publicly reachable unless the route registration order is changed.

## License

ISC

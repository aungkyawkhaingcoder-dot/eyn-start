# Online development and production

Both environments run compiled code with NODE_ENV=production. APP_ENV identifies
development versus production. Laptop use remains APP_ENV=local, NODE_ENV=development.
Each server has its own checkout/release and its own .env, or host-injected variables.
There is no automatic .env.development/.env.production loading. Existing injected
variables take precedence over .env. Never copy development secrets/data to production.

## Before deployment

Provision separate development and production backend services, databases/database
credentials and Redis instances/credentials. Use HTTPS for both frontend and API.
Example addresses: dev.yourdomain.com + api-dev.yourdomain.com, and yourdomain.com +
api.yourdomain.com. Domains, hosting and DNS have NOT been provisioned by this change.
Private Redis/DB endpoints must not be publicly exposed. Restrict the dev service to
your team/testers using hosting access controls, VPN or a protected gateway.

Copy development.env.example or production.env.example to .env ON THE CORRESPONDING
SERVER, replacing every placeholder. Do not overwrite the existing local .env.
Keep real env files out of Git and use distinct JWT secrets, Redis prefixes and Resend
keys. A separate prefix is naming isolation, not a security boundary. Development
email should use test recipients or a dedicated verified sending subdomain.

## Build and migrate

Use the Node version tested by this repository (currently Node 24) and pnpm from
package.json. On dev first:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm db:deploy
pnpm start:dev-server
```

On production deploy the SAME tested commit/artifact, configure the production .env,
back up the production database, apply reviewed migrations once per deployment and
start with `pnpm start:production`. Do not run migrate reset or migrate dev against
production. Review existing migration history before first deploy; the commands
above have not been executed against either hosted database by this setup.
Use your hosting process manager or PM2 to keep the process running. Service-level
resource sizing and deployment automation depend on the chosen host.

## Browser and proxy configuration

CORS_ORIGINS is a comma-separated list of EXACT frontend origins, with no trailing
slash or URL path. Hosted deployments require HTTPS origins. Native/mobile clients
without Origin remain supported. CORS is not authentication or CSRF protection.
Browser clients must send credentials (cookies) with API requests.

COOKIE_SAME_SITE=lax suits HTTPS frontend/API subdomains under the same site.
If the frontend is on a different site, choose none (Secure cookies are required),
account for browser third-party-cookie restrictions, and add appropriate CSRF
protection for cookie-authenticated mutations before exposing that topology.
Cookies remain host-only, so api-dev and api cookies do not overwrite one another.

TRUST_PROXY_HOPS defaults to 0 (disabled). Use 1 only when every request comes through
one trusted reverse proxy and the backend cannot be reached directly by users.
An incorrect setting can allow forged client IPs and defeat IP rate limiting.
The current rate limiter uses per-process memory: use a shared limiter store before
relying on a cluster-wide IP quota. Refresh coordination already uses shared Redis.

## Verify and operate

GET /healthz is a process liveness endpoint, not a DB/Redis readiness check. Verify
login, browser cookies, mobile token responses, refresh, logout and a protected API
in each deployment. Check that test accounts only exist in the dev database. Keep
logs free of secrets, configure backup/restore and alerts, and restart all workers
after env changes. Do not treat this preparation as a completed hosted deployment.

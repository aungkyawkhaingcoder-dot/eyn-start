# Auth module

- `tokens.ts`: JWT lifetimes, signing, claim validation and token errors. Refresh JWTs have unique `jti` values even when issued within one second.
- `transport.ts`: browser cookies, mobile headers and login responses.
- `session.ts`: database-backed refresh validation, session creation and rotation.
- `../middleware/auth.ts`: authenticate once, refresh browsers when needed, continue once.
- `../ControllerHandler/authHandlers.ts`: registration/OTP/login/logout/refresh orchestration.
- `../controller/authController.ts`: existing request-validation wiring.

## Client contract

Browser clients send cookies. Expired/missing access cookies trigger rotation in middleware. Development cookies use SameSite=Lax with Secure=false; production retains SameSite=None with Secure=true. Cookie-authenticated deployments need an appropriate CSRF defense, particularly with SameSite=None.

Mobile clients set `x-platform: mobile`, `Authorization: Bearer <accessToken>` and `x-refresh-token: <refreshToken>` on protected requests. This preserves the existing refresh-token validation on every request; it is not an access-token-only API. Login and password confirmation return token pairs in JSON for mobile, cookies for browsers.

Use `POST /api/v1/refresh-token` with `x-refresh-token` for mobile refresh. The previous GET route remains for compatibility; migrate clients to POST. Missing/expired access tokens return 401 with `error: Error_AccessTokenExpired`. Refresh once across concurrent client requests, save both tokens, and retry each original request at most once. The refresh request itself must bypass that interceptor.

## Reuse

Copy this folder, the middleware/handlers/validation and their utils dependencies. Adapt `services/authservices.ts` to your database. Required user fields are id, phone, password, status, errorLoginCount, updatedAt and randomToken; OTP handlers additionally require the OTP model. Set ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET to distinct secrets. Use Express 5 (async handler errors propagate), JSON parsing and cookie-parser before routes. Tests use `npm test` and substitute persistence without connecting to a database.

## Current limits

This refactor is not a full security audit or a multi-device session redesign.

- One refresh token is stored per user, in plaintext as before. A new login replaces other sessions. Per-device sessions, hashed token storage and refresh-family reuse detection need a schema change.
- Browser and mobile refresh now share a short-lived successor across processes with database compare-and-swap; see the strategy guide below. Redis loss, an expired grace window or an intervening login/logout can still reject an old cookie.
- Registration retains the existing fixed development OTP `123456`; no SMS delivery exists. Replace it with random OTP generation and delivery before production.
- OTP expiry and login-attempt dates still use updatedAt. Dedicated issuance/attempt timestamps and atomic attempt counters are separate work.
- Existing numeric password rules, OTP checks and FREEZE login policy are retained. Other status/role authorization policies are not added by this refactor.


## Browser/mobile concurrency: config နဲ့ နည်းလမ်းရွေးခြင်း

Both strategies require Redis. `.env.example` contains placeholders only; copy the new Redis settings into your existing `.env` without replacing your database URL or JWT secrets.

```env
AUTH_REFRESH_STRATEGY=redis
REDIS_URL=redis://127.0.0.1:6379
AUTH_REFRESH_PREFIX=prisma7-auth
```

To compare BullMQ, change only `AUTH_REFRESH_STRATEGY=bullmq` and restart the app. A typo fails startup. The default strategy is `redis`; REDIS_URL is required at startup. There is no silent fallback to an uncoordinated rotation.

If Docker is installed, start local development Redis with:

```sh
docker compose -f compose.redis.yml up -d
pnpm dev
```

The compose file binds Redis to localhost. Production Redis requires private access/ACLs and TLS where appropriate; use a dedicated instance/database and `noeviction`. Both strategies share encrypted token data and depend on Redis availability during rotation. This is PM2 process coordination, not support for a sharded Redis Cluster deployment.

### ဖတ်တဲ့အစီအစဉ်

```text
authMiddleware
  → resolveBrowserSession(refreshToken, needsRefresh)
      → rotation.authenticate() : JWT + DB session စစ်
      → config အလိုက် strategy တစ်ခုရွေး
          redis  → redisStrategy.refresh()
          bullmq → bullmqStrategy.refresh()
      → rotation.authenticate() : result ကို DB နဲ့ ပြန်စစ်
  → setAuthCookies()
  → next()
```

| File | တာဝန် |
| --- | --- |
| `refresh/config.ts` | Strategy, Redis URL, prefix နဲ့ timeout သတ်မှတ် |
| `refresh/browserSession.ts` | Connection/setup, strategy ရွေးခြင်း, HTTP timeout |
| `refresh/redisStrategy.ts` | Token တူရင် lock တစ်ခု၊ winner လုပ်နေချိန် ကျန် request စောင့် |
| `refresh/bullmqStrategy.ts` | Token တူရင် job တစ်ခု၊ request အားလုံး အဲဒီ result စောင့် |
| `refresh/rotation.ts` | Token pair တစ်စုံ ပြင်ဆင်၊ atomic DB update၊ result validation |
| `refresh/crypto.ts` | Token ပါတဲ့ data encrypt/decrypt၊ token ကို key နာမည်ထဲ မထည့်ရန် HMAC |

Redis mode reads the shared session first, acquires a per-token `SET NX PX` lock and calls `execute()`. Lock release compares the random owner in Lua; an expired owner cannot delete another owner's lock. B/C poll the committed pair instead of rotating again.

BullMQ mode creates a job ID derived from the old token. All PM2 processes use the same queue and job ID. Each process lazily starts a worker on its first queued refresh, so no separate worker command is required. B/C poll the same job/result. The queue contains encrypted input and only a completion marker as return value. Two attempts are allowed; retries reuse the prepared pair. Job retention (60 seconds/1000 jobs, lazy cleanup) does NOT extend authentication grace.

### Why the pair is prepared before the DB update

`execute()` stores one encrypted candidate pair with Redis SET NX, then replaces the old DB token with that exact candidate. Multiple executions converge on the same pair. A candidate alone grants no access: the database must already contain its refresh token before a request can use it.

If a worker commits the DB update and crashes before acknowledging the job, another request/attempt can recover the exact candidate while its TTL remains valid. This avoids minting a different successor on retry. The DB compare-and-swap remains the final guard against a concurrent logout/new login.

### Limits and timing

- Shared pair grace: **3 seconds from preparation**, never extended by reads. This intentionally permits a valid old refresh token to obtain its current successor during that window, including a stolen old token. It is a security/usability tradeoff, not strict replay rejection.
- HTTP wait: **5 seconds**; Redis command/connect timeout: **1 second**; direct Redis lock: **6 seconds**. Source constants are in `config.ts`; keep clocks synchronized across hosts.
- Grace is enforced both by Redis TTL and the encrypted timestamp. DB delays consume grace. If Redis data is lost or grace elapses after DB commit but before the browser gets the result, reauthentication may still be necessary. There is no cross-database transaction between Redis and PostgreSQL.
- A 503 `Error_RefreshUnavailable` means infrastructure/timeout, not automatically logout. Invalid/revoked sessions still return 401. A current valid session does not need a Redis command.
- A timeout ends the HTTP wait; it cannot cancel an already-running DB command. A job that starts after its deadline refuses to rotate. A running operation can finish after the caller times out.
- New login/logout/phone changes are checked against the DB before sharing a result. As with ordinary middleware authentication, revocation after that check cannot cancel a controller that has already started.
- Both strategies coordinate browser auto-refresh and the mobile refresh endpoint. Mobile protected APIs never auto-rotate or set cookies; clients still refresh and retry.

### PM2

All app processes must share REDIS_URL, AUTH_REFRESH_PREFIX, JWT secrets and strategy. Use a different prefix for each application/environment. Restart all processes together when changing strategy. `src/index.ts` handles SIGINT/SIGTERM and closes BullMQ/Redis after HTTP requests drain; set PM2 `kill_timeout` above 10000 ms (for example 12000).

### Verification

```sh
pnpm test
pnpm exec tsc --noEmit
TEST_REDIS_URL=redis://127.0.0.1:6379 pnpm test:refresh:integration
```

Unit tests cover claims, middleware continuation, expired access, mobile shared rotation, browser shared results, grace expiry, revoked/replaced sessions and recovery after DB commit. Integration tests launch **three separate Node processes**, use real Redis/BullMQ and send concurrent requests through the actual middleware. They use a Redis-backed atomic fake user repository instead of the application's PostgreSQL database and clean only their unique test prefixes. PostgreSQL end-to-end tests and a real PM2 deployment are still separate verification steps.

Implementation references: [Redis lock ownership](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/) and [BullMQ job ID deduplication](https://docs.bullmq.io/guide/jobs/job-ids).

### Function-based setup (class မသုံးထားပါ)

- `createSharedRotation(...)` → `{ authenticate, execute }` functions ပြန်ပေးသည်။
- `createRedisRefreshStrategy(...)` → `{ refresh }` ပြန်ပေးသည်။
- `createBullMQRefreshStrategy(...)` → `{ refresh, close }` ပြန်ပေးသည်။
- `browserSession.ts` က config အလိုက် function တစ်ခုကိုခေါ်ပြီး `strategy.refresh(token)` နဲ့ သုံးသည်။

`create...` က setup တစ်ကြိမ်လုပ်တာဖြစ်ပြီး `refresh(token)` က request ရောက်ချိန်ခေါ်တာပါ။ `this`, `constructor`, `private`, `instanceof` တို့ကို ကိုယ်ရေးထားတဲ့ refresh code မှာ မသုံးတော့ပါ။ `new Redis`, `new Queue`, `new Worker` က library ရဲ့ API ဖြစ်လို့ ဆက်ရှိပါသည်။ Validation, TTL, locking, retry နဲ့ cleanup behavior မပြောင်းပါ။

## Mobile concurrency (iOS / Android)

`POST /api/v1/refresh-token` continues to read `x-refresh-token` and return JSON `{ message, accessToken, refreshToken }`. It now calls `resolveMobileSession(token, true)`, sharing the same Redis/BullMQ coordinator as browsers. Concurrent requests using the same old refresh token receive the same pair within the 3-second grace. No cookies are set.

Protected requests still send `x-platform: mobile`, `Authorization: Bearer <accessToken>` and `x-refresh-token`. Middleware calls `resolveMobileSession(token, false)` (validation only). If the access token is missing/expired, or the refresh token has a recent committed successor, it returns `401 Error_AccessTokenExpired`. This lets an in-flight old request retrieve the successor instead of incorrectly logging out. Outside grace, or after revocation, old tokens are rejected.

The mobile client should still share one refresh Promise, replace BOTH token headers on retries, and retry the original URL/method/payload at most once. Do not intercept the refresh endpoint itself. Backend coordination does not replay the original API or guarantee success under network failure. A 503 is temporary infrastructure failure, not proof the session was revoked. Old tokens cannot log out a successor session; use the newly stored refresh token for logout.

`browserSession.ts` retains its filename for compatibility, but its runtime is shared by both clients. Function-based setup and AUTH_REFRESH_STRATEGY selection are unchanged. One refresh token per user remains a limitation: browser/phone or two-phone independent sessions require a per-device session model.

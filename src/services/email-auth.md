# Email authentication

Phone flow နဲ့ ပုံစံတူ: register → verify OTP → confirm password → login.
Class မသုံးထားပါ။ Phone OTP `123456` ကို မပြောင်းထားပါ။ Email OTP က random 6 digits ဖြစ်သည်။

## Setup / migrations

Set RESEND_API_KEY, EMAIL_FROM (verified domain) and EMAIL_PROVIDER=resend in the existing .env. No email credentials are printed or committed. Redis config remains shared with existing auth.

Before using the new Prisma client against a database, apply the prepared migrations:

```sh
pnpm exec prisma migrate deploy
pnpm exec prisma generate
pnpm dev
```

These migrations were prepared, NOT applied to your database. The first adds phoneVerifiedAt; the second makes phone nullable, adds emailVerifiedAt and creates EmailOtp. Existing users retain null verification timestamps. An expression unique index on LOWER(email) prevents case-variant accounts; pre-existing case-insensitive duplicate emails must be resolved explicitly before migration (no accounts are merged automatically). User requires at least a phone or email. Email maximum length stays 70 characters to match the existing column.

## Endpoints

All endpoints are POST under `/api/v1/email`.

### 1. `/register`

```json
{ "email": "person@example.com" }
```

Returns `{ "message": "...", "email": "person@example.com", "token": "..." }` after Resend accepts the email. Calling again is resend. Save `token` for step 2. No OTP is returned in JSON. Email is trimmed/lowercased; Gmail dots/plus aliases are not rewritten.

### 2. `/verify-otp`

```json
{ "email": "person@example.com", "otp": "012345", "token": "TOKEN_FROM_REGISTER" }
```

Send OTP as a string to preserve zeros. Returns `{ "message": "...", "email": "...", "verifyToken": "..." }`. The OTP is consumed once. `token`/`verifyToken` are random 64-character hex strings; the example labels above are placeholders, not valid test values.

### 3. `/confirm-password`

```json
{ "email": "person@example.com", "password": "12345678", "token": "VERIFY_TOKEN_FROM_STEP_2" }
```

The input field stays named `token` like phone confirm-password; its value is the verification token from step 2. Password must be exactly 8 numeric characters, matching the current phone rule. Creates a user with phone=null and emailVerifiedAt set to the successful OTP verification time. Consumes proof and creates user in one transaction. Automatically starts a session: browser receives cookies; `x-platform: mobile` receives accessToken/refreshToken/expiresIn in JSON. User ID field is `userId`, like phone registration.

### 4. `/login`

```json
{ "email": "person@example.com", "password": "12345678" }
```

Requires an ACTIVE, email-verified user. Response transport matches phone login (`id` field). Six consecutive failed email password attempts freeze the user, counted atomically; successful login resets the count. Unlike the legacy phone daily-counter logic, email attempts do not reset based on updatedAt (unrelated token writes must not reset security limits).

### 5. `/logout`

POST `/api/v1/email/logout` reuses the same logout handler as `/api/v1/logout`. No request body is needed. Browsers send their auth cookies; mobile clients send `x-platform: mobile` and `x-refresh-token` with their current refresh token. The handler verifies the JWT and DB session, conditionally replaces the DB refresh token, and clears both auth cookies. Mobile clients should delete their locally stored tokens after success. Revoked tokens and their cached rotation results cannot authorize subsequent requests.

Mobile refresh continues to use POST `/api/v1/refresh-token`. Existing phone-bound refresh JWTs remain valid. Email-only refresh JWTs carry an email identity and it is checked against the current DB email, alongside user ID and current refresh token. Adding/changing a phone or changing the email invalidates that email-bound identity. This is not an account-linking or email-change feature: an existing unverified email account is not silently verified or merged through registration.

JWT payloads are signed, not encrypted: access tokens contain `id`, `iat`, `exp`; refresh tokens additionally contain `phone` (when present) or `email`, and `jti`. Passwords and OTPs are never included. Anyone holding a JWT can decode its payload; the signature is verified to detect tampering.

## Reading order

1. `routes/v1/emailAuth.ts`: endpoints.
2. `controller/emailAuthController.ts`: request validation wiring.
3. `ControllerHandler/emailAuthHandlers.ts`: handler steps, matching phone handler names.
4. `services/emailAuthServices.ts`: Prisma persistence and atomic checks.
5. `services/email/index.ts` → `providers/resend.ts`: email delivery.

## OTP rules

- OTP expiry: 2 minutes using explicit expiresAt, not updatedAt.
- Verification proof expiry: 10 minutes.
- Resend cooldown: 60 seconds; up to 3 send attempts per email per UTC day.
- Up to 5 verification attempts per email per UTC day (including wrong request-token attempts and successful verification attempts). Resend does not reset attempts that day.
- Resend invalidates previous OTP/proof. OTP is bcrypt-hashed; random request/proof tokens are SHA-256-hashed in DB.
- A failed send invalidates that challenge but retains quota/cooldown to limit abuse and ambiguous-send retries.
- Existing global IP limiter still applies. Its default in-memory store is per process; deploy a shared rate-limit store for cluster-wide IP enforcement. Per-email quotas/consumption are DB-backed.

Tests run the real handlers, validators, JWTs and bcrypt with mocked Prisma/Resend. They cover full registration/login, shared refresh for email-only users, bad/expired/used OTPs, resend invalidation, confirmation replay, delivery failures and login restrictions. They do not establish production email delivery or PostgreSQL locking behavior. No real email was sent.

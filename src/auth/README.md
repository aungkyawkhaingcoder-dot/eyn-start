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
- Rotation uses database compare-and-swap: only one concurrent refresh wins; other callers receive 401. It prevents competing token issuance but does not transparently recover parallel browser requests or a lost refresh response.
- Registration retains the existing fixed development OTP `123456`; no SMS delivery exists. Replace it with random OTP generation and delivery before production.
- OTP expiry and login-attempt dates still use updatedAt. Dedicated issuance/attempt timestamps and atomic attempt counters are separate work.
- Existing numeric password rules, OTP checks and FREEZE login policy are retained. Other status/role authorization policies are not added by this refactor.

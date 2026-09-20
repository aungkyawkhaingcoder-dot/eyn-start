# Auth Studio

React + TypeScript + HeroUI v3 + Tailwind v4 + Axios + ahooks, installed with pnpm.
HeroUI `Card`, `Tabs`, `TextField`, `Label`, `Input`, and `Button` are used in the UI.

## Run locally

From the repository root, keep the API running in one terminal:

```sh
pnpm dev
```

Run the frontend in another terminal:

```sh
pnpm --dir frontend install
pnpm --dir frontend dev
```

Open http://localhost:5173. The UI calls http://localhost:8080 by default.
If your API uses a different port, copy `frontend/.env.example` to `frontend/.env`,
set `VITE_API_URL`, and restart Vite. Only public configuration belongs here;
never copy backend JWT secrets, database URLs, or Resend keys into the frontend.

The backend's `CORS_ORIGINS` must include `http://localhost:5173` (retain other
origins you need). For local HTTP, use `APP_ENV=local`, `NODE_ENV=development`,
and `COOKIE_SAME_SITE=lax`. Use `localhost` consistently rather than mixing it
with `127.0.0.1`. Backend `.env` has not been edited by this change.

## What to test

- Email / Phone → Create account → Send code → Verify → Set the existing
  API's 8-digit password. Proof tokens are carried between steps in memory.
- Resend after the displayed cooldown. Use the latest code; the server controls
  cooldowns and daily limits. Email sends a real email; phone currently uses
  the backend's fixed development code `123456`.
- Sign in, check protected API, and sign out. Protected API calls
  `GET /api/v1/admin/user` (currently returns the current user ID).
- Wait for access expiry, then send 3 parallel protected requests to exercise
  the existing browser rotation coordinator. PostgreSQL and Redis must be running.
- Google → Start Google sign-in → choose account. Configure the backend
  `GOOGLE_WEB_CLIENT_ID`, apply the Google migration if still pending, and add
  `http://localhost:5173` to that Google web client's authorized JavaScript origins.
  Google returns a nonce-bound token; the UI posts it with the challenge ID.
  See [backend Google setup](../src/auth/google/README.md).

This frontend tests **browser** transport, including mobile browsers. It never
sets `x-platform: mobile` and never reads HttpOnly tokens. Native mobile SDK flow
is separate. Browser refresh happens in middleware; `/refresh-token` is not
called by this UI because that endpoint expects a native refresh-token header.

No login state or proofs are persisted. Refreshing the page resets the form;
a valid cookie session can be rediscovered using Check protected API. The session
badge means last successful response, not continuous verification. Network errors
are shown without retrying mutations. Request history redacts sensitive fields
and retains at most 20 responses in memory.

## Reading order / checks

`src/main.tsx` → `src/App.tsx` (layout only).

- `components/`: AuthCard, CredentialForm, GoogleSignIn, SessionPanel, RequestHistory.
- `hooks/useCredentialAuth.ts`: email/phone OTP and password form state.
- `hooks/useGoogleAuth.ts`: Google challenge and callback lifecycle.
- `hooks/useSessionActions.ts`: protected checks, parallel checks, logout, health.
- `hooks/useWorkbench.ts`: shared session/notice state and ahooks `useRequest`.
  `manual: true` + `runAsync` manage loading/errors; a synchronous guard blocks
  duplicate submissions. No polling, caching, focus refresh, or automatic retry.
- `hooks/useRequestHistory.ts`: bounded, redacted request history.
- `services/authApi.ts`: named endpoints using the shared logged transport.
- `lib/axios.ts`: one Axios instance with baseURL, withCredentials, 30s timeout,
  and an error-normalizing response interceptor. It never redirects or retries.
- `lib/google.ts`: Google script loader; `lib/redact.ts`: sensitive-field masking.
- `types/auth.ts`: shared TypeScript response/state types.

Read a request as: component → feature hook → useRequest → auth service →
logged transport → Axios instance. Parallel checks run within one useRequest
operation so each of their three responses is retained in history.
Switching sign-in methods resets that form's transient proofs. Server-side OTP
limits remain authoritative. `src/style.css` styles the HeroUI components.

```sh
pnpm --dir frontend test
pnpm --dir frontend build
```

Build performs strict TypeScript checks before Vite. Tests mock responses; real
email delivery, DB/Redis rotation, and Google login require your running services.

References: [HeroUI setup](https://heroui.com/en/docs/react/getting-started/quick-start),
[Google GIS](https://developers.google.com/identity/gsi/web/reference/js-reference).

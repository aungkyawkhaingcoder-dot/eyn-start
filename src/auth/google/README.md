# Google Sign-In

Reading order: `routes/v1/googleAuth.ts` → `controller/googleAuthController.ts`
→ `ControllerHandler/googleAuthHandlers.ts` → `auth/google/verify.ts`
→ `services/googleAuthServices.ts` → `auth/transport.ts`.

This is Google ID-token sign-in (OpenID Connect). The frontend signs in with
Google, then exchanges its Google ID token for this application's session.
There is no backend authorization-code callback, Google API access, or stored
Google refresh token. App JWTs use the existing refresh rotation and logout.

## Setup

1. Apply the prepared migration with `pnpm db:deploy` against the intended database.
   This adds `OAuthAccount`, `OAuthChallenge`, and permits a null User password.
   Existing passwords are preserved. Run `pnpm build` to generate Prisma and build.
2. Configure the Google Cloud consent screen and create a **Web application** OAuth
   client. Add the frontend origin to its Authorized JavaScript origins, for
   example `http://localhost:3000`. Use separate clients for development and production.
3. Copy `GOOGLE_WEB_CLIENT_ID` from `.env.example` into the server's `.env` and set
   it to that client ID. Ensure `CORS_ORIGINS` includes the exact frontend origin.
   This ID-token flow does not use a client secret or an authorized redirect URI.
4. Restart the server. Hosted deployments need HTTPS and the existing cookie
   configuration appropriate to the frontend/API domains.

## Browser flow (desktop and mobile browsers)

Load Google's script `https://accounts.google.com/gsi/client` in the frontend and
provide an element with `id="google-button"`. After the script loads:

```js
const api = 'http://localhost:8080'; // Use your API's configured port / HTTPS URL.
const challengeResponse = await fetch(`${api}/api/v1/google/challenge`, {
  method: 'POST', credentials: 'include',
  headers: { 'Content-Type': 'application/json' }, body: '{}',
});
if (!challengeResponse.ok) throw new Error('Could not start Google login');
const challenge = await challengeResponse.json();

google.accounts.id.initialize({
  client_id: challenge.clientId,
  nonce: challenge.nonce,
  callback: async ({ credential }) => {
    const response = await fetch(`${api}/api/v1/google/login`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: credential, challengeId: challenge.challengeId }),
    });
    const result = await response.json();
    if (!response.ok) {
      // Display result.message, then start a fresh challenge/sign-in attempt.
      console.error(result.message);
      return;
    }
    // Logged in: app access/refresh tokens are in HttpOnly cookies.
    console.log(result.id);
  },
});
google.accounts.id.renderButton(document.getElementById('google-button'), {
  theme: 'outline', size: 'large',
});
```

Both endpoints require JSON and an allowed `Origin` for browsers. Browsers send
Origin automatically; Postman must set it explicitly and retain the challenge cookie.
The challenge expires after 5 minutes and is consumed once. Restart sign-in if it
expires. Starting another browser challenge replaces the previous challenge cookie.
Postman cannot fabricate a valid Google ID token; get one through the configured
Google client using the returned nonce.

## Native iOS / Android clients

1. Configure the Google native clients and intended ID-token audience(s). Set
   `GOOGLE_MOBILE_CLIENT_IDS` to the explicit allowed IDs, comma-separated.
   If Google supplies `azp`, that authorized-party client ID must also be listed.
2. POST `{}` to `/api/v1/google/challenge` with `x-platform: mobile` and JSON.
3. Start a Google sign-in flow that supports supplying the challenge's **nonce**.
   The resulting Google ID token must contain this exact nonce. Check the chosen
   native SDK's capabilities before integrating; an SDK flow without nonce support
   is not supported by this endpoint. Do not remove the server's nonce check.
4. POST `{ "idToken": "...", "challengeId": "..." }` to `/api/v1/google/login`
   with the same `x-platform: mobile` header and JSON.

The successful native response contains `id`, `message`, `accessToken`,
`refreshToken`, and `expiresIn`. Store tokens using the platform's secure storage.
Use the existing `POST /api/v1/refresh-token` with `x-platform: mobile` and
`x-refresh-token`, and existing `/api/v1/logout`. Browser responses do not expose
app tokens in JSON. An ordinary mobile browser follows the browser flow above.

## Identity and security behavior

- The official Google library verifies signature, issuer, audience, and expiry.
  The backend additionally requires verified email and the one-use nonce.
- `OAuthAccount(provider, subject)` identifies the user. Google `sub`, not email,
  is the stable identity. Login does not silently change the stored email.
- A matching existing email returns `409 Error_AccountLinkRequired`. Account
  linking is deliberately not implemented: use the original login method for now.
- New Gmail and Google Workspace identities can register. For external email
  domains without a Workspace `hd` claim, Google may not be authoritative for
  the mailbox; use email OTP registration/login instead. Adding Google to that
  existing account will need a separate authenticated linking flow.
- Challenge consumption, account creation, and session update share a database
  transaction, usable across PM2 processes. Google-only users have no password;
  email/password login rejects them. Suspended/non-ACTIVE users cannot sign in.
- The existing single-current-refresh-token-per-user behavior still applies.
  This change does not introduce independent sessions for multiple devices.

Tests verify signatures with local RSA fixtures, invalid claims, challenge
replay, browser/mobile transport, and account collision handling. Transaction
tests use a serialized database mock; real Google clients and PostgreSQL integration
must also be exercised before deployment. No live credentials are needed for tests.

References: [Google token verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token),
[GIS JavaScript reference](https://developers.google.com/identity/gsi/web/reference/js-reference),
[Google client setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).

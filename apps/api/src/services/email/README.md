# Verification email

```ts
import { sendVerificationEmail } from "../services/email";

await sendVerificationEmail(email, otp);
```

Adjust the relative import path for the caller. `otp` may be a six-digit string or number; use a string to preserve leading zeros.

## Setup

1. Create a Resend account and verify your sending domain using its DNS instructions.
2. Put `EMAIL_PROVIDER=resend`, `EMAIL_FROM=Your App <noreply@your-domain.com>` and your `RESEND_API_KEY` into the existing `.env`. Keep the API key private; do not put it in client code.
3. Restart the app. Configuration is checked when sending, so existing phone login does not need email credentials.

## Reading order

`sendVerificationEmail(email, otp)` in `index.ts` validates the input and builds the plain-text message, then calls `sendWithResend(message)` in `providers/resend.ts`. That file alone knows the Resend SDK. `types.ts` describes a provider-neutral message. For SES later, implement `sendWithSes(message)` and change the dispatch; the calling handler can stay the same. Unsupported provider settings fail instead of silently sending through Resend.

## Scope and handler responsibilities

This folder is the delivery service. Email register/verify/password/login endpoints are implemented separately; see ../../ControllerHandler/emailAuthHandlers.ts and ../email-auth.md. No actual email is sent during tests.

The email verification handlers generate a random OTP, store its hash and explicit expiry, enforce send/attempt limits and consume verification proof atomically. The message uses the existing `OTP_LENGTH` and `OTP_EXPIRY_MINUTES` constants; the handler must use the same expiry. Do not reuse the current phone handler's fixed development OTP for production. A successful send means Resend accepted the message, not that it reached the inbox or that the email address is verified.

Await this function and handle `Error_EmailConfiguration` / `Error_EmailSendFailed` (503). A provider error is not reported as success and is not exposed to the client. No automatic retries are added: a network failure can leave delivery uncertain. The email register endpoint handles explicit resends with a cooldown; ambiguous delivery failures invalidate that challenge without refunding its send quota.

Official setup: https://resend.com/docs/send-with-nodejs

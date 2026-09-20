import type { ApiCall, Provider } from "../types/auth";
// Named endpoints share the same transport, including sanitized request history.
export function createAuthApi(call: ApiCall) {
  const prefix = (provider: Exclude<Provider, "google">) =>
    provider === "email" ? "/api/v1/email" : "/api/v1";
  return {
    login: (
      provider: Exclude<Provider, "google">,
      body: Record<string, string>,
    ) => call(`${prefix(provider)}/login`, body),
    sendCode: (
      provider: Exclude<Provider, "google">,
      body: Record<string, string>,
      resend = false,
    ) =>
      call(`${prefix(provider)}/${resend ? "resend-otp" : "register"}`, body),
    verifyOtp: (
      provider: Exclude<Provider, "google">,
      body: Record<string, string>,
    ) => call(`${prefix(provider)}/verify-otp`, body),
    confirmPassword: (
      provider: Exclude<Provider, "google">,
      body: Record<string, string>,
    ) => call(`${prefix(provider)}/confirm-password`, body),
    googleChallenge: () => call("/api/v1/google/challenge", {}),
    googleLogin: (body: Record<string, string>) =>
      call("/api/v1/google/login", body),
    session: () => call("/api/v1/admin/user", undefined, "GET"),
    logout: () => call("/api/v1/logout", {}),
    health: () => call("/healthz", undefined, "GET"),
  };
}

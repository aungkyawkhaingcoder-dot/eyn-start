import { Button, Input, Label, TextField } from "@heroui/react";
import { useCredentialAuth } from "../hooks/useCredentialAuth";
import type { Workbench } from "../hooks/useWorkbench";
export function CredentialForm({
  provider,
  workbench,
}: {
  provider: "email" | "phone";
  workbench: Workbench;
}) {
  const {
    mode,
    step,
    identity,
    setIdentity,
    otp,
    setOtp,
    password,
    setPassword,
    wait,
    busy,
    reset,
    submit,
    run,
    sendCode,
  } = useCredentialAuth(provider, workbench);
  return (
    <>
      <div className="mode">
        <Button
          isDisabled={busy}
          className={mode === "login" ? "selected" : ""}
          onPress={() => reset("login")}
        >
          Sign in
        </Button>
        <Button
          isDisabled={busy}
          className={mode === "register" ? "selected" : ""}
          onPress={() => reset("register")}
        >
          Create account
        </Button>
      </div>
      {mode === "register" && (
        <ol className="steps">
          {["Contact", "Verify OTP", "Password"].map((label, i) => (
            <li key={label} className={i <= step ? "done" : ""}>
              <b>{i + 1}</b>
              {label}
            </li>
          ))}
        </ol>
      )}
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <TextField isRequired isDisabled={busy}>
            <Label>
              {provider === "email" ? "Email address" : "Phone number"}
            </Label>
            <Input
              required
              type={provider === "email" ? "email" : "tel"}
              value={identity}
              readOnly={mode === "register" && step > 0}
              maxLength={provider === "email" ? 70 : 12}
              pattern={provider === "phone" ? "[0-9]{5,12}" : undefined}
              autoComplete={provider === "email" ? "email" : "tel"}
              placeholder={provider === "email" ? "you@example.com" : "09…"}
              onChange={(e) => setIdentity(e.target.value)}
            />
          </TextField>
          {mode === "register" && step === 1 && (
            <TextField isRequired isDisabled={busy}>
              <Label>Verification code</Label>
              <Input
                autoFocus
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                autoComplete="one-time-code"
                placeholder="6-digit OTP"
              />
            </TextField>
          )}
          {(mode === "login" || step === 2) && (
            <TextField isRequired isDisabled={busy}>
              <Label>Password</Label>
              <Input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                inputMode="numeric"
                pattern="[0-9]{8}"
                minLength={8}
                maxLength={8}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                placeholder="8-digit password"
              />
              <small>The current API requires exactly 8 numbers.</small>
            </TextField>
          )}
          <Button className="primary" type="submit">
            {busy
              ? "Please wait…"
              : mode === "login"
                ? "Sign in →"
                : [
                    "Send verification code →",
                    "Verify code →",
                    "Create account →",
                  ][step]}
          </Button>
        </fieldset>
      </form>
      {mode === "register" && step === 1 && (
        <Button
          className="text-button"
          isDisabled={busy || wait > 0}
          onPress={() => run(() => sendCode(true))}
        >
          {wait > 0 ? `Resend available in ${wait}s` : "Send a new code"}
        </Button>
      )}
      {mode === "register" && step > 0 && (
        <Button
          className="text-button"
          isDisabled={busy}
          onPress={() => reset()}
        >
          Start over / change contact
        </Button>
      )}
      {provider === "phone" && (
        <p className="hint">
          Phone delivery is a development stub. Use OTP <strong>123456</strong>.
        </p>
      )}
    </>
  );
}

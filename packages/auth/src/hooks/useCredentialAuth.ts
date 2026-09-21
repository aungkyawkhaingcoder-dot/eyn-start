import { useState, useEffect, type FormEvent } from "react";
import type { Mode, ApiData } from "../types/auth";
import type { Workbench } from "./useWorkbench";
export function useCredentialAuth(
  provider: "email" | "phone",
  workbench: Workbench,
) {
  const { auth, run, setNotice, busy, activeAction } = workbench;
  const [mode, setMode] = useState<Mode>("login");
  const [step, setStep] = useState(0);
  const [identity, setIdentity] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [proof, setProof] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const wait = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const contact = { [provider]: identity.trim() };
  useEffect(() => {
    if (resendAt <= Date.now()) return;
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= resendAt) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendAt]);
  function reset(nextMode = mode) {
    setMode(nextMode);
    setStep(0);
    setIdentity("");
    setOtp("");
    setPassword("");
    setProof("");
    setNotice(null);
  }
  function signedIn(data: ApiData) {
    workbench.signedIn(data);
    setPassword("");
    setOtp("");
    setProof("");
    setStep(0);
    setMode("login");
  }
  async function sendCode(resend = false) {
    const data = await auth.sendCode(provider, contact, resend);
    setProof(data.token || "");
    setIdentity(
      (provider === "email" ? data.email : data.phone) || identity.trim(),
    );
    setOtp("");
    setStep(1);
    setNow(Date.now());
    setResendAt(Date.now() + 60000);
    setNotice({
      text:
        provider === "email"
          ? "Check your inbox (and spam folder) for the latest code."
          : "Development phone OTP: 123456. No SMS is sent.",
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    run(async () => {
      if (mode === "login")
        return signedIn(await auth.login(provider, { ...contact, password }));
      if (step === 0) return sendCode();
      if (step === 1) {
        const data = await auth.verifyOtp(provider, {
          ...contact,
          otp,
          token: proof,
        });
        setProof(data.verifyToken || "");
        setOtp("");
        setStep(2);
        setNotice({ text: "Verified. Choose your 8-digit password." });
        return;
      }
      signedIn(
        await auth.confirmPassword(provider, {
          ...contact,
          password,
          token: proof,
        }),
      );
    });
  }

  return {
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
    submitting: activeAction === "credentials",
    resending: activeAction === "resend",
    reset,
    submit,
    run,
    sendCode,
  };
}

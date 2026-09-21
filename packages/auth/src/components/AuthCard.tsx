"use client";
import { ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { Card } from "@heroui/react";
import { CredentialForm } from "./CredentialForm";
import { GoogleSignIn } from "./GoogleSignIn";
import type { Workbench } from "../hooks/useWorkbench";
export function AuthCard({ workbench }: { workbench: Workbench }) {
  const { notice, setNotice } = workbench;
  useEffect(() => {
    const url = new URL(window.location.href);
    const reason = url.searchParams.get("googleError");
    if (!reason) return;
    const messages: Record<string, string> = {
      cancelled: "Google sign-in was cancelled. You can try again.",
      existing:
        "This email address is already registered. Sign in using your original login method.",
      unavailable: "Your account is unavailable. Contact support.",
      invalid: "Google sign-in expired or could not be verified. Try again.",
      failed: "Google sign-in could not be completed. Try again.",
    };
    setNotice({ error: true, text: messages[reason] || messages.failed });
    url.searchParams.delete("googleError");
    window.history.replaceState(
      window.history.state,
      "",
      url.pathname + url.search + url.hash,
    );
  }, [setNotice]);
  return (
    <Card className="auth-card">
      <div className="card-heading">
        <div>
          <p className="eyebrow">EVERYTHING YOU NEED</p>
          <h2>Your next chapter starts here.</h2>
        </div>
      </div>
      <CredentialForm provider="email" workbench={workbench} />
      <div
        className="auth-divider"
        role="separator"
        aria-label="Or continue with Google"
      >
        <span>OR</span>
      </div>
      <GoogleSignIn workbench={workbench} />
      {notice && (
        <div
          role={notice.error ? "alert" : "status"}
          className={`notice ${notice.error ? "error" : ""}`}
        >
          {notice.text}
        </div>
      )}
      <div className="card-footer">
        <ShieldCheck size={16} aria-hidden="true" /> One account. Every store.
      </div>
    </Card>
  );
}

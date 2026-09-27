"use client";
import { Mail, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, Tabs } from "@heroui/react";
import { CredentialForm } from "./CredentialForm";
import { GoogleSignIn } from "./GoogleSignIn";
import type { Workbench } from "../hooks/useWorkbench";
export function AuthCard({ workbench }: { workbench: Workbench }) {
  const { notice, setNotice } = workbench;
  const [provider, setProvider] = useState<"email" | "phone">("email");
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
          <h2>Your EYN account</h2>
          <p className="auth-intro">One account for everything you build.</p>
        </div>
      </div>
      <Tabs
        className="auth-provider-tabs"
        selectedKey={provider}
        disabledKeys={workbench.busy ? ["email", "phone"] : []}
        onSelectionChange={(key) => {
          if (workbench.busy || (key !== "email" && key !== "phone")) return;
          setProvider(key);
          setNotice(null);
        }}
      >
        <Tabs.List aria-label="Sign-in method">
          <Tabs.Tab id="email">
            <Mail size={18} aria-hidden="true" /> Email
            <Tabs.Indicator />
          </Tabs.Tab>
          <Tabs.Tab id="phone">
            <Smartphone size={18} aria-hidden="true" /> Phone
            <Tabs.Indicator />
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel id={provider} key={provider}>
          <CredentialForm provider={provider} workbench={workbench} />
        </Tabs.Panel>
      </Tabs>
      {provider === "email" && (
        <>
          <div
            className="auth-divider"
            role="separator"
            aria-label="Or continue with Google"
          >
            <span>OR</span>
          </div>
          <GoogleSignIn workbench={workbench} />
        </>
      )}
      {notice && (
        <div
          role={notice.error ? "alert" : "status"}
          className={`notice ${notice.error ? "error" : ""}`}
        >
          {notice.text}
        </div>
      )}
    </Card>
  );
}

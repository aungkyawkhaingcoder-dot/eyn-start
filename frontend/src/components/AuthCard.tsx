import { useState } from "react";
import { Card, Tabs } from "@heroui/react";
import { CredentialForm } from "./CredentialForm";
import { GoogleSignIn } from "./GoogleSignIn";
import type { Provider } from "../types/auth";
import type { Workbench } from "../hooks/useWorkbench";
export function AuthCard({ workbench }: { workbench: Workbench }) {
  const [provider, setProvider] = useState<Provider>("email");
  const { busy, notice, setNotice } = workbench;
  function changeProvider(provider: Provider) {
    setProvider(provider);
    setNotice(null);
  }
  return (
    <Card className="auth-card">
      <div className="card-heading">
        <div>
          <p className="eyebrow">01 / AUTHENTICATE</p>
          <h2>Let’s get you in.</h2>
        </div>
        <span className="icon">↗</span>
      </div>
      <Tabs
        selectedKey={provider}
        onSelectionChange={(key) => changeProvider(key as Provider)}
        disabledKeys={busy ? ["email", "phone", "google"] : []}
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label="Sign-in method">
            {(["email", "phone", "google"] as const).map((p) => (
              <Tabs.Tab id={p} key={p}>
                {p === "email"
                  ? "✉ Email"
                  : p === "phone"
                    ? "⌁ Phone"
                    : "G Google"}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>
      {provider === "google" ? (
        <GoogleSignIn workbench={workbench} />
      ) : (
        <CredentialForm
          key={provider}
          provider={provider}
          workbench={workbench}
        />
      )}
      {notice && (
        <div
          role={notice.error ? "alert" : "status"}
          className={`notice ${notice.error ? "error" : ""}`}
        >
          {notice.text}
        </div>
      )}
      <div className="card-footer">
        <span>◈</span> Browser mode · HttpOnly session cookies
      </div>
    </Card>
  );
}

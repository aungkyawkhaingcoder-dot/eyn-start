"use client";
import { Brand } from "../../components/Brand";
import { AuthCard } from "@eyn/auth/components/AuthCard";
import { useWorkbench } from "@eyn/auth/hooks/useWorkbench";
import { useRouter } from "next/navigation";
export default function Login() {
  const router = useRouter();
  const workbench = useWorkbench(() => router.replace("/stores"));
  return (
    <main className="login-layout">
      <section className="login-story">
        <Brand />
        <div>
          <span className="eyebrow">FOR THE ONES BUILDING SOMETHING</span>
          <h1>
            Big ideas.
            <br />
            Beautiful stores.
            <br />
            <em>Yours, next.</em>
          </h1>
          <p>
            Turn what you love into a store people love.
            <br />
            Everything you need to get started is here.
          </p>
        </div>
        <span>IDEAS → BUSINESS → POSSIBILITIES</span>
      </section>
      <section className="login-form">
        <AuthCard workbench={workbench} />
      </section>
    </main>
  );
}

"use client";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "@eyn/auth/lib/axios";
import { Button } from "@heroui/react";
type Admin = { id: number; role: "ADMIN"; status: "ACTIVE" };
const modules = [
  ["Merchants", "Merchant directory and user status management."],
  ["Stores", "Store directory, approval and suspend / restore controls."],
  ["Publication", "Platform controls for store publication."],
  ["Metrics", "Platform totals and operational health."],
  ["Support notes", "Internal support context for merchants and stores."],
  ["Audit log", "A record of administrative actions."],
];
export default function Console() {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function session(signal?: AbortSignal) {
    const { data } = await api.get<{ admin: Admin }>("/api/v1/admin/session", {
      signal,
    });
    if (data.admin?.role !== "ADMIN" || data.admin?.status !== "ACTIVE")
      throw new Error("An active administrator account is required.");
    return data.admin;
  }
  useEffect(() => {
    const controller = new AbortController();
    session(controller.signal)
      .then(setAdmin)
      .catch(() => {
        if (!controller.signal.aborted) setAdmin(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await api.post("/api/v1/email/login", {
        email: form.get("email"),
        password: form.get("password"),
      });
      setAdmin(await session());
    } catch (e) {
      setAdmin(null);
      setError(e instanceof Error ? e.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    setError("");
    try {
      await api.post("/api/v1/logout", {});
      setAdmin(null);
    } catch {
      setError("Sign out failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <main aria-busy="true">
        <p role="status">Checking administrator access…</p>
      </main>
    );
  if (!admin)
    return (
      <main>
        <a className="brand" href="/">
          EYN / Console
        </a>
        <section className="panel login">
          <span className="eyebrow">Platform administration</span>
          <h1>Administrator sign in</h1>
          <p>
            Use an existing verified email account with administrator access.
          </p>
          <form onSubmit={login}>
            <label>
              Email
              <input
                name="email"
                type="email"
                autoComplete="username"
                required
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
            <Button type="submit" isDisabled={busy}>
              {busy ? "Checking access…" : "Sign in"}
            </Button>
          </form>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <p className="muted">
            Merchant accounts cannot access platform administration.
          </p>
        </section>
      </main>
    );
  return (
    <main>
      <header>
        <a className="brand" href="/">
          EYN / Console
        </a>
        <nav aria-label="Account">
          <span className="badge">Administrator #{admin.id}</span>
          <Button onPress={logout} isDisabled={busy}>
            Sign out
          </Button>
        </nav>
      </header>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <section>
        <p className="eyebrow">Platform workspace</p>
        <h1 className="console-title">Administration</h1>
        <p>
          The console foundation is ready. Management modules below are planned
          and do not change platform data yet.
        </p>
      </section>
      <div className="grid">
        {modules.map(([title, description]) => (
          <section className="panel" key={title}>
            <span className="badge">Coming next</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </section>
        ))}
      </div>
    </main>
  );
}

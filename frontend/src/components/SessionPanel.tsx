import { Button, Card } from "@heroui/react";
import { API_URL } from "../lib/axios";
import { useSessionActions } from "../hooks/useSessionActions";
import type { Workbench } from "../hooks/useWorkbench";
export function SessionPanel({ workbench }: { workbench: Workbench }) {
  const { session, busy } = workbench;
  const actions = useSessionActions(workbench);
  return (
    <aside>
      <Card className="session-card">
        <p className="eyebrow">02 / SESSION</p>
        <div className="session-title">
          <h2>Session check</h2>
          <span className={`dot ${session ? "online" : ""}`} />
        </div>
        <p className="session-status">
          {session ? `User #${session.id}` : "Not checked / signed out"}
        </p>
        <p className="muted">
          {session
            ? `Last success at ${session.at}. Check again to confirm.`
            : "Already signed in? Check the session stored in this browser."}
        </p>
        <Button
          className="secondary"
          isDisabled={busy}
          onPress={() => actions.check()}
        >
          Check protected API <span>↗</span>
        </Button>
        <Button
          className="secondary"
          isDisabled={busy}
          onPress={() => actions.check(true)}
        >
          Send 3 parallel requests <span>⇉</span>
        </Button>
        <Button
          className="text-button"
          isDisabled={busy}
          onPress={actions.logout}
        >
          Sign out
        </Button>
        <div className="note">
          <strong>Try refresh rotation</strong>
          <p>
            Wait until the access token expires, then check the protected API.
            The server refreshes browser cookies automatically.
          </p>
        </div>
      </Card>
      <section className="connection">
        <span className="eyebrow">API CONNECTION</span>
        <code>{API_URL}</code>
        <Button isDisabled={busy} onPress={actions.health}>
          Check connection ↗
        </Button>
      </section>
    </aside>
  );
}

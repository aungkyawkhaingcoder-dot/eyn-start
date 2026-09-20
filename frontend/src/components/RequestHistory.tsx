import { Button, Card } from "@heroui/react";
import type { RequestLog } from "../types/auth";
export function RequestHistory({
  logs,
  clearLogs,
}: {
  logs: RequestLog[];
  clearLogs: () => void;
}) {
  return (
    <Card className="history">
      <div className="card-heading">
        <div>
          <p className="eyebrow">03 / OBSERVE</p>
          <h2>
            Request history <span className="count">{logs.length}</span>
          </h2>
        </div>
        <Button className="text-button" onPress={clearLogs}>
          Clear history
        </Button>
      </div>
      <p className="muted">
        Latest 20 responses. Passwords and token fields are hidden. Nothing is
        persisted.
      </p>
      {logs.length === 0 ? (
        <div className="empty">
          ◎<p>Your next request will appear here.</p>
          <small>Choose a sign-in method to get started.</small>
        </div>
      ) : (
        <div className="requests">
          {logs.map((log) => (
            <details key={log.id}>
              <summary>
                <span
                  className={`status ${Number(log.status) >= 200 && Number(log.status) < 300 ? "ok" : "bad"}`}
                >
                  {log.status}
                </span>
                <b>{log.method}</b>
                <code>{log.path}</code>
                <small>
                  {log.ms} ms · {log.time}
                </small>
              </summary>
              <pre>{JSON.stringify(log.data, null, 2)}</pre>
            </details>
          ))}
        </div>
      )}
    </Card>
  );
}

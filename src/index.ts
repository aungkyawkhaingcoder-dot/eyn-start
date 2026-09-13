import "dotenv/config";
import app from "./app";
import { readRefreshConfig } from "./auth/refresh/config";
import { closeBrowserSessions } from "./auth/refresh/browserSession";

// Fail startup for a typo/missing URL instead of silently selecting another strategy.
readRefreshConfig();
const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => console.log("server listening " + PORT));

let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  const timeout = setTimeout(() => process.exit(1), 10_000);
  timeout.unref();
  server.close(async () => {
    try {
      await closeBrowserSessions();
      process.exit(0);
    } catch {
      process.exit(1);
    }
  });
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

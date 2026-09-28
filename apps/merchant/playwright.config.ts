import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  use: { baseURL: "http://localhost:3100", browserName: "chromium" },
  webServer: {
    command: "pnpm exec next dev --hostname localhost --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 120000,
  },
});

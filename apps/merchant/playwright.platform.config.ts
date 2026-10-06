import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./platform-tests",
  workers: 1,
  use: { browserName: "chromium" },
  webServer: [
    {
      command:
        "pnpm --filter @eyn/landing exec next dev --hostname localhost --port 3101",
      url: "http://localhost:3101",
      reuseExistingServer: false,
      timeout: 120000,
    },
    {
      command:
        "pnpm --filter @eyn/eyn-admin-console exec next dev --hostname localhost --port 3102",
      url: "http://localhost:3102",
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
});

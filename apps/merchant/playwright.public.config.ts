import { defineConfig } from "@playwright/test";
export default defineConfig({
 testDir:"./tests", testMatch:["storefront.spec.ts","storefront-layout.spec.ts","public-boundary.spec.ts"], workers:1,
 use:{baseURL:"http://localhost:3103",browserName:"chromium"},
 webServer:{command:"pnpm --filter @eyn/storefront-app exec next dev --hostname localhost --port 3103",url:"http://localhost:3103",reuseExistingServer:false,timeout:120000}
});

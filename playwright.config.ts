import { defineConfig, devices } from "@playwright/test";

if (!process.env.E2E_APP_DIR || !process.env.E2E_RUN_ID) {
  throw new Error("Run E2E tests through npm run test:e2e or npm run test:e2e:public to isolate secrets and databases.");
}

const publicOnly = process.env.E2E_PUBLIC_ONLY === "1";

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: publicOnly ? ["**/cms.spec.ts", "**/permissions.spec.ts"] : ["**/review-template-ui.spec.ts"],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  forbidOnly: Boolean(process.env.CI),
  reporter: [["list"], ["html", { open: "never" }]],
  outputDir: "test-results",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", testMatch: ["**/public.spec.ts", "**/review-template-ui.spec.ts"], use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
  ],
  webServer: {
    command: `node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3100`,
    cwd: process.env.E2E_APP_DIR,
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});

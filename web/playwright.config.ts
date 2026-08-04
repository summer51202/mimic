import { defineConfig } from "@playwright/test";

const webBaseUrl =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.MIMIC_WEB_BASE_URL ??
  "http://localhost:3010";
const webUrl = new URL(webBaseUrl);
const reuseExistingServer =
  !process.env.CI && process.env.MIMIC_RUNTIME_ACCEPTANCE !== "1";

export default defineConfig({
  testDir: "./e2e",
  testIgnore: "helpers/**/*.test.ts",
  timeout: 120_000,
  workers: 1,
  webServer: {
    command: `npm run dev -- --webpack --hostname ${webUrl.hostname} --port ${webUrl.port || "3010"}`,
    url: webBaseUrl,
    reuseExistingServer,
    timeout: 120_000,
  },
  use: {
    baseURL: webBaseUrl,
  },
  projects: [
    {
      name: "phone-small",
      use: { viewport: { height: 720, width: 320 } },
    },
    {
      name: "phone",
      use: { viewport: { height: 844, width: 390 } },
    },
    {
      name: "tablet",
      use: { viewport: { height: 1024, width: 768 } },
    },
    {
      name: "desktop",
      use: { viewport: { height: 900, width: 1440 } },
    },
  ],
});

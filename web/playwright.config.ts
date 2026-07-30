import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  workers: 1,
  webServer: {
    command: "npm run dev -- --webpack --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: {
    baseURL: "http://127.0.0.1:3100",
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

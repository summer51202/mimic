import { defineConfig } from "@playwright/test";

const proxyPort = process.env.MIMIC_PHASE_2I_PROXY_PORT ?? "32141";
const webPort = process.env.MIMIC_PHASE_2I_WEB_PORT ?? "32142";
const proxy = `http://127.0.0.1:${proxyPort}`;
const web = `http://127.0.0.1:${webPort}`;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "home-ledger-trigger-phase-2h.spec.ts",
  grep: /shows the existing Home error state/,
  timeout: 120_000,
  workers: 1,
  webServer: [
    {
      command: "node e2e/helpers/omit-home-latest-recorded.mjs",
      url: `${proxy}/health`,
      reuseExistingServer: false,
    },
    {
      command: `npm run dev -- --hostname 127.0.0.1 --port ${webPort}`,
      url: `${web}/api/health/live`,
      env: { MIMIC_API_BASE_URL: `${proxy}/api/v1` },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
  projects: [{ name: "desktop", metadata: { phase2iMissingHome: true }, use: {
    baseURL: web,
    viewport: { height: 900, width: 1440 },
  } }],
});

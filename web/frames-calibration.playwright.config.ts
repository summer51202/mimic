import base from "./playwright.config";
import { defineConfig } from "@playwright/test";

export default defineConfig({
  ...base,
  webServer: undefined,
  testMatch: "frames-calibration-review.spec.ts",
  outputDir: "test-results/frames-calibration",
  use: { channel: process.env.PLAYWRIGHT_CHANNEL },
});

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

const root = (...path: string[]) => join(process.cwd(), ...path);

test("every Next.js Sentry surface enforces the shared privacy policy", () => {
  const files = [
    "instrumentation-client.ts",
    "instrumentation.ts",
    "sentry.server.config.ts",
    "sentry.edge.config.ts",
  ];

  for (const file of files) {
    expect(existsSync(root(file))).toBe(true);
  }

  const client = readFileSync(root("instrumentation-client.ts"), "utf8");
  expect(client).toContain("NEXT_PUBLIC_MIMIC_SENTRY_DSN");
  expect(client).toContain("sendDefaultPii: false");
  expect(client).toContain("beforeSend");
  expect(client).toContain("beforeSendTransaction");
  expect(client).toContain("replaysSessionSampleRate: 0");
  expect(client).toContain("onRouterTransitionStart = Sentry.captureRouterTransitionStart");
  expect(client).not.toContain("process.env.MIMIC_SENTRY_DSN");
  expect(client).not.toContain("replayIntegration");

  for (const file of ["sentry.server.config.ts", "sentry.edge.config.ts"]) {
    const source = readFileSync(root(file), "utf8");
    expect(source).toContain("MIMIC_SENTRY_DSN");
    expect(source).not.toContain("NEXT_PUBLIC_MIMIC_SENTRY_DSN");
    expect(source).toContain("sendDefaultPii: false");
    expect(source).toContain("beforeSend");
    expect(source).toContain("beforeSendTransaction");
    expect(source).not.toContain("replayIntegration");
  }

  const instrumentation = readFileSync(root("instrumentation.ts"), "utf8");
  expect(instrumentation).toContain("captureRequestError");
  expect(instrumentation).toContain("sentry.edge.config");
  expect(instrumentation).toContain("sentry.server.config");

  const nextConfig = readFileSync(root("next.config.ts"), "utf8");
  expect(nextConfig).toContain("withSentryConfig");
  expect(nextConfig).toContain("removeDebugLogging: true");
  expect(nextConfig).not.toContain("disableLogger");
  expect(nextConfig).toContain("withSerwist(nextConfig)");
  expect(nextConfig).toContain('output: "standalone"');
});

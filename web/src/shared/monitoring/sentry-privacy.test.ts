import { expect, test } from "vitest";

test("Sentry privacy policy constructs an allowlisted browser event", async () => {
  const { sanitizeSentryEvent } = await import("./sentry-privacy");
  const secret = "customer@example.test amount=98765 note=private";

  const output = sanitizeSentryEvent({
    event_id: "safe-event-id",
    level: "error",
    timestamp: 123,
    environment: "beta",
    release: "revision",
    message: secret,
    user: { id: "550e8400-e29b-41d4-a716-446655440000", email: secret },
    tags: { service: "web", route: "/app/funds/:fundId", customer: secret },
    request: {
      method: "POST",
      url: `https://app.example.test/app/funds/123?email=${secret}`,
      headers: { authorization: `Bearer ${secret}`, cookie: secret },
      data: { amount: 98765 },
      cookies: { session: secret },
    },
    extra: {
      requestId: "req-123_ABC",
      errorCode: "LOCKED_PERIOD",
      amount: 98765,
      title: secret,
      note: secret,
    },
    breadcrumbs: [{ message: secret }],
    contexts: { customer: { email: secret } },
    exception: {
      values: [
        {
          type: "DomainError",
          value: secret,
          mechanism: { data: { secret } },
          stacktrace: {
            frames: [
              {
                filename: "funds.ts",
                function: "saveFund",
                lineno: 22,
                vars: { secret },
                context_line: secret,
              },
            ],
          },
        },
      ],
    },
    type: "transaction",
    transaction: `/app/funds/123?email=${secret}`,
  });

  expect(output).toEqual({
    event_id: "safe-event-id",
    level: "error",
    timestamp: 123,
    environment: "beta",
    release: "revision",
    user: { id: "550e8400-e29b-41d4-a716-446655440000" },
    tags: { service: "web", route: "/app/funds/:fundId" },
    request: { method: "POST", url: "https://app.example.test/app/funds/123" },
    extra: { requestId: "req-123_ABC", errorCode: "LOCKED_PERIOD" },
    exception: {
      values: [
        {
          type: "DomainError",
          stacktrace: {
            frames: [{ filename: "funds.ts", function: "saveFund", lineno: 22 }],
          },
        },
      ],
    },
    type: "transaction",
  });
  expect(JSON.stringify(output)).not.toContain(secret);
});

test("Sentry privacy policy rejects malformed URLs, secret diagnostics, and raw routes", async () => {
  const { sanitizeSentryEvent, traceSampleRate } = await import("./sentry-privacy");

  expect(
    sanitizeSentryEvent({
      request: { method: "TRACE", url: "not a URL?token=secret" },
      extra: { requestId: "secret text", errorCode: "api-key=secret" },
      tags: { route: "/app/funds/123", runtime: "browser" },
    }),
  ).toEqual({ tags: { runtime: "browser" } });
  expect(traceSampleRate("0.25")).toBe(0.25);
  expect(traceSampleRate("NaN")).toBe(0);
  expect(traceSampleRate("2")).toBe(0);
});

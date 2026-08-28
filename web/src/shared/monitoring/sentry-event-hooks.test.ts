import { expect, test } from "vitest";
import { createSentryEventHooks } from "./sentry-event-hooks";

test("Sentry event hooks clear attachments and construct a scrubbed event", () => {
  const secret = "customer@example.test token=secret";
  const event = { event_id: "0123456789abcdef0123456789abcdef", message: secret };
  const hint = { attachments: [{ filename: secret, data: secret }] };
  const hooks = createSentryEventHooks();
  const output = hooks.beforeSend(event, hint);
  expect(hint.attachments).toEqual([]);
  expect(output).toEqual({ event_id: "0123456789abcdef0123456789abcdef", type: undefined });
  expect(output).not.toBe(event);
  expect(JSON.stringify(output)).not.toContain(secret);
  expect(hooks.beforeSend(event, null)).toEqual({ event_id: "0123456789abcdef0123456789abcdef", type: undefined });
  expect(hooks.beforeSendTransaction()).toBeNull();
});

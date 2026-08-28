describe('Sentry event hooks', () => {
  it('clears attachments and returns a fresh scrubbed error event', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createSentryEventHooks } = require('./sentry-event-hooks') as {
      createSentryEventHooks(): { beforeSend(event: unknown, hint?: { attachments?: unknown[] } | null): unknown; beforeSendTransaction(): null };
    };
    const secret = 'customer@example.test token=secret';
    const event = { event_id: '0123456789abcdef0123456789abcdef', message: secret, request: { method: 'POST', url: `https://api.example.test/${secret}` } };
    const hint = { attachments: [{ filename: secret, data: secret }] };
    const output = createSentryEventHooks().beforeSend(event, hint);

    expect(hint.attachments).toEqual([]);
    expect(output).toEqual({ event_id: '0123456789abcdef0123456789abcdef', request: { method: 'POST' }, type: undefined });
    expect(output).not.toBe(event);
    expect(JSON.stringify(output)).not.toContain(secret);
    expect(event.message).toBe(secret);
    expect(createSentryEventHooks().beforeSend(event, null)).toEqual({ event_id: '0123456789abcdef0123456789abcdef', request: { method: 'POST' }, type: undefined });
    expect(createSentryEventHooks().beforeSendTransaction()).toBeNull();
  });
});

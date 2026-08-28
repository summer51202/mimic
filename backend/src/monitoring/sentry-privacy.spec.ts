describe('Sentry privacy policy', () => {
  function sanitizer() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('./sentry-privacy') as {
      sanitizeSentryEvent(event: unknown): unknown;
    };
  }

  it('constructs a safe event instead of forwarding customer telemetry', () => {
    // The module intentionally does not exist yet: this is the initial RED test.
    const privacy = sanitizer();

    const secret = 'customer@example.test amount=98765 note=private';
    const output = privacy.sanitizeSentryEvent({
      event_id: 'safe-event-id',
      level: 'error',
      timestamp: 123,
      environment: 'beta',
      release: 'revision',
      user: { id: '550e8400-e29b-41d4-a716-446655440000', email: secret },
      tags: { service: 'backend', route: '/api/v1/funds/:fundId', customer: secret },
      message: secret,
      request: {
        url: `https://app.example.test/api?token=${secret}`,
        headers: { authorization: `Bearer ${secret}`, cookie: secret },
        data: { secret },
      },
      extra: { amount: 98765, title: secret, note: secret },
      breadcrumbs: [{ message: secret }],
      contexts: { customer: { email: secret } },
    });

    expect(JSON.stringify(output)).not.toContain(secret);
    expect(output).toEqual({
      event_id: 'safe-event-id',
      level: 'error',
      timestamp: 123,
      environment: 'beta',
      release: 'revision',
      user: { id: '550e8400-e29b-41d4-a716-446655440000' },
      tags: { service: 'backend', route: '/api/v1/funds/:fundId' },
    });
  });

  it('allows only bounded diagnostic identifiers and a sanitized request URL', () => {
    const { sanitizeSentryEvent } = sanitizer();

    expect(
      sanitizeSentryEvent({
        event_id: 'evt_123',
        level: 'fatal',
        timestamp: 123,
        extra: {
          requestId: 'req-123_ABC',
          errorCode: 'LOCKED_PERIOD',
          amount: 5000,
          title: 'Dinner with alice@example.test',
          note: 'private note',
        },
        request: {
          method: 'POST',
          url: 'https://api.example.test/api/v1/funds/123?email=alice@example.test',
          data: { amount: 5000 },
          query_string: 'email=alice@example.test',
          headers: { authorization: 'Bearer secret', cookie: 'secret' },
          cookies: { session: 'secret' },
        },
      }),
    ).toEqual({
      event_id: 'evt_123',
      level: 'fatal',
      timestamp: 123,
      extra: { requestId: 'req-123_ABC', errorCode: 'LOCKED_PERIOD' },
      request: { method: 'POST', url: 'https://api.example.test/api/v1/funds/123' },
    });

    expect(
      sanitizeSentryEvent({
        extra: { requestId: 'secret value', errorCode: 'api-key=secret' },
        request: { method: 'TRACE', url: 'not a URL?token=secret' },
      }),
    ).toEqual({});

    expect(sanitizeSentryEvent({ request: { method: 'GET' } })).toEqual({});
  });

  it('retains exception type and safe stack frames without exception values or mechanism data', () => {
    const { sanitizeSentryEvent } = sanitizer();
    const secret = 'token=top-secret customer@example.test';

    const output = sanitizeSentryEvent({
      exception: {
        values: [
          {
            type: 'PrismaClientKnownRequestError',
            value: secret,
            mechanism: { type: 'generic', data: { secret } },
            stacktrace: {
              frames: [
                {
                  filename: 'settlements.service.ts',
                  function: 'completeSettlement',
                  lineno: 91,
                  colno: 4,
                  in_app: true,
                  vars: { secret },
                  context_line: secret,
                  pre_context: [secret],
                  post_context: [secret],
                },
              ],
            },
          },
        ],
      },
    });

    expect(output).toEqual({
      exception: {
        values: [
          {
            type: 'PrismaClientKnownRequestError',
            stacktrace: {
              frames: [
                {
                  filename: 'settlements.service.ts',
                  function: 'completeSettlement',
                  lineno: 91,
                  colno: 4,
                  in_app: true,
                },
              ],
            },
          },
        ],
      },
    });
    expect(JSON.stringify(output)).not.toContain(secret);
  });

  it('does not retain raw transaction names or unsafe route tags', () => {
    const { sanitizeSentryEvent } = sanitizer();
    const secret = 'alice@example.test';
    const output = sanitizeSentryEvent({
      type: 'transaction',
      transaction: `/api/v1/funds/550e8400-e29b-41d4-a716-446655440000?email=${secret}`,
      tags: {
        route: `/api/v1/funds/550e8400-e29b-41d4-a716-446655440000?email=${secret}`,
        service: 'backend',
        runtime: 'nodejs',
      },
    });

    expect(output).toEqual({ type: 'transaction', tags: { service: 'backend', runtime: 'nodejs' } });
    expect(JSON.stringify(output)).not.toContain(secret);
  });
});

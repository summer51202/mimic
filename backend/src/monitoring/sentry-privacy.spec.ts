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
      event_id: '0123456789abcdef0123456789abcdef',
      level: 'error',
      timestamp: 123,
      environment: 'production',
      release: 'abcdef0123456',
      user: { id: 'anon_1234567890abcdef', email: secret },
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
      event_id: '0123456789abcdef0123456789abcdef',
      level: 'error',
      timestamp: 123,
      environment: 'production',
      release: 'abcdef0123456',
      user: { id: 'anon_1234567890abcdef' },
      tags: { service: 'backend', route: '/api/v1/funds/:fundId' },
    });
  });

  it('allows only bounded diagnostic identifiers and a sanitized request URL', () => {
    const { sanitizeSentryEvent } = sanitizer();

    expect(
      sanitizeSentryEvent({
        event_id: '0123456789abcdef0123456789abcdef',
        level: 'fatal',
        timestamp: 123,
        extra: {
          requestId: 'req_123_ABC',
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
      event_id: '0123456789abcdef0123456789abcdef',
      level: 'fatal',
      timestamp: 123,
      extra: { requestId: 'req_123_ABC', errorCode: 'LOCKED_PERIOD' },
      request: { method: 'POST' },
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
                  module: 'dist.src.modules.auth:jwt-secrets',
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

  it('keeps only a safe DNS origin and rejects raw route slugs', () => {
    const { sanitizeSentryEvent } = sanitizer();
    const ipSecret = 'alice@example.test';
    const output = sanitizeSentryEvent({
      request: {
        method: 'GET',
        url: `https://203.0.113.42/users/${ipSecret}?token=secret`,
      },
      tags: { route: '/api/v1/funds/private-note' },
    });

    expect(output).toEqual({});
    expect(JSON.stringify(output)).not.toContain(ipSecret);

    expect(
      sanitizeSentryEvent({
        request: { method: 'GET', url: `https://api.example.test/users/${ipSecret}?token=secret` },
      }),
    ).toEqual({ request: { method: 'GET' } });
  });

  it('uses separate narrow validators for diagnostic identifiers and deployment metadata', () => {
    const { sanitizeSentryEvent } = sanitizer();
    const output = sanitizeSentryEvent({
      event_id: '0123456789abcdef0123456789abcdef',
      environment: 'production',
      release: 'abcdef0123456',
      user: { id: 'anon_1234567890abcdef' },
      extra: { requestId: 'req_ABC-123', errorCode: 'LOCKED_PERIOD' },
    });
    expect(output).toEqual({
      event_id: '0123456789abcdef0123456789abcdef',
      environment: 'production',
      release: 'abcdef0123456',
      user: { id: 'anon_1234567890abcdef' },
      extra: { requestId: 'req_ABC-123', errorCode: 'LOCKED_PERIOD' },
    });

    expect(
      sanitizeSentryEvent({
        event_id: 'event-id',
        environment: 'beta',
        release: 'release-name',
        user: { id: '550e8400-e29b-41d4-a716-446655440000' },
        extra: { requestId: 'request-1', errorCode: 'secret=value' },
      }),
    ).toEqual({});
  });

  it('drops address-like frame data and unsafe source locations', () => {
    const { sanitizeSentryEvent } = sanitizer();
    const prohibited = [
      '203.0.113.42',
      'alice@example.test',
      'token=secret',
      'C:\\Users\\alice\\secret.ts',
      '../private.ts',
    ];
    const output = sanitizeSentryEvent({
      exception: {
        values: [
          {
            type: 'DomainError',
            stacktrace: {
              frames: [
                { filename: 'src/203.0.113.42.ts', function: '203.0.113.42', lineno: -1, colno: 1e20 },
                { filename: 'src/alice@example.test.ts', function: 'token=secret', lineno: Infinity, colno: 1 },
                { filename: 'src/funds.ts', function: 'saveFund', lineno: 12, colno: 3 },
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
            type: 'DomainError',
            stacktrace: { frames: [{ filename: 'src/funds.ts', function: 'saveFund', lineno: 12, colno: 3 }] },
          },
        ],
      },
    });
    const serialized = JSON.stringify(output);
    for (const value of prohibited) expect(serialized).not.toContain(value);
  });

  it('keeps only qualified safe frame functions and non-sensitive project filenames', () => {
    const { sanitizeSentryEvent } = sanitizer();
    const output = sanitizeSentryEvent({
      exception: {
        values: [{
          type: 'DomainError',
          stacktrace: {
            frames: [
              { filename: 'src/auth/session.ts', function: 'AuthService.login', lineno: 1, colno: 1 },
              { filename: 'src/handlers/object.ts', function: 'Object.handler', lineno: 2, colno: 1 },
              { filename: 'src/safe_name.ts', function: '$_safe.handler_$', lineno: 3, colno: 1 },
              { filename: 'src/anonymous.ts', function: '<anonymous>', lineno: 4, colno: 1 },
              { filename: 'src/alice@example.test.ts', function: 'AuthService.login', lineno: 5, colno: 1 },
              { filename: 'src/203.0.113.42.ts', function: 'AuthService.login', lineno: 6, colno: 1 },
              { filename: 'src/customer-secret.ts', function: 'AuthService.login', lineno: 7, colno: 1 },
              { filename: 'src/123/valid.ts', function: 'AuthService.login', lineno: 8, colno: 1 },
              { filename: 'src/../private.ts', function: 'AuthService.login', lineno: 9, colno: 1 },
              { filename: '/app/src/C:/customer.ts', function: 'AuthService.login', lineno: 10, colno: 1 },
              { filename: 'src/valid.ts', function: '203.0.113.42', lineno: 11, colno: 1 },
              { filename: 'src/valid.ts', function: 'alice@example.test', lineno: 12, colno: 1 },
              { filename: 'src/valid.ts', function: 'AuthService.secretLogin', lineno: 13, colno: 1 },
            ],
          },
        }],
      },
    });

    expect(output).toEqual({
      exception: {
        values: [{
          type: 'DomainError',
          stacktrace: {
            frames: [
              { filename: 'src/auth/session.ts', function: 'AuthService.login', lineno: 1, colno: 1 },
              { filename: 'src/handlers/object.ts', function: 'Object.handler', lineno: 2, colno: 1 },
              { filename: 'src/safe_name.ts', function: '$_safe.handler_$', lineno: 3, colno: 1 },
              { filename: 'src/anonymous.ts', function: '<anonymous>', lineno: 4, colno: 1 },
            ],
          },
        }],
      },
    });
  });

  it('canonicalizes only known runtime frame prefixes', () => {
    const { sanitizeSentryEvent } = sanitizer();
    const cwd = process.cwd();
    const frames = [
      { filename: '/app/dist/src/modules/auth/auth.service.js', function: 'saveAuth', lineno: 10, colno: 1 },
      { filename: `${cwd}\\dist\\src\\health\\health.service.js`, function: 'checkHealth', lineno: 20, colno: 2 },
      { filename: `${cwd}/src/health/ready.service.js`, function: 'ready', lineno: 30, colno: 3 },
      { filename: '/tmp/customer-secret.js', function: 'bad', lineno: 1, colno: 1 },
      { filename: 'https://mimic.example/_next/static/chunks/app/foo-abc123.js', function: 'renderApp', lineno: 40, colno: 3 },
    ];
    expect(sanitizeSentryEvent({ exception: { values: [{ type: 'DomainError', stacktrace: { frames } }] } })).toEqual({
      exception: { values: [{ type: 'DomainError', stacktrace: { frames: [
        { filename: 'src/modules/auth/auth.service.js', function: 'saveAuth', lineno: 10, colno: 1 },
        { filename: 'src/health/health.service.js', function: 'checkHealth', lineno: 20, colno: 2 },
        { filename: 'src/health/ready.service.js', function: 'ready', lineno: 30, colno: 3 },
      ] } }] },
    });
  });

  it('drops frame paths that merely contain a trusted marker', () => {
    const { sanitizeSentryEvent } = sanitizer();
    const prohibited = ['alice-secret', 'third-party.example'];
    const output = sanitizeSentryEvent({ exception: { values: [{ type: 'DomainError', stacktrace: { frames: [
      { filename: '/tmp/customer/src/alice-secret/note.js', function: 'AuthService.login', lineno: 1, colno: 1 },
      { filename: 'https://third-party.example/src/alice-secret/note.js', function: 'Object.handler', lineno: 2, colno: 2 },
    ] } }] } });
    expect(output).toEqual({ exception: { values: [{ type: 'DomainError' }] } });
    for (const value of prohibited) expect(JSON.stringify(output)).not.toContain(value);
  });
});

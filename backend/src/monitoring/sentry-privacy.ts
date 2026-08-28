type RecordValue = Record<string, unknown>;

const SENTRY_EVENT_ID = /^[a-f0-9]{32}$/;
const ERROR_CODE = /^[A-Z][A-Z0-9_]{2,63}$/;
const REQUEST_ID = /^req_[A-Za-z0-9_-]{1,64}$/;
const PSEUDONYMOUS_USER_ID = /^(?:anon_[A-Za-z0-9_-]{16,64}|sha256:[a-f0-9]{64})$/;
const RELEASE = /^[a-f0-9]{7,64}$/;
const EXCEPTION_TYPE = /^[A-Za-z_$][A-Za-z0-9_$]{0,127}$/;
const FRAME_FUNCTION = /^[A-Za-z_$][A-Za-z0-9_$]{0,127}$/;
const PROJECT_FILENAME = /^(?:src\/)?[A-Za-z0-9_][A-Za-z0-9_./-]{0,159}\.(?:ts|tsx|js|jsx|mjs|cjs)$/;
const SAFE_TAG_VALUE = /^[a-z][a-z0-9-]{0,31}$/;
const SAFE_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);
const SAFE_LEVELS = new Set(['fatal', 'error', 'warning', 'log', 'info', 'debug']);
const SAFE_TAGS = new Set(['service', 'runtime', 'route']);
const STATIC_ROUTES = new Set([
  '/health',
  '/health/live',
  '/health/ready',
  '/api/v1/health',
  '/api/v1/health/live',
  '/api/v1/health/ready',
  '/api/health/live',
  '/api/health/ready',
]);

function record(value: unknown): RecordValue | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as RecordValue)
    : undefined;
}

function boundedString(value: unknown, pattern: RegExp): string | undefined {
  return typeof value === 'string' && pattern.test(value) ? value : undefined;
}

function boundedNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function isSafeRoute(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    value.length > 180 ||
    !value.startsWith('/') ||
    /[%?@#\\]/.test(value) ||
    value.includes('..')
  ) {
    return false;
  }

  if (STATIC_ROUTES.has(value)) return true;

  const segments = value.split('/').slice(1);
  return (
    segments.some((segment) => /^:[A-Za-z][A-Za-z0-9]{0,31}$/.test(segment)) &&
    segments.every((segment) => /^(?::[A-Za-z][A-Za-z0-9]{0,31}|[a-z][a-z0-9-]{0,31})$/.test(segment))
  );
}

function isSafeDnsHostname(value: string): boolean {
  return (
    value.length <= 253 &&
    value !== 'localhost' &&
    value.includes('.') &&
    !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value) &&
    value.split('.').every((label) => /^[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
  );
}

function isSafeProjectFilename(value: string): boolean {
  return (
    typeof value === 'string' &&
    PROJECT_FILENAME.test(value) &&
    !/[?@#%\\:]/.test(value) &&
    !value.includes('..') &&
    !/(?:^|\/)(?:home|users?|private|secrets?)(?:\/|$)/i.test(value) &&
    !/(?:^|\/)[^/]*(?:token|secret|password|authorization|cookie|api[-_]?key)[^/]*(?:\/|$)/i.test(value) &&
    !/\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(value) &&
    !value.split('/').some((segment) => /^\d+$/.test(segment))
  );
}

function canonicalizeFilename(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 512) return undefined;
  const path = value.replace(/\\/g, '/');
  const cwd = process.cwd().replace(/\\/g, '/');
  const roots = ['/app/dist/src/', '/app/src/', `${cwd}/dist/src/`, `${cwd}/src/`];
  let candidate: string | undefined;
  for (const root of roots) {
    if (path.startsWith(root)) {
      candidate = `src/${path.slice(root.length)}`;
      break;
    }
  }
  if (!candidate && path.startsWith('src/')) candidate = path;
  if (!candidate && !path.includes('/')) candidate = path;

  return candidate && isSafeProjectFilename(candidate) ? candidate : undefined;
}

function isSafeSourceLocation(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000;
}

function isSafeFrameFunction(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    (value === '<anonymous>' || value.split('.').every((segment) => FRAME_FUNCTION.test(segment))) &&
    !/(?:token|secret|password|authorization|cookie|api[-_]?key)/i.test(value)
  );
}

function sanitizeRequest(value: unknown): RecordValue | undefined {
  const request = record(value);
  if (!request || typeof request.url !== 'string') {
    return undefined;
  }

  const method = typeof request.method === 'string' ? request.method.toUpperCase() : undefined;
  let url: URL;

  try {
    url = new URL(request.url);
  } catch {
    return undefined;
  }

  if (
    !method ||
    !SAFE_METHODS.has(method) ||
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    !isSafeDnsHostname(url.hostname)
  ) {
    return undefined;
  }

  return { method };
}

function sanitizeFrame(value: unknown): RecordValue | undefined {
  const frame = record(value);
  const filename = frame ? canonicalizeFilename(frame.filename) : undefined;
  if (!frame || !filename) {
    return undefined;
  }

  if (frame.function !== undefined && !isSafeFrameFunction(frame.function)) return undefined;
  if (frame.lineno !== undefined && !isSafeSourceLocation(frame.lineno)) return undefined;
  if (frame.colno !== undefined && !isSafeSourceLocation(frame.colno)) return undefined;

  const output: RecordValue = {};
  const functionName = frame.function;
  const lineno = frame.lineno;
  const colno = frame.colno;

  output.filename = filename;
  if (typeof functionName === 'string') output.function = functionName;
  if (typeof lineno === 'number') output.lineno = lineno;
  if (typeof colno === 'number') output.colno = colno;
  if (typeof frame.in_app === 'boolean') output.in_app = frame.in_app;

  return Object.keys(output).length > 0 ? output : undefined;
}

function sanitizeException(value: unknown): RecordValue | undefined {
  const exception = record(value);
  const values = Array.isArray(exception?.values) ? exception.values : undefined;
  if (!values) {
    return undefined;
  }

  const safeValues = values.flatMap((exceptionValue) => {
    const item = record(exceptionValue);
    const type = boundedString(item?.type, EXCEPTION_TYPE);
    const frames = Array.isArray(record(item?.stacktrace)?.frames)
      ? (record(item?.stacktrace)?.frames as unknown[])
          .map(sanitizeFrame)
          .filter((frame): frame is RecordValue => frame !== undefined)
      : [];

    if (!type && frames.length === 0) {
      return [];
    }

    const safe: RecordValue = {};
    if (type) safe.type = type;
    if (frames.length > 0) safe.stacktrace = { frames };
    return [safe];
  });

  return safeValues.length > 0 ? { values: safeValues } : undefined;
}

/**
 * Builds a new Sentry event from a deliberately tiny diagnostics allowlist.
 * This must stay independent of SDK internals so it can be reused at every
 * capture boundary and unit-tested against hostile telemetry inputs.
 */
export function sanitizeSentryEvent(event: unknown): RecordValue {
  const source = record(event);
  if (!source) {
    return {};
  }

  const output: RecordValue = {};
  const eventId = boundedString(source.event_id, SENTRY_EVENT_ID);
  const level = typeof source.level === 'string' && SAFE_LEVELS.has(source.level) ? source.level : undefined;
  const timestamp = boundedNumber(source.timestamp);
  const environment = ['development', 'test', 'staging', 'production'].includes(source.environment as string)
    ? source.environment
    : undefined;
  const release = boundedString(source.release, RELEASE);
  const request = sanitizeRequest(source.request);
  const exception = sanitizeException(source.exception);
  const userId = boundedString(record(source.user)?.id, PSEUDONYMOUS_USER_ID);

  if (source.type === 'transaction') output.type = 'transaction';
  if (eventId) output.event_id = eventId;
  if (level) output.level = level;
  if (timestamp !== undefined) output.timestamp = timestamp;
  if (environment) output.environment = environment;
  if (release) output.release = release;
  if (request) output.request = request;
  if (exception) output.exception = exception;
  if (userId) output.user = { id: userId };

  const extra = record(source.extra);
  const safeExtra: RecordValue = {};
  const requestId = boundedString(extra?.requestId, REQUEST_ID);
  const errorCode = boundedString(extra?.errorCode, ERROR_CODE);
  if (requestId) safeExtra.requestId = requestId;
  if (errorCode) safeExtra.errorCode = errorCode;
  if (Object.keys(safeExtra).length > 0) output.extra = safeExtra;

  const tags = record(source.tags);
  const safeTags: RecordValue = {};
  for (const key of SAFE_TAGS) {
    const value = tags?.[key];
    if (key === 'route' ? isSafeRoute(value) : boundedString(value, SAFE_TAG_VALUE)) {
      safeTags[key] = value;
    }
  }
  if (Object.keys(safeTags).length > 0) output.tags = safeTags;

  return output;
}

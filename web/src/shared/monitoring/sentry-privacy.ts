type RecordValue = Record<string, unknown>;

const DIAGNOSTIC_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/;
const SAFE_METADATA = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const SAFE_TYPE = /^[A-Za-z_$][A-Za-z0-9_$.-]{0,127}$/;
const SAFE_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);
const SAFE_LEVELS = new Set(["fatal", "error", "warning", "log", "info", "debug"]);
const SAFE_TAGS = new Set(["service", "runtime", "route"]);

function record(value: unknown): RecordValue | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as RecordValue)
    : undefined;
}

function boundedString(value: unknown, pattern: RegExp): string | undefined {
  return typeof value === "string" && pattern.test(value) ? value : undefined;
}

function boundedNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isSafeRoute(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 180 || !value.startsWith("/")) {
    return false;
  }

  return value.split("/").slice(1).every((segment) => {
    if (!segment || segment.includes("?") || segment.includes("@") || /^[0-9]+$/.test(segment)) {
      return false;
    }

    return /^(?::[A-Za-z][A-Za-z0-9-]*|[A-Za-z][A-Za-z0-9-]*)$/.test(segment);
  });
}

function sanitizeRequest(value: unknown): RecordValue | undefined {
  const request = record(value);
  if (!request || typeof request.url !== "string") {
    return undefined;
  }

  const method = typeof request.method === "string" ? request.method.toUpperCase() : undefined;
  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    return undefined;
  }

  if (!method || !SAFE_METHODS.has(method) || !["http:", "https:"].includes(url.protocol)) {
    return undefined;
  }

  return { method, url: `${url.origin}${url.pathname}` };
}

function sanitizeFrame(value: unknown): RecordValue | undefined {
  const frame = record(value);
  if (!frame) return undefined;

  const output: RecordValue = {};
  const filename = boundedString(frame.filename, SAFE_METADATA);
  const functionName = boundedString(frame.function, SAFE_TYPE);
  const lineno = boundedNumber(frame.lineno);
  const colno = boundedNumber(frame.colno);

  if (filename) output.filename = filename;
  if (functionName) output.function = functionName;
  if (lineno !== undefined) output.lineno = lineno;
  if (colno !== undefined) output.colno = colno;
  if (typeof frame.in_app === "boolean") output.in_app = frame.in_app;
  return Object.keys(output).length > 0 ? output : undefined;
}

function sanitizeException(value: unknown): RecordValue | undefined {
  const values = Array.isArray(record(value)?.values) ? (record(value)?.values as unknown[]) : undefined;
  if (!values) return undefined;

  const safeValues = values.flatMap((exceptionValue) => {
    const item = record(exceptionValue);
    const type = boundedString(item?.type, SAFE_TYPE);
    const frames = Array.isArray(record(item?.stacktrace)?.frames)
      ? (record(item?.stacktrace)?.frames as unknown[])
          .map(sanitizeFrame)
          .filter((frame): frame is RecordValue => frame !== undefined)
      : [];
    if (!type && frames.length === 0) return [];

    const safe: RecordValue = {};
    if (type) safe.type = type;
    if (frames.length > 0) safe.stacktrace = { frames };
    return [safe];
  });

  return safeValues.length > 0 ? { values: safeValues } : undefined;
}

/** Builds a fresh, minimal diagnostic event. It never mutates or forwards the source. */
export function sanitizeSentryEvent(event: unknown): RecordValue {
  const source = record(event);
  if (!source) return {};

  const output: RecordValue = {};
  const eventId = boundedString(source.event_id, DIAGNOSTIC_IDENTIFIER);
  const level = typeof source.level === "string" && SAFE_LEVELS.has(source.level) ? source.level : undefined;
  const timestamp = boundedNumber(source.timestamp);
  const environment = boundedString(source.environment, SAFE_METADATA);
  const release = boundedString(source.release, SAFE_METADATA);
  const request = sanitizeRequest(source.request);
  const exception = sanitizeException(source.exception);
  const userId = boundedString(record(source.user)?.id, DIAGNOSTIC_IDENTIFIER);

  if (source.type === "transaction") output.type = "transaction";
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
  for (const key of ["requestId", "errorCode"]) {
    const safeValue = boundedString(extra?.[key], DIAGNOSTIC_IDENTIFIER);
    if (safeValue) safeExtra[key] = safeValue;
  }
  if (Object.keys(safeExtra).length > 0) output.extra = safeExtra;

  const tags = record(source.tags);
  const safeTags: RecordValue = {};
  for (const key of SAFE_TAGS) {
    const value = tags?.[key];
    if (key === "route" ? isSafeRoute(value) : boundedString(value, SAFE_METADATA)) {
      safeTags[key] = value;
    }
  }
  if (Object.keys(safeTags).length > 0) output.tags = safeTags;
  return output;
}

export function traceSampleRate(value: unknown): number {
  if (typeof value !== "string" || !/^(?:0(?:\.\d+)?|1(?:\.0+)?)$/.test(value.trim())) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : 0;
}

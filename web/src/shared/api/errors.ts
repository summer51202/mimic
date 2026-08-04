export type ApiErrorCode = string;

export class ApiError extends Error {
  readonly name: string = "ApiError";
  readonly status: number;
  readonly code: ApiErrorCode;

  constructor(status: number, code: ApiErrorCode, message?: string) {
    super(message ?? code);
    this.status = status;
    this.code = code;
  }
}

export class ApiConfigurationError extends Error {
  readonly name = "ApiConfigurationError";
}

export class ApiUnavailableError extends ApiError {
  readonly name = "ApiUnavailableError";

  constructor() {
    super(503, "UPSTREAM_UNAVAILABLE", "The API is unavailable.");
  }
}

export function mapApiError(status: number, codeOrMessage?: unknown): ApiError {
  const code = readSafeErrorCode(status, codeOrMessage);

  return new ApiError(status, code, messageForStatus(status, code));
}

function readSafeErrorCode(status: number, value: unknown): ApiErrorCode {
  if (typeof value === "string" && value.trim().length > 0) {
    return sanitizeErrorCode(value);
  }

  if (isRecord(value)) {
    const code =
      value.code ??
      (typeof value.message === "string" ? value.message : undefined) ??
      value.error;

    if (typeof code === "string" && code.trim().length > 0) {
      return sanitizeErrorCode(code);
    }
  }

  return `HTTP_${status}`;
}

function sanitizeErrorCode(value: string): ApiErrorCode {
  const normalized = value
    .trim()
    .replace(/[^A-Za-z0-9_-]/g, "_")
    .slice(0, 80);

  return normalized.length > 0 ? normalized : "API_ERROR";
}

function messageForStatus(status: number, code: ApiErrorCode): string {
  if (status === 401) {
    return "Authentication failed.";
  }

  if (status === 403) {
    return "You do not have permission to perform this action.";
  }

  if (status === 404) {
    return "The requested resource was not found.";
  }

  if (status >= 500) {
    return "The API is unavailable.";
  }

  return code;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

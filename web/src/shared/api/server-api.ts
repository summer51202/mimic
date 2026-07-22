import "server-only";

import { ApiConfigurationError, mapApiError } from "./errors";
import { ApiContractError, readEnvelope } from "./read-envelope";

interface ApiRequestOptions {
  accessToken?: string;
  requestId?: string;
  headers?: HeadersInit;
}

export async function postToApi<T>(
  path: string,
  body: unknown,
  options: ApiRequestOptions = {},
): Promise<T> {
  return requestToApi<T>(path, {
    ...options,
    method: "POST",
    body,
  });
}

type ApiRequestOptionsWithBody =
  | (ApiRequestOptions & {
      body?: never;
      method: "GET";
    })
  | (ApiRequestOptions & {
      body?: unknown;
      method: "DELETE" | "PATCH" | "POST" | "PUT";
    });

export async function requestToApi<T>(
  path: string,
  options: ApiRequestOptionsWithBody,
): Promise<T> {
  if (options.method === "GET" && typeof options.body !== "undefined") {
    throw new ApiContractError("GET requests cannot include a body.");
  }

  const response = await fetch(buildApiUrl(path), {
    method: options.method,
    headers: buildHeaders(options),
    body:
      typeof options.body === "undefined"
        ? undefined
        : JSON.stringify(options.body),
    cache: "no-store",
  });

  const payload = await readJson(response);

  if (!response.ok) {
    throw mapApiError(response.status, readErrorCode(payload));
  }

  return readEnvelope<T>(payload);
}

function buildApiUrl(path: string): string {
  const baseUrl = readApiBaseUrl();
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;

  return `${baseUrl.replace(/\/+$/, "")}/${normalizedPath}`;
}

function readApiBaseUrl(): string {
  const configuredUrl = process.env.MIMIC_API_BASE_URL;

  if (configuredUrl) {
    return configuredUrl;
  }

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000/api/v1";
  }

  throw new ApiConfigurationError(
    "MIMIC_API_BASE_URL is required outside development.",
  );
}

function buildHeaders(options: ApiRequestOptions): Headers {
  const headers = new Headers(options.headers);

  headers.set("accept", "application/json");

  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  if (options.accessToken) {
    headers.set("authorization", `Bearer ${options.accessToken}`);
  }

  if (options.requestId) {
    headers.set("x-request-id", options.requestId);
  }

  return headers;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiContractError("API response body is not valid JSON.");
  }
}

function readErrorCode(payload: unknown): unknown {
  if (!isRecord(payload)) {
    return undefined;
  }

  if (typeof payload.code === "string") {
    return payload.code;
  }

  if (typeof payload.message === "string") {
    return payload.message;
  }

  if (Array.isArray(payload.message)) {
    return "VALIDATION_ERROR";
  }

  if (typeof payload.error === "string") {
    return payload.error;
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

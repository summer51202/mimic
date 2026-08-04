import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ApiConfigurationError,
  ApiError,
  ApiUnavailableError,
} from "./errors";
import { ApiContractError } from "./read-envelope";
import { postToApi, requestToApi } from "./server-api";

vi.mock("server-only", () => ({}));

const fetchMock = vi.fn<typeof fetch>();

describe("server API boundary", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("MIMIC_API_BASE_URL", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses the development API base URL fallback and normalizes paths", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ok: true } }));

    await requestToApi("/auth/me", { method: "GET" });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/auth/me",
      expect.any(Object),
    );
  });

  it("throws ApiConfigurationError when production is missing MIMIC_API_BASE_URL", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MIMIC_API_BASE_URL", "");

    await expect(requestToApi("/auth/me", { method: "GET" })).rejects.toBeInstanceOf(
      ApiConfigurationError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends no-store JSON requests with a serialized body when provided", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ok: true } }));

    await postToApi("/auth/login", { email: "a@example.com", password: "secret" });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);

    expect(init.cache).toBe("no-store");
    expect(init.method).toBe("POST");
    expect(headers.get("accept")).toBe("application/json");
    expect(headers.get("content-type")).toBe("application/json");
    expect(init.body).toBe(
      JSON.stringify({ email: "a@example.com", password: "secret" }),
    );
  });

  it("does not send a body for GET requests without a body", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ok: true } }));

    await requestToApi("/auth/me", { method: "GET" });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(init.body).toBeUndefined();
  });

  it("propagates x-request-id when provided", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ok: true } }));

    await requestToApi("/auth/me", {
      method: "GET",
      requestId: "req_123",
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(new Headers(init.headers).get("x-request-id")).toBe("req_123");
  });

  it("sets bearer access tokens without logging them", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ok: true } }));

    await requestToApi("/auth/me", {
      method: "GET",
      accessToken: "access-token-secret",
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(new Headers(init.headers).get("authorization")).toBe(
      "Bearer access-token-secret",
    );
    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("returns data from successful API envelopes", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: "user_1" } }));

    await expect(requestToApi("/auth/me", { method: "GET" })).resolves.toEqual({
      id: "user_1",
    });
  });

  it("throws ApiContractError for invalid JSON responses", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("not json", {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    await expect(requestToApi("/auth/me", { method: "GET" })).rejects.toBeInstanceOf(
      ApiContractError,
    );
  });

  it("throws ApiContractError for malformed successful envelopes", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await expect(requestToApi("/auth/me", { method: "GET" })).rejects.toBeInstanceOf(
      ApiContractError,
    );
  });

  it("maps Nest exception message strings to API error codes", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          statusCode: 401,
          message: "INVALID_CREDENTIALS",
          error: "Unauthorized",
        },
        { status: 401 },
      ),
    );

    await expect(requestToApi("/auth/login", { method: "POST" })).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
      status: 401,
    } satisfies Partial<ApiError>);
  });

  it("maps Nest validation message arrays without leaking details as app codes", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          statusCode: 400,
          message: ["email must be an email"],
          error: "Bad Request",
        },
        { status: 400 },
      ),
    );

    await expect(requestToApi("/auth/login", { method: "POST" })).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400,
    } satisfies Partial<ApiError>);
  });

  it("maps fetch failures to ApiUnavailableError without exposing transport details", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed: private host"));

    const request = requestToApi("/auth/me", { method: "GET" });

    await expect(request).rejects.toMatchObject({
      code: "UPSTREAM_UNAVAILABLE",
      name: "ApiUnavailableError",
      status: 503,
    } satisfies Partial<ApiUnavailableError>);
    await expect(request).rejects.toBeInstanceOf(ApiUnavailableError);
    await expect(request).rejects.not.toMatchObject({
      message: expect.stringContaining("private host"),
    });
  });

  it("maps response body transport failures to ApiUnavailableError", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: vi.fn().mockRejectedValueOnce(
        new TypeError("body stream failed: private host"),
      ),
    } as unknown as Response);

    const request = requestToApi("/auth/me", { method: "GET" });

    await expect(request).rejects.toMatchObject({
      code: "UPSTREAM_UNAVAILABLE",
      message: "The API is unavailable.",
      status: 503,
    } satisfies Partial<ApiUnavailableError>);
    await expect(request).rejects.toBeInstanceOf(ApiUnavailableError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("passes the default timeout signal to fetch", async () => {
    const signal = new AbortController().signal;
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout").mockReturnValue(signal);
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ok: true } }));

    await requestToApi("/auth/me", { method: "GET" });

    expect(timeoutSpy).toHaveBeenCalledWith(8000);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal }),
    );
  });

  it("honors the test timeout override", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("MIMIC_API_BASE_URL", "http://api.test/api/v1");
    vi.stubEnv("MIMIC_API_TIMEOUT_MS", "25");
    const signal = new AbortController().signal;
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout").mockReturnValue(signal);
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ok: true } }));

    await requestToApi("/auth/me", { method: "GET" });

    expect(timeoutSpy).toHaveBeenCalledWith(25);
  });

  it("uses the default timeout when the test override is blank", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("MIMIC_API_BASE_URL", "http://api.test/api/v1");
    vi.stubEnv("MIMIC_API_TIMEOUT_MS", "");
    const timeoutSpy = vi
      .spyOn(AbortSignal, "timeout")
      .mockReturnValue(new AbortController().signal);
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ok: true } }));

    await requestToApi("/auth/me", { method: "GET" });

    expect(timeoutSpy).toHaveBeenCalledWith(8000);
  });

  it("attempts a failed write exactly once", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));

    await expect(postToApi("/groups", { name: "House" })).rejects.toBeInstanceOf(
      ApiUnavailableError,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects GET requests with bodies before calling fetch", async () => {
    await expect(
      requestToApi("/auth/me", {
        body: { ignored: true },
        method: "GET",
      } as unknown as Parameters<typeof requestToApi>[1]),
    ).rejects.toBeInstanceOf(ApiContractError);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: 200,
    ...init,
  });
}

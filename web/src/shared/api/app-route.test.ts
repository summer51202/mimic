import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ApiConfigurationError,
  ApiError,
  ApiUnavailableError,
} from "./errors";
import { ApiContractError } from "./read-envelope";
import { authenticatedApi } from "./authenticated-api";
import { forwardAppRoute } from "./app-route";

vi.mock("server-only", () => ({}));

vi.mock("./authenticated-api", () => ({
  authenticatedApi: vi.fn(),
}));

const authenticatedApiMock = vi.mocked(authenticatedApi);

describe("app route BFF forwarding", () => {
  beforeEach(() => {
    authenticatedApiMock.mockReset();
  });

  it("returns data envelopes with private no-store cache headers", async () => {
    authenticatedApiMock.mockResolvedValueOnce([{ id: "group_1" }]);

    const response = await forwardAppRoute(
      new Request("http://localhost/api/app/groups", {
        headers: { cookie: "mimic_access=access-secret" },
      }),
      "/groups",
      { body: "none" },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({
      data: [{ id: "group_1" }],
    });
    expect(authenticatedApiMock).toHaveBeenCalledWith(
      expect.any(Request),
      "/groups",
      { method: "GET" },
    );
  });

  it("validates CSRF and forwards JSON mutation bodies", async () => {
    authenticatedApiMock.mockResolvedValueOnce({ id: "group_1" });

    const response = await forwardAppRoute(
      requestWithCsrf({
        body: { name: "House" },
        csrfCookie: "csrf-token",
        csrfHeader: "csrf-token",
        method: "POST",
      }),
      "/groups",
      { body: "json" },
    );

    expect(response.status).toBe(200);
    expect(authenticatedApiMock).toHaveBeenCalledWith(
      expect.any(Request),
      "/groups",
      { body: { name: "House" }, method: "POST" },
    );
  });

  it("rejects missing CSRF for non-GET requests before upstream calls", async () => {
    const response = await forwardAppRoute(
      requestWithCsrf({
        body: { name: "House" },
        csrfCookie: "csrf-token",
        csrfHeader: "different",
        method: "POST",
      }),
      "/groups",
      { body: "json" },
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: { code: "CSRF_INVALID" },
    });
    expect(authenticatedApiMock).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON before upstream calls", async () => {
    const response = await forwardAppRoute(
      rawRequestWithCsrf({
        body: "{not-json",
        csrfCookie: "csrf-token",
        csrfHeader: "csrf-token",
        method: "POST",
      }),
      "/groups",
      { body: "json" },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { code: "INVALID_JSON" },
    });
    expect(authenticatedApiMock).not.toHaveBeenCalled();
  });

  it.each([
    [new ApiError(404, "GROUP_NOT_FOUND"), 404, "GROUP_NOT_FOUND"],
    [new ApiConfigurationError("missing API URL"), 500, "API_CONFIGURATION_ERROR"],
    [new ApiContractError("bad envelope"), 502, "API_CONTRACT_ERROR"],
    [new ApiUnavailableError(), 503, "UPSTREAM_UNAVAILABLE"],
    [new TypeError("fetch failed"), 502, "UPSTREAM_UNAVAILABLE"],
  ])("maps %s to a safe app error response", async (error, status, code) => {
    authenticatedApiMock.mockRejectedValueOnce(error);

    const response = await forwardAppRoute(
      new Request("http://localhost/api/app/groups", {
        headers: {
          cookie: "mimic_access=access-secret",
          "x-request-id": "req_123",
        },
      }),
      "/groups",
      { body: "none" },
    );

    expect(response.status).toBe(status);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("x-request-id")).toBe("req_123");
    await expect(response.json()).resolves.toEqual({ error: { code } });
  });
});

describe("explicit app route handlers", () => {
  beforeEach(() => {
    authenticatedApiMock.mockReset();
    authenticatedApiMock.mockResolvedValue({ ok: true });
  });

  it.each([
    ["GET groups", () => import("@/app/api/app/groups/route"), "GET", undefined, "/groups"],
    ["POST groups", () => import("@/app/api/app/groups/route"), "POST", undefined, "/groups"],
    [
      "GET group detail",
      () => import("@/app/api/app/groups/[groupId]/route"),
      "GET",
      { groupId: "group_1" },
      "/groups/group_1",
    ],
    [
      "PATCH group detail",
      () => import("@/app/api/app/groups/[groupId]/route"),
      "PATCH",
      { groupId: "group_1" },
      "/groups/group_1",
    ],
    [
      "GET members",
      () => import("@/app/api/app/groups/[groupId]/members/route"),
      "GET",
      { groupId: "group_1" },
      "/groups/group_1/members",
    ],
    [
      "POST leave",
      () => import("@/app/api/app/groups/[groupId]/leave/route"),
      "POST",
      { groupId: "group_1" },
      "/groups/group_1/leave",
    ],
    [
      "POST invites",
      () => import("@/app/api/app/groups/[groupId]/invites/route"),
      "POST",
      { groupId: "group_1" },
      "/groups/group_1/invites",
    ],
    [
      "POST accept invite",
      () => import("@/app/api/app/group-invites/accept/route"),
      "POST",
      undefined,
      "/group-invites/accept",
    ],
    [
      "GET funds",
      () => import("@/app/api/app/groups/[groupId]/funds/route"),
      "GET",
      { groupId: "group_1" },
      "/groups/group_1/funds",
    ],
    [
      "POST funds",
      () => import("@/app/api/app/groups/[groupId]/funds/route"),
      "POST",
      { groupId: "group_1" },
      "/groups/group_1/funds",
    ],
    [
      "GET dashboard",
      () => import("@/app/api/app/groups/[groupId]/dashboard/route"),
      "GET",
      { groupId: "group_1" },
      "/groups/group_1/dashboard",
    ],
    [
      "GET fund summary",
      () => import("@/app/api/app/funds/[fundId]/summary/route"),
      "GET",
      { fundId: "fund_1" },
      "/funds/fund_1/summary",
    ],
  ])("%s forwards to the expected upstream path", async (_name, load, method, params, path) => {
    const route = await load();
    const routeHandlers = route as unknown as Record<
      string,
      (
        request: Request,
        context?: { params: Promise<Record<string, string>> },
      ) => Promise<Response>
    >;
    const handler = routeHandlers[method];

    expect(handler).toBeDefined();

    const typedHandler = handler as (
      request: Request,
      context?: { params: Promise<Record<string, string>> },
    ) => Promise<Response>;
    const request = requestForMethod(method);

    const response = await typedHandler(
      request,
      params ? { params: Promise.resolve(params) } : undefined,
    );

    expect(response.status).toBe(200);
    expect(authenticatedApiMock).toHaveBeenCalledWith(
      expect.any(Request),
      path,
      expect.objectContaining({ method }),
    );
  });

  it("uses no body for the bodyless leave mutation", async () => {
    const route = await import("@/app/api/app/groups/[groupId]/leave/route");

    await route.POST(requestForMethod("POST"), {
      params: Promise.resolve({ groupId: "group_1" }),
    });

    expect(authenticatedApiMock).toHaveBeenCalledWith(
      expect.any(Request),
      "/groups/group_1/leave",
      { method: "POST" },
    );
  });

  it("rejects invalid route ids before forwarding", async () => {
    const route = await import("@/app/api/app/groups/[groupId]/members/route");

    const response = await route.GET(
      requestForMethod("GET", { requestId: "req_invalid" }),
      {
      params: Promise.resolve({ groupId: " " }),
      },
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("x-request-id")).toBe("req_invalid");
    await expect(response.json()).resolves.toEqual({
      error: { code: "INVALID_ID" },
    });
    expect(authenticatedApiMock).not.toHaveBeenCalled();
  });
});

function requestWithCsrf(options: {
  body: unknown;
  csrfCookie: string;
  csrfHeader: string;
  method: string;
}): Request {
  return rawRequestWithCsrf({
    ...options,
    body: JSON.stringify(options.body),
  });
}

function rawRequestWithCsrf(options: {
  body: string;
  csrfCookie: string;
  csrfHeader: string;
  method: string;
}): Request {
  return new Request("http://localhost/api/app/groups", {
    body: options.body,
    headers: {
      "content-type": "application/json",
      cookie: `mimic_access=access-secret; mimic_csrf=${options.csrfCookie}`,
      "x-csrf-token": options.csrfHeader,
    },
    method: options.method,
  });
}

function requestForMethod(
  method: string,
  options: { requestId?: string } = {},
): Request {
  const headers: Record<string, string> = {
    cookie: "mimic_access=access-secret; mimic_csrf=csrf-token",
    "x-csrf-token": "csrf-token",
  };

  if (options.requestId) {
    headers["x-request-id"] = options.requestId;
  }

  const init: RequestInit = {
    headers,
    method,
  };

  if (method !== "GET") {
    init.body = JSON.stringify({ name: "House" });
  }

  return new Request("http://localhost/api/app/test", init);
}

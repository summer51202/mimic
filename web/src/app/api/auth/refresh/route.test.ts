import { beforeEach, describe, expect, it, vi } from "vitest";

import { postToApi } from "@/shared/api/server-api";
import { authCookies } from "@/shared/auth/cookies";

import { GET, POST } from "./route";

vi.mock("server-only", () => ({}));

vi.mock("@/shared/api/server-api", () => ({
  postToApi: vi.fn(),
}));

const postToApiMock = vi.mocked(postToApi);

describe("GET /api/auth/refresh", () => {
  beforeEach(() => {
    postToApiMock.mockReset();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("MIMIC_COOKIE_SECURE", "");
  });

  it.each([
    ["/app", "http://localhost/app"],
    ["/app/settings", "http://localhost/app/settings"],
    ["/invite/abcDEF123_-4", "http://localhost/invite/abcDEF123_-4"],
  ])("redirects to accepted returnTo value %s", async (returnTo, location) => {
    postToApiMock.mockResolvedValueOnce(authPayload());

    const response = await GET(refreshRequest(returnTo));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(location);
  });

  it.each([
    "/api/auth/refresh",
    "/login",
    "/register",
    "https://evil.example/app",
    "//evil.example/app",
    "/app\\settings",
    "/app/../api/auth/refresh?returnTo=%2Fapp%2F..%2Fapi%2Fauth%2Frefresh",
  ])("falls back to /app for unsafe returnTo value %s", async (returnTo) => {
    postToApiMock.mockResolvedValueOnce(authPayload());

    const response = await GET(refreshRequest(returnTo));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/app");
  });
});

describe("POST /api/auth/refresh", () => {
  beforeEach(() => {
    postToApiMock.mockReset();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("MIMIC_COOKIE_SECURE", "");
  });

  it("rotates the session cookies and returns a token-free success response", async () => {
    postToApiMock.mockResolvedValueOnce(authPayload());

    const response = await POST(programmaticRefreshRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(postToApiMock).toHaveBeenCalledWith("/auth/refresh", {
      refresh_token: "refresh-secret",
    });

    const setCookies = response.headers.getSetCookie();
    expect(setCookies).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`${authCookies.access}=${jwtLikeToken()}`),
        expect.stringContaining(
          `${authCookies.refresh}=rotated-refresh-secret`,
        ),
        expect.stringContaining(`${authCookies.csrf}=`),
      ]),
    );
  });

  it("rejects programmatic refresh with invalid CSRF", async () => {
    const response = await POST(
      programmaticRefreshRequest({ csrfHeader: "different" }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "CSRF_INVALID" });
    expect(postToApiMock).not.toHaveBeenCalled();
  });

  it("rejects programmatic refresh without a refresh cookie", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/refresh", {
        headers: {
          cookie: `${authCookies.csrf}=csrf-token`,
          "x-csrf-token": "csrf-token",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: { code: "SESSION_REQUIRED" },
    });
    expect(postToApiMock).not.toHaveBeenCalled();
    expect(response.headers.getSetCookie()).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`${authCookies.access}=;`),
        expect.stringContaining(`${authCookies.refresh}=;`),
        expect.stringContaining(`${authCookies.csrf}=;`),
      ]),
    );
  });

  it("clears the session when programmatic refresh fails", async () => {
    postToApiMock.mockRejectedValueOnce(new Error("refresh rejected"));

    const response = await POST(programmaticRefreshRequest());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: { code: "SESSION_REQUIRED" },
    });
    expect(response.headers.getSetCookie()).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`${authCookies.access}=;`),
        expect.stringContaining(`${authCookies.refresh}=;`),
        expect.stringContaining(`${authCookies.csrf}=;`),
      ]),
    );
  });
});

function refreshRequest(returnTo: string): Request {
  return new Request(
    `http://localhost/api/auth/refresh?returnTo=${encodeURIComponent(returnTo)}`,
    {
      headers: {
        cookie: `${authCookies.refresh}=refresh-secret`,
      },
    },
  );
}

function programmaticRefreshRequest(
  options: {
    csrfCookie?: string;
    csrfHeader?: string;
    refreshToken?: string;
  } = {},
): Request {
  const csrfCookie = options.csrfCookie ?? "csrf-token";
  const csrfHeader = options.csrfHeader ?? "csrf-token";
  const refreshToken = options.refreshToken ?? "refresh-secret";

  return new Request("http://localhost/api/auth/refresh", {
    headers: {
      cookie: `${authCookies.refresh}=${refreshToken}; ${authCookies.csrf}=${csrfCookie}`,
      "x-csrf-token": csrfHeader,
    },
    method: "POST",
  });
}

function authPayload() {
  return {
    access_token: jwtLikeToken(),
    refresh_token: "rotated-refresh-secret",
    user: {
      id: "user_1",
    },
  };
}

function jwtLikeToken(): string {
  return ["header", "payload", "signature"]
    .map((part) => Buffer.from(part).toString("base64url"))
    .join(".");
}

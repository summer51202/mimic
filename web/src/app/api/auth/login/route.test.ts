import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/shared/api/errors";
import { postToApi } from "@/shared/api/server-api";
import { authCookies } from "@/shared/auth/cookies";

import { POST } from "./route";
import { POST as POST_REGISTER } from "../register/route";
import { POST as POST_LOGOUT } from "../logout/route";

vi.mock("server-only", () => ({}));

vi.mock("@/shared/api/server-api", () => ({
  postToApi: vi.fn(),
}));

const postToApiMock = vi.mocked(postToApi);

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    postToApiMock.mockReset();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("MIMIC_COOKIE_SECURE", "");
  });

  it("sets HttpOnly auth cookies and returns the user without tokens", async () => {
    postToApiMock.mockResolvedValueOnce({
      access_token: "access-secret",
      refresh_token: "refresh-secret",
      user: {
        display_name: "Mina",
        email: "mina@example.com",
        id: "user_1",
      },
    });

    const response = await POST(
      requestWithCsrf({
        body: { email: "mina@example.com", password: "correct horse" },
        csrfCookie: "csrf-token",
        csrfHeader: "csrf-token",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      user: {
        display_name: "Mina",
        email: "mina@example.com",
        id: "user_1",
      },
    });
    expect(postToApiMock).toHaveBeenCalledWith("/auth/login", {
      email: "mina@example.com",
      password: "correct horse",
    });

    const setCookies = response.headers.getSetCookie();
    expectCookie(setCookies, authCookies.access, [
      "HttpOnly",
      "SameSite=lax",
      "Path=/",
      "Max-Age=900",
    ]);
    expectCookie(setCookies, authCookies.refresh, [
      "HttpOnly",
      "SameSite=lax",
      "Path=/",
      "Max-Age=2592000",
    ]);
    expectCookie(setCookies, authCookies.csrf, [
      "SameSite=lax",
      "Path=/",
    ]);
    expect(
      setCookies.find((cookie) => cookie.startsWith(`${authCookies.csrf}=`)),
    ).not.toContain("HttpOnly");
  });

  it("rejects CSRF mismatches before calling the backend", async () => {
    const response = await POST(
      requestWithCsrf({
        body: { email: "mina@example.com", password: "correct horse" },
        csrfCookie: "csrf-token",
        csrfHeader: "different",
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "CSRF_INVALID" });
    expect(postToApiMock).not.toHaveBeenCalled();
  });

  it("maps login API errors to safe JSON responses", async () => {
    postToApiMock.mockRejectedValueOnce(
      new ApiError(401, "INVALID_CREDENTIALS", "Authentication failed."),
    );

    const response = await POST(
      requestWithCsrf({
        body: { email: "mina@example.com", password: "wrong password" },
        csrfCookie: "csrf-token",
        csrfHeader: "csrf-token",
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: { code: "INVALID_CREDENTIALS" },
    });
  });

  it("rejects invalid login JSON without calling the backend", async () => {
    const response = await POST(
      rawRequestWithCsrf({
        body: "{not-json",
        csrfCookie: "csrf-token",
        csrfHeader: "csrf-token",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { code: "INVALID_JSON" },
    });
    expect(postToApiMock).not.toHaveBeenCalled();
  });

  it("rejects malformed CSRF cookie encoding without throwing", async () => {
    const response = await POST(
      rawRequestWithCsrf({
        body: JSON.stringify({
          email: "mina@example.com",
          password: "correct horse",
        }),
        csrfCookie: "%E0%A4%A",
        csrfHeader: "csrf-token",
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "CSRF_INVALID" });
    expect(postToApiMock).not.toHaveBeenCalled();
  });

  it("maps register displayName to display_name and keeps tokens out of the JSON response", async () => {
    postToApiMock.mockResolvedValueOnce({
      access_token: "access-secret",
      refresh_token: "refresh-secret",
      user: {
        display_name: "Mina",
        email: "mina@example.com",
        id: "user_1",
      },
    });

    const response = await POST_REGISTER(
      requestWithCsrf({
        body: {
          displayName: "Mina",
          email: "mina@example.com",
          password: "correct horse",
        },
        csrfCookie: "csrf-token",
        csrfHeader: "csrf-token",
        url: "http://localhost/api/auth/register",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      user: {
        display_name: "Mina",
        email: "mina@example.com",
        id: "user_1",
      },
    });
    expect(postToApiMock).toHaveBeenCalledWith("/auth/register", {
      display_name: "Mina",
      email: "mina@example.com",
      password: "correct horse",
    });
  });

  it("maps register API errors to safe JSON responses", async () => {
    postToApiMock.mockRejectedValueOnce(
      new ApiError(400, "VALIDATION_ERROR", "display_name must not be empty"),
    );

    const response = await POST_REGISTER(
      requestWithCsrf({
        body: {
          displayName: "",
          email: "mina@example.com",
          password: "correct horse",
        },
        csrfCookie: "csrf-token",
        csrfHeader: "csrf-token",
        url: "http://localhost/api/auth/register",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { code: "VALIDATION_ERROR" },
    });
  });

  it("clears auth and CSRF cookies during logout", async () => {
    postToApiMock.mockRejectedValueOnce(new Error("logout unsupported"));

    const response = await POST_LOGOUT(
      requestWithCsrf({
        body: {},
        csrfCookie: "csrf-token",
        csrfHeader: "csrf-token",
        extraCookie: `${authCookies.access}=access-secret`,
        url: "http://localhost/api/auth/logout",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(postToApiMock).toHaveBeenCalledWith(
      "/auth/logout",
      {},
      { accessToken: "access-secret" },
    );

    const setCookies = response.headers.getSetCookie();
    expectCookie(setCookies, authCookies.access, ["Max-Age=0", "Path=/"]);
    expectCookie(setCookies, authCookies.refresh, ["Max-Age=0", "Path=/"]);
    expectCookie(setCookies, authCookies.csrf, ["Max-Age=0", "Path=/"]);
  });

  it("rejects authenticated logout without CSRF before calling the backend", async () => {
    const response = await POST_LOGOUT(
      requestWithCsrf({
        body: {},
        extraCookie: [
          `${authCookies.access}=access-secret`,
          `${authCookies.refresh}=refresh-secret`,
        ].join("; "),
        url: "http://localhost/api/auth/logout",
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "CSRF_INVALID" });
    expect(postToApiMock).not.toHaveBeenCalled();
  });

  it("keeps no-session logout idempotent without requiring CSRF", async () => {
    const response = await POST_LOGOUT(
      requestWithCsrf({
        body: {},
        url: "http://localhost/api/auth/logout",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(postToApiMock).not.toHaveBeenCalled();

    const setCookies = response.headers.getSetCookie();
    expectCookie(setCookies, authCookies.access, ["Max-Age=0", "Path=/"]);
    expectCookie(setCookies, authCookies.refresh, ["Max-Age=0", "Path=/"]);
    expectCookie(setCookies, authCookies.csrf, ["Max-Age=0", "Path=/"]);
  });
});

function requestWithCsrf(options: {
  body: unknown;
  csrfCookie?: string;
  csrfHeader?: string;
  extraCookie?: string;
  url?: string;
}): Request {
  return rawRequestWithCsrf({
    ...options,
    body: JSON.stringify(options.body),
  });
}

function rawRequestWithCsrf(options: {
  body: string;
  csrfCookie?: string;
  csrfHeader?: string;
  extraCookie?: string;
  url?: string;
}): Request {
  const cookies = [
    options.csrfCookie ? `${authCookies.csrf}=${options.csrfCookie}` : undefined,
    options.extraCookie,
  ]
    .filter(Boolean)
    .join("; ");
  const headers = new Headers({
    "content-type": "application/json",
  });

  if (cookies) {
    headers.set("cookie", cookies);
  }

  if (options.csrfHeader) {
    headers.set("x-csrf-token", options.csrfHeader);
  }

  return new Request(options.url ?? "http://localhost/api/auth/login", {
    body: options.body,
    headers,
    method: "POST",
  });
}

function expectCookie(
  cookies: string[],
  name: string,
  attributes: string[],
): void {
  const cookie = cookies.find((value) => value.startsWith(`${name}=`));

  expect(cookie).toBeDefined();
  for (const attribute of attributes) {
    expect(cookie).toContain(attribute);
  }
}

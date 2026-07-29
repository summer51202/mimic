import { beforeEach, describe, expect, it, vi } from "vitest";

import { postToApi } from "@/shared/api/server-api";
import { authCookies } from "@/shared/auth/cookies";

import { GET } from "./route";

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

function authPayload() {
  return {
    access_token: jwtLikeToken(),
    refresh_token: "refresh-secret",
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

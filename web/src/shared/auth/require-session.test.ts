import { beforeEach, describe, expect, it, vi } from "vitest";

import { authCookies } from "@/shared/auth/cookies";

import { requireSession } from "./require-session";

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new RedirectError(path);
  }),
}));

class RedirectError extends Error {
  constructor(readonly path: string) {
    super(`Redirected to ${path}`);
  }
}

describe("requireSession", () => {
  beforeEach(async () => {
    const { cookies } = await import("next/headers");

    vi.mocked(cookies).mockReset();
  });

  it("redirects malformed access tokens with a refresh token to refresh", async () => {
    await mockCookies({
      [authCookies.access]: "not-a-jwt",
      [authCookies.refresh]: "refresh-secret",
    });

    await expect(requireSession()).rejects.toMatchObject({
      path: "/api/auth/refresh?returnTo=%2Fapp",
    });
  });

  it("redirects malformed access tokens without a refresh token to login", async () => {
    await mockCookies({
      [authCookies.access]: "not-a-jwt",
    });

    await expect(requireSession()).rejects.toMatchObject({
      path: "/login?returnTo=%2Fapp",
    });
  });

  it("returns an authenticated session for a validly shaped access token", async () => {
    await mockCookies({
      [authCookies.access]: "aaa.bbb.ccc",
    });

    await expect(requireSession()).resolves.toEqual({
      isAuthenticated: true,
      user: null,
    });
  });
});

async function mockCookies(values: Record<string, string>): Promise<void> {
  const { cookies } = await import("next/headers");

  vi.mocked(cookies).mockResolvedValue({
    get(name: string) {
      const value = values[name];

      return value ? { name, value } : undefined;
    },
  } as Awaited<ReturnType<typeof cookies>>);
}

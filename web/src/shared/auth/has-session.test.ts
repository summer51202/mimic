import { beforeEach, describe, expect, it, vi } from "vitest";

import { authCookies } from "@/shared/auth/cookies";

import { hasSession } from "./has-session";

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

describe("hasSession", () => {
  beforeEach(async () => {
    const { cookies } = await import("next/headers");

    vi.mocked(cookies).mockReset();
  });

  it("returns false when the access cookie is missing", async () => {
    await mockCookies({});

    await expect(hasSession()).resolves.toBe(false);
  });

  it("returns false for an undefined access cookie", async () => {
    await mockCookies({
      [authCookies.access]: undefined,
    });

    await expect(hasSession()).resolves.toBe(false);
  });

  it("returns false for a malformed access token", async () => {
    await mockCookies({
      [authCookies.access]: "not-a-jwt",
    });

    await expect(hasSession()).resolves.toBe(false);
  });

  it("returns false for a whitespace-padded access token", async () => {
    await mockCookies({
      [authCookies.access]: " aaa.bbb.ccc ",
    });

    await expect(hasSession()).resolves.toBe(false);
  });

  it("returns true for a validly shaped access token", async () => {
    await mockCookies({
      [authCookies.access]: "aaa.bbb.ccc",
    });

    await expect(hasSession()).resolves.toBe(true);
  });
});

async function mockCookies(
  values: Record<string, string | undefined>,
): Promise<void> {
  const { cookies } = await import("next/headers");

  vi.mocked(cookies).mockResolvedValue({
    get(name: string) {
      const value = values[name];

      return value === undefined ? undefined : { name, value };
    },
  } as Awaited<ReturnType<typeof cookies>>);
}

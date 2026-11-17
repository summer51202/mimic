import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { requestToApi } from "@/shared/api/server-api";
import { syncLocaleAfterAuthentication } from "./locale-cookie";

vi.mock("@/shared/api/server-api", () => ({ requestToApi: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

describe("locale after login or registration", () => {
  beforeEach(() => vi.mocked(requestToApi).mockReset());

  it.each([
    ["en", "en", undefined, undefined],
    ["en", "zh-TW", "en", undefined],
    ["zh-TW", "en", "zh-TW", undefined],
    [undefined, "zh-TW", undefined, "zh-TW"],
    [undefined, "en", undefined, "en"],
    [undefined, "ja", undefined, undefined],
    ["en", "ja", "en", undefined],
    ["en", undefined, "en", undefined],
  ])("reconciles device %s with account %s", async (device, account, patch, cookie) => {
    const request = new Request("http://localhost/api/auth/login", {
      headers: device ? { cookie: `mimic-locale=${device}` } : {},
    });
    const response = NextResponse.json({});
    await syncLocaleAfterAuthentication(request, response, {
      user: { locale: account }, access_token: "fresh-access", refresh_token: "fresh-refresh",
    });
    if (patch) {
      expect(requestToApi).toHaveBeenCalledWith("/me", {
        method: "PATCH", accessToken: "fresh-access", body: { locale: patch },
      });
    } else {
      expect(requestToApi).not.toHaveBeenCalled();
    }
    expect(response.cookies.get("mimic-locale")?.value).toBe(cookie);
  });

  it("retains successful authentication when account synchronization fails", async () => {
    vi.mocked(requestToApi).mockRejectedValueOnce(new Error("offline"));
    await expect(syncLocaleAfterAuthentication(
      new Request("http://localhost/api/auth/register", { headers: { cookie: "mimic-locale=en" } }),
      NextResponse.json({ user: {} }),
      { user: {}, access_token: "access", refresh_token: "refresh" },
    )).resolves.toBeUndefined();
  });
});

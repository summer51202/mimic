import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { authenticatedApi } from "@/shared/api/authenticated-api";
import { authCookies } from "@/shared/auth/cookies";

vi.mock("@/shared/api/authenticated-api", () => ({ authenticatedApi: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

function request(locale: unknown, session = false, csrf = true) {
  return new Request("http://localhost/api/locale", {
    method: "POST",
    body: JSON.stringify({ locale }),
    headers: {
      cookie: `${authCookies.csrf}=test-token${session ? `; ${authCookies.access}=access` : ""}`,
      "x-csrf-token": csrf ? "test-token" : "other",
    },
  });
}

describe("POST /api/locale", () => {
  beforeEach(() => vi.mocked(authenticatedApi).mockReset());

  it.each(["fr", "en-US", null])("rejects %s", async (locale) => {
    const response = await POST(request(locale));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: { code: "LOCALE_UNSUPPORTED" } });
    expect(response.cookies.get("mimic-locale")).toBeUndefined();
  });

  it("accepts Japanese and synchronizes the account", async () => {
    const input = request("ja", true);
    const response = await POST(input);
    expect(response.status).toBe(200);
    expect(response.cookies.get("mimic-locale")?.value).toBe("ja");
    expect(authenticatedApi).toHaveBeenCalledWith(input, "/me", { method: "PATCH", body: { locale: "ja" } });
  });

  it("requires the existing double-submit CSRF token", async () => {
    expect((await POST(request("en", false, false))).status).toBe(403);
  });

  it("stores an anonymous choice without contacting the API", async () => {
    const response = await POST(request("en"));
    expect(await response.json()).toEqual({ locale: "en", synced: false });
    expect(response.cookies.get("mimic-locale")).toMatchObject({
      value: "en", path: "/", sameSite: "lax", maxAge: 31_536_000,
    });
    expect(response.headers.get("set-cookie")).not.toMatch(/HttpOnly/i);
    expect(authenticatedApi).not.toHaveBeenCalled();
  });

  it("synchronizes an authenticated choice", async () => {
    const input = request("en", true);
    const response = await POST(input);
    expect(authenticatedApi).toHaveBeenCalledWith(input, "/me", { method: "PATCH", body: { locale: "en" } });
    expect(await response.json()).toEqual({ locale: "en", synced: true });
  });

  it("keeps the cookie when account synchronization fails", async () => {
    vi.mocked(authenticatedApi).mockRejectedValueOnce(new Error("offline"));
    const response = await POST(request("en", true));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ locale: "en", synced: false });
    expect(response.cookies.get("mimic-locale")?.value).toBe("en");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

import { AppClientError, appFetch } from "./app-fetch";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("appFetch", () => {
  it("refreshes once with the original csrf token and retries with a fresh token", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ token: "csrf-before" }))
      .mockResolvedValueOnce(Response.json({}, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ ok: true }))
      .mockResolvedValueOnce(Response.json({ token: "csrf-after" }))
      .mockResolvedValueOnce(Response.json({ data: { id: "g1" } }, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      appFetch<{ data: { id: string } }>("/api/app/groups", {
        body: JSON.stringify({ name: "Home" }),
        headers: { "x-csrf-token": "stale-caller-token" },
        method: "POST",
      }),
    ).resolves.toEqual({ data: { id: "g1" } });

    expect(fetchMock.mock.calls.map(([input]) => String(input))).toEqual([
      "/api/auth/csrf",
      "/api/app/groups",
      "/api/auth/refresh",
      "/api/auth/csrf",
      "/api/app/groups",
    ]);
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      headers: {
        "content-type": "application/json",
        "x-csrf-token": "csrf-before",
      },
      method: "POST",
    });
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      headers: { "x-csrf-token": "csrf-before" },
    });
    expect(fetchMock.mock.calls[4]?.[1]).toMatchObject({
      headers: {
        "content-type": "application/json",
        "x-csrf-token": "csrf-after",
      },
    });
  });

  it("stops after the retried mutation returns 401", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ token: "csrf-before" }))
      .mockResolvedValueOnce(Response.json({}, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ ok: true }))
      .mockResolvedValueOnce(Response.json({ token: "csrf-after" }))
      .mockResolvedValueOnce(Response.json({}, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    const error = await appFetch("/api/app/groups", {
      body: "{}",
      method: "POST",
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AppClientError);
    expect(error).toMatchObject({ code: "HTTP_401", status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it("does not retry the mutation when refresh is rejected", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ token: "csrf-token" }))
      .mockResolvedValueOnce(Response.json({}, { status: 401 }))
      .mockResolvedValueOnce(
        Response.json(
          { error: { code: "SESSION_REQUIRED" } },
          { status: 401 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const error = await appFetch("/api/app/groups", {
      body: "{}",
      method: "POST",
    }).catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: "SESSION_REQUIRED", status: 401 });
    expect(
      fetchMock.mock.calls.filter(
        ([input]) => String(input) === "/api/app/groups",
      ),
    ).toHaveLength(1);
  });

  it("preserves caller headers while making generated csrf authoritative", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ token: "csrf-token" }))
      .mockResolvedValueOnce(Response.json({ data: { ok: true } }));
    vi.stubGlobal("fetch", fetchMock);

    await appFetch("/api/app/groups", {
      headers: {
        "x-feature": "settings",
        "x-csrf-token": "caller-token",
      },
      method: "PATCH",
    });

    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      headers: {
        "content-type": "application/json",
        "x-feature": "settings",
        "x-csrf-token": "csrf-token",
      },
    });
  });

  it("returns undefined for a successful empty response", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(Response.json({ token: "csrf-token" }))
        .mockResolvedValueOnce(new Response(null, { status: 204 })),
    );

    await expect(
      appFetch<void>("/api/app/resource", { method: "DELETE" }),
    ).resolves.toBeUndefined();
  });
});

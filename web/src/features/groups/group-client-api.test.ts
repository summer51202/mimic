import { afterEach, describe, expect, it, vi } from "vitest";

import { appFetch, GroupClientError, groupErrorMessage } from "./group-client-api";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("appFetch", () => {
  it("refreshes once with the original csrf token and retries with a fresh token", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ token: "csrf-before" }))
      .mockResolvedValueOnce(
        Response.json(
          { error: { code: "SESSION_REQUIRED" } },
          { status: 401 },
        ),
      )
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

    expect(fetchMock).toHaveBeenCalledTimes(5);
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
      headers: {
        "x-csrf-token": "csrf-before",
      },
    });
    expect(fetchMock.mock.calls[4]?.[1]).toMatchObject({
      body: JSON.stringify({ name: "Home" }),
      headers: {
        "content-type": "application/json",
        "x-csrf-token": "csrf-after",
      },
      method: "POST",
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

    expect(error).toBeInstanceOf(GroupClientError);
    expect(groupErrorMessage(error)).toBe(
      "Your session expired. Sign in again, then retry.",
    );
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(
      fetchMock.mock.calls.filter(
        ([input]) => String(input) === "/api/auth/refresh",
      ),
    ).toHaveLength(1);
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

    expect(groupErrorMessage(error)).toBe(
      "Your session expired. Sign in again, then retry.",
    );
    expect(
      fetchMock.mock.calls.filter(
        ([input]) => String(input) === "/api/app/groups",
      ),
    ).toHaveLength(1);
  });

  it("keeps non-401 failures on the existing generic error path", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ token: "csrf-token" }))
      .mockResolvedValueOnce(Response.json({}, { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);

    const error = await appFetch("/api/app/groups", {
      body: "{}",
      method: "POST",
    }).catch((caught: unknown) => caught);

    expect(groupErrorMessage(error)).toBe(
      "The service is temporarily unavailable. Mimiku kept your changes.",
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

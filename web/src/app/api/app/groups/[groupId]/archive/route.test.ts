import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

import {
  forwardAppRoute,
  readRouteIdParam,
} from "@/shared/api/app-route";

import { POST } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/shared/api/app-route", () => ({
  forwardAppRoute: vi.fn(),
  readRouteIdParam: vi.fn(),
}));

const forward = vi.mocked(forwardAppRoute);
const readGroupId = vi.mocked(readRouteIdParam);

beforeEach(() => {
  forward.mockReset();
  readGroupId.mockReset();
  readGroupId.mockResolvedValue({ ok: true, value: "g1" });
});

describe("POST /api/app/groups/[groupId]/archive", () => {
  it("forwards archive and clears the remembered group cookie after success", async () => {
    forward.mockResolvedValueOnce(
      NextResponse.json({ archived: true }, { status: 201 }),
    );
    const request = new Request("http://localhost", { method: "POST" });

    const response = await POST(request, {
      params: Promise.resolve({ groupId: "g1" }),
    });

    expect(forward).toHaveBeenCalledWith(request, "/groups/g1/archive", {
      body: "none",
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ archived: true });
    expect(response.headers.get("set-cookie")).toContain("mimic_group=");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("preserves a financial-history conflict without clearing the cookie", async () => {
    forward.mockResolvedValueOnce(
      NextResponse.json(
        { error: { code: "GROUP_HAS_FINANCIAL_HISTORY" } },
        { status: 409 },
      ),
    );

    const response = await POST(
      new Request("http://localhost", { method: "POST" }),
      { params: Promise.resolve({ groupId: "g1" }) },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: { code: "GROUP_HAS_FINANCIAL_HISTORY" },
    });
    expect(response.headers.has("set-cookie")).toBe(false);
  });

  it("returns an invalid-param response without forwarding", async () => {
    const invalidResponse = NextResponse.json(
      { error: { code: "INVALID_ID" } },
      { status: 400 },
    );
    readGroupId.mockResolvedValueOnce({
      ok: false,
      response: invalidResponse,
    });

    const response = await POST(
      new Request("http://localhost", {
        headers: { "x-request-id": "request-1" },
        method: "POST",
      }),
      { params: Promise.resolve({ groupId: "bad id" }) },
    );

    expect(response).toBe(invalidResponse);
    expect(readGroupId).toHaveBeenCalledWith(
      expect.any(Promise),
      "groupId",
      "request-1",
    );
    expect(forward).not.toHaveBeenCalled();
  });
});

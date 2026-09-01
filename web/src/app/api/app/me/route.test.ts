import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

import { forwardAppRoute } from "@/shared/api/app-route";

import { PATCH } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/shared/api/app-route", () => ({
  forwardAppRoute: vi.fn(),
}));

const forward = vi.mocked(forwardAppRoute);

beforeEach(() => forward.mockReset());

describe("PATCH /api/app/me", () => {
  it("forwards the profile JSON mutation through the shared BFF boundary", async () => {
    const upstreamResponse = NextResponse.json({
      data: { display_name: "Edward Lee" },
    });
    forward.mockResolvedValueOnce(upstreamResponse);
    const request = new Request("http://localhost/api/app/me", {
      body: JSON.stringify({ display_name: "Edward Lee" }),
      method: "PATCH",
    });

    const response = await PATCH(request);

    expect(response).toBe(upstreamResponse);
    expect(forward).toHaveBeenCalledWith(request, "/me", { body: "json" });
  });
});

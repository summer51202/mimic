import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

import { forwardAppRoute } from "@/shared/api/app-route";

import { POST } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/shared/api/app-route", () => ({
  forwardAppRoute: vi.fn(),
  readRouteIdParam: vi.fn(async () => ({ ok: true, value: "g1" })),
}));

const forward = vi.mocked(forwardAppRoute);

beforeEach(() => forward.mockReset());

describe("POST /api/app/groups/[groupId]/leave", () => {
  it("clears the remembered group cookie after a successful leave", async () => {
    forward.mockResolvedValueOnce(new NextResponse(null, { status: 204 }));

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ groupId: "g1" }),
    });

    expect(response.status).toBe(204);
    expect(response.headers.get("set-cookie")).toContain("mimic_group=");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});

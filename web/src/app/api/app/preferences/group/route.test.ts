import { beforeEach, describe, expect, it, vi } from "vitest";

import { authenticatedApi } from "@/shared/api/authenticated-api";

import { POST } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/shared/api/authenticated-api", () => ({
  authenticatedApi: vi.fn(),
}));

const api = vi.mocked(authenticatedApi);

beforeEach(() => api.mockReset());

function request(body: unknown): Request {
  return new Request("http://localhost/api/app/preferences/group", {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      cookie: "mimic_csrf=token; mimic_access=access",
      "x-csrf-token": "token",
    },
    method: "POST",
  });
}

describe("POST /api/app/preferences/group", () => {
  it("stores a remembered group only when the authenticated user can see it", async () => {
    api.mockResolvedValueOnce([
      {
        id: "g1",
        name: "我們的生活基金",
        group_type: "couple",
        default_currency: "TWD",
        status: "active",
      },
    ]);

    const response = await POST(request({ group_id: "g1" }));

    expect(response.status).toBe(204);
    expect(response.headers.get("set-cookie")).toContain("mimic_group=g1");
    expect(api).toHaveBeenCalledWith(expect.any(Request), "/groups", {
      method: "GET",
    });
  });

  it("rejects unknown group IDs without writing a preference", async () => {
    api.mockResolvedValueOnce([]);

    const response = await POST(request({ group_id: "missing" }));

    expect(response.status).toBe(404);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});

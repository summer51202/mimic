import { beforeEach, describe, expect, it, vi } from "vitest";
import { forwardAppRoute, readRouteIdParam } from "@/shared/api/app-route";
import { POST } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/shared/api/app-route", () => ({ forwardAppRoute: vi.fn(), readRouteIdParam: vi.fn() }));
const forward = vi.mocked(forwardAppRoute);
const readId = vi.mocked(readRouteIdParam);

beforeEach(() => { forward.mockReset(); readId.mockReset(); });

describe("POST fund contribution BFF", () => {
  it("validates the fund ID and forwards JSON", async () => {
    readId.mockResolvedValue({ ok: true, value: "fund%2F1" });
    forward.mockResolvedValue(new Response(null, { status: 200 }) as never);
    const request = new Request("http://localhost", { method: "POST" });
    await POST(request, { params: Promise.resolve({ fundId: "fund/1" }) });
    expect(forward).toHaveBeenCalledWith(request, "/funds/fund%2F1/contributions", { body: "json" });
  });

  it("returns the shared validation response for an invalid fund ID", async () => {
    const response = new Response("invalid", { status: 400 });
    readId.mockResolvedValue({ ok: false, response: response as never });

    const result = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ fundId: "" }),
    });

    expect(result).toBe(response);
    expect(forward).not.toHaveBeenCalled();
  });
});

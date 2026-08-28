import { beforeEach, describe, expect, it, vi } from "vitest";

import { requestToApi } from "@/shared/api/server-api";
import { GET as getLive } from "./live/route";
import { GET as getReady } from "./ready/route";

vi.mock("server-only", () => ({}));

vi.mock("@/shared/api/server-api", () => ({
  requestToApi: vi.fn(),
}));

const requestToApiMock = vi.mocked(requestToApi);

describe("health BFF routes", () => {
  beforeEach(() => {
    requestToApiMock.mockReset();
  });

  it("returns local liveness without calling the backend", async () => {
    const response = await getLive();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: { ok: true } });
    expect(requestToApiMock).not.toHaveBeenCalled();
  });

  it("returns backend readiness", async () => {
    requestToApiMock.mockResolvedValueOnce({ ok: true });

    const response = await getReady();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: { ok: true } });
    expect(requestToApiMock).toHaveBeenCalledWith("/health/ready", {
      method: "GET",
    });
  });

  it("maps backend readiness failures to a safe 503 response", async () => {
    requestToApiMock.mockRejectedValueOnce(new Error("database password"));

    const response = await getReady();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: { code: "SERVICE_NOT_READY" },
    });
  });
});

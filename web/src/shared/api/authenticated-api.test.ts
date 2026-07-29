import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "./errors";
import { requestToApi } from "./server-api";
import { authenticatedApi } from "./authenticated-api";

vi.mock("server-only", () => ({}));

vi.mock("./server-api", () => ({
  requestToApi: vi.fn(),
}));

const requestToApiMock = vi.mocked(requestToApi);

describe("authenticated BFF API boundary", () => {
  beforeEach(() => {
    requestToApiMock.mockReset();
  });

  it("forwards the access cookie and request id to the upstream API", async () => {
    requestToApiMock.mockResolvedValueOnce({ id: "group_1" });

    const data = await authenticatedApi(
      new Request("http://localhost/api/app/groups", {
        headers: {
          cookie: "mimic_access=access-secret; mimic_refresh=refresh-secret",
          "x-request-id": "req_123",
        },
      }),
      "/groups",
      { method: "GET" },
    );

    expect(data).toEqual({ id: "group_1" });
    expect(requestToApiMock).toHaveBeenCalledWith("/groups", {
      accessToken: "access-secret",
      method: "GET",
      requestId: "req_123",
    });
  });

  it("fails before upstream calls when the access cookie is missing", async () => {
    await expect(
      authenticatedApi(new Request("http://localhost/api/app/groups"), "/groups", {
        method: "GET",
      }),
    ).rejects.toMatchObject({
      code: "SESSION_REQUIRED",
      status: 401,
    } satisfies Partial<ApiError>);

    expect(requestToApiMock).not.toHaveBeenCalled();
  });

  it("does not log or expose access token values", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    requestToApiMock.mockResolvedValueOnce({ ok: true });

    await authenticatedApi(
      new Request("http://localhost/api/app/groups", {
        headers: { cookie: "mimic_access=access-secret" },
      }),
      "/groups",
      { method: "GET" },
    );

    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

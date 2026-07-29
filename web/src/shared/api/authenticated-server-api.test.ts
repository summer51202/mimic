import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "./errors";
import { requestToApi } from "./server-api";
import { authenticatedServerApi } from "./authenticated-server-api";
import { cookies, headers } from "next/headers";

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
  headers: vi.fn(),
}));

vi.mock("./server-api", () => ({
  requestToApi: vi.fn(),
}));

const cookiesMock = vi.mocked(cookies);
const headersMock = vi.mocked(headers);
const requestToApiMock = vi.mocked(requestToApi);

describe("authenticated server API boundary", () => {
  beforeEach(() => {
    cookiesMock.mockReset();
    headersMock.mockReset();
    requestToApiMock.mockReset();
  });

  it("reads the access cookie and request id for server component API reads", async () => {
    cookiesMock.mockResolvedValueOnce({
      get: (name: string) =>
        name === "mimic_access" ? { name, value: "server-access" } : undefined,
    } as Awaited<ReturnType<typeof cookies>>);
    headersMock.mockResolvedValueOnce(new Headers({ "x-request-id": "req_srv" }));
    requestToApiMock.mockResolvedValueOnce([{ id: "group_1" }]);

    const data = await authenticatedServerApi("/groups", { method: "GET" });

    expect(data).toEqual([{ id: "group_1" }]);
    expect(requestToApiMock).toHaveBeenCalledWith("/groups", {
      accessToken: "server-access",
      method: "GET",
      requestId: "req_srv",
    });
  });

  it("does not refresh when the server access cookie is missing", async () => {
    cookiesMock.mockResolvedValueOnce({
      get: () => undefined,
    } as Awaited<ReturnType<typeof cookies>>);
    headersMock.mockResolvedValueOnce(new Headers());

    await expect(
      authenticatedServerApi("/groups", { method: "GET" }),
    ).rejects.toMatchObject({
      code: "SESSION_REQUIRED",
      status: 401,
    } satisfies Partial<ApiError>);

    expect(requestToApiMock).not.toHaveBeenCalled();
  });
});

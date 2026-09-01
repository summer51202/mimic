import { beforeEach, describe, expect, it, vi } from "vitest";

import { authenticatedServerApi } from "@/shared/api/authenticated-server-api";

import { getSettingsProfile } from "./settings-queries";

vi.mock("server-only", () => ({}));
vi.mock("@/shared/api/authenticated-server-api", () => ({
  authenticatedServerApi: vi.fn(),
}));

const authenticatedServerApiMock = vi.mocked(authenticatedServerApi);

beforeEach(() => authenticatedServerApiMock.mockReset());

describe("getSettingsProfile", () => {
  it("loads and validates the authenticated profile", async () => {
    const profile = {
      id: "user-1",
      mimic_id: "MIMIC-2345-6789",
      email: "edward@example.com",
      display_name: "Edward",
      locale: "zh-TW",
      timezone: "Asia/Taipei",
    };
    authenticatedServerApiMock.mockResolvedValueOnce(profile);

    await expect(getSettingsProfile()).resolves.toEqual(profile);
    expect(authenticatedServerApiMock).toHaveBeenCalledWith("/me", {
      method: "GET",
    });
  });

  it("rejects a malformed profile contract", async () => {
    authenticatedServerApiMock.mockResolvedValueOnce({
      id: "user-1",
      mimic_id: "bad-id",
    });

    await expect(getSettingsProfile()).rejects.toMatchObject({ name: "ZodError" });
  });
});

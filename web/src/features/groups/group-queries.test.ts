import { beforeEach, describe, expect, it, vi } from "vitest";

import { authenticatedServerApi } from "@/shared/api/authenticated-server-api";

import {
  getGroup,
  listGroups,
  listMembers,
} from "./group-queries";

vi.mock("@/shared/api/authenticated-server-api", () => ({
  authenticatedServerApi: vi.fn(),
}));

const api = vi.mocked(authenticatedServerApi);

beforeEach(() => {
  api.mockReset();
});

describe("group queries", () => {
  it("lists groups through the authenticated server API", async () => {
    api.mockResolvedValueOnce([
      {
        id: "g1",
        name: "我們的生活基金",
        group_type: "couple",
        default_currency: "TWD",
        status: "active",
      },
    ]);

    await expect(listGroups()).resolves.toHaveLength(1);
    expect(api).toHaveBeenCalledWith("/groups", { method: "GET" });
  });

  it("rejects invalid upstream JSON before UI code receives it", async () => {
    api.mockResolvedValueOnce([{ id: "", name: "", status: "active" }]);

    await expect(listGroups()).rejects.toThrow();
  });

  it("fetches group detail and members with encoded IDs", async () => {
    api.mockResolvedValueOnce({
      id: "g 1",
      name: "共同寶庫",
      group_type: "group",
      default_currency: "TWD",
      status: "active",
      role: "owner",
      current_user_id: "u1",
    });
    api.mockResolvedValueOnce([
      {
        user_id: "u1",
        display_name: "小明",
        mimic_id: "MIMIC-2345-6789",
        role: "owner",
        status: "active",
      },
    ]);

    await expect(getGroup("g 1")).resolves.toMatchObject({ id: "g 1" });
    await expect(listMembers("g 1")).resolves.toHaveLength(1);
    expect(api).toHaveBeenNthCalledWith(1, "/groups/g%201", {
      method: "GET",
    });
    expect(api).toHaveBeenNthCalledWith(2, "/groups/g%201/members", {
      method: "GET",
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

import { authenticatedServerApi } from "@/shared/api/authenticated-server-api";

import {
  getGroup,
  getGroupDashboard,
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

  it("parses dashboard money as canonical minor-unit strings", async () => {
    api.mockResolvedValueOnce({
      group: { id: "g1", name: "我們的生活基金", default_currency: "TWD" },
      currencies: [
        {
          currency: "TWD",
          cash_balance_minor: "2468000",
          current: {
            net_change_minor: "0",
            contribution_minor: "2468000",
            expense_minor: "0",
            member_positions: [],
          },
          all_time: {
            net_change_minor: "0",
            contribution_minor: "2468000",
            expense_minor: "0",
            member_positions: [],
          },
          funds: [
            {
              fund_id: "f1",
              name: "生活基金",
              cash_balance_minor: "2468000",
              current_net_change_minor: "0",
              period_start: null,
              period_end: null,
            },
          ],
        },
      ],
    });

    const dashboard = await getGroupDashboard("g1");

    expect(dashboard.currencies[0]?.cash_balance_minor).toBe("2468000");
    expect(api).toHaveBeenCalledWith("/groups/g1/dashboard", {
      method: "GET",
    });
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

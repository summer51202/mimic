import { beforeEach, describe, expect, it, vi } from "vitest";

import { authenticatedServerApi } from "@/shared/api/authenticated-server-api";

import { getFundSummary, listFunds } from "./fund-queries";

vi.mock("@/shared/api/authenticated-server-api", () => ({
  authenticatedServerApi: vi.fn(),
}));

const api = vi.mocked(authenticatedServerApi);

beforeEach(() => {
  api.mockReset();
});

describe("fund queries", () => {
  it("lists group funds through the authenticated server API", async () => {
    api.mockResolvedValueOnce([
      {
        balance_minor: "2468000",
        currency: "TWD",
        id: "fund 1",
        name: "生活基金",
        status: "active",
      },
    ]);

    await expect(listFunds("group 1")).resolves.toEqual([
      expect.objectContaining({ id: "fund 1", balance_minor: "2468000" }),
    ]);
    expect(api).toHaveBeenCalledWith("/groups/group%201/funds", {
      method: "GET",
    });
  });

  it("fetches fund summary and preserves all money fields as strings", async () => {
    api.mockResolvedValueOnce(summaryResponse());

    const summary = await getFundSummary("fund/1");

    expect(summary.fund.cash_balance_minor).toBe("2468000");
    expect(summary.current.member_positions[1]?.position_minor).toBe("-80000");
    expect(api).toHaveBeenCalledWith("/funds/fund%2F1/summary", {
      method: "GET",
    });
  });

  it("rejects non-canonical upstream money before UI code receives it", async () => {
    api.mockResolvedValueOnce([
      {
        balance_minor: "24.68",
        currency: "TWD",
        id: "f1",
        name: "生活基金",
        status: "active",
      },
    ]);

    await expect(listFunds("g1")).rejects.toThrow();
  });
});

function summaryResponse() {
  return {
    all_time: {
      contribution_minor: "3000000",
      expense_minor: "532000",
      member_positions: [],
      net_change_minor: "2468000",
    },
    current: {
      contribution_minor: "100000",
      expense_minor: "180000",
      member_positions: [
        {
          display_name: "小明",
          membership_status: "active",
          position_minor: "80000",
          user_id: "u1",
        },
        {
          display_name: "小美",
          membership_status: "active",
          position_minor: "-80000",
          user_id: "u2",
        },
      ],
      net_change_minor: "-80000",
    },
    current_period: {
      last_completed_period_end: null,
      last_completed_settlement_id: null,
      period_end: null,
      period_start: null,
    },
    fund: {
      cash_balance_minor: "2468000",
      currency: "TWD",
      group_id: "g1",
      id: "f1",
      name: "生活基金",
      status: "active",
    },
  };
}

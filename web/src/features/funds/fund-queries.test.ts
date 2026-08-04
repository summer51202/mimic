import { beforeEach, describe, expect, it, vi } from "vitest";

import { authenticatedServerApi } from "@/shared/api/authenticated-server-api";
import { ApiError, ApiUnavailableError } from "@/shared/api/errors";

import { getFundSummary, listFunds, listFundsOverview } from "./fund-queries";

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

  it("lists every group's funds concurrently in original group order", async () => {
    api.mockResolvedValueOnce([
      groupResponse("g1", "Home party", "TWD"),
      groupResponse("g2", "Travel party", "USD"),
    ]);
    const first = deferred<unknown>();
    const second = deferred<unknown>();
    api.mockImplementationOnce(() => first.promise);
    api.mockImplementationOnce(() => second.promise);

    const overview = listFundsOverview();

    await vi.waitFor(() => {
      expect(api).toHaveBeenCalledWith("/groups/g1/funds", { method: "GET" });
      expect(api).toHaveBeenCalledWith("/groups/g2/funds", { method: "GET" });
    });
    second.resolve([fundResponse("f2", "Trip USD", "USD")]);
    first.resolve([fundResponse("f1", "Daily TWD", "TWD")]);

    await expect(overview).resolves.toEqual([
      expect.objectContaining({
        group: expect.objectContaining({ id: "g1" }),
        funds: [expect.objectContaining({ id: "f1" })],
        state: "ready",
      }),
      expect.objectContaining({
        group: expect.objectContaining({ id: "g2" }),
        funds: [expect.objectContaining({ id: "f2" })],
        state: "ready",
      }),
    ]);
  });

  it("returns a forbidden empty section without hiding fulfilled groups", async () => {
    api.mockResolvedValueOnce([
      groupResponse("g1", "Home party", "TWD"),
      groupResponse("g2", "Travel party", "USD"),
    ]);
    api.mockResolvedValueOnce([fundResponse("f1", "Daily TWD", "TWD")]);
    api.mockRejectedValueOnce(new ApiError(403, "FORBIDDEN"));

    await expect(listFundsOverview()).resolves.toEqual([
      expect.objectContaining({ state: "ready" }),
      expect.objectContaining({ funds: [], state: "forbidden" }),
    ]);
  });

  it.each([
    ["unavailable", new ApiUnavailableError()],
    ["not found", new ApiError(404, "NOT_FOUND")],
    ["unknown", new Error("broken response")],
  ])("rethrows a %s group funds failure", async (_label, error) => {
    api.mockResolvedValueOnce([groupResponse("g1", "Home party", "TWD")]);
    api.mockRejectedValueOnce(error);

    await expect(listFundsOverview()).rejects.toBe(error);
  });
});

function groupResponse(id: string, name: string, currency: string) {
  return {
    id,
    name,
    group_type: "group",
    default_currency: currency,
    status: "active",
  };
}

function fundResponse(id: string, name: string, currency: string) {
  return { id, name, currency, status: "active", balance_minor: "5000" };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

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

import { beforeEach, describe, expect, it, vi } from "vitest";

import { authenticatedServerApi } from "@/shared/api/authenticated-server-api";
import type { Contribution, Expense } from "@/shared/api/domain-contracts";

import { getFundActivity, mergeActivityRecords } from "./activity-queries";

vi.mock("@/shared/api/authenticated-server-api", () => ({ authenticatedServerApi: vi.fn() }));
const api = vi.mocked(authenticatedServerApi);

beforeEach(() => api.mockReset());

describe("activity queries", () => {
  it("loads and parses both fund activity collections", async () => {
    api.mockResolvedValueOnce([contribution("c1", "2026-09-02")]);
    api.mockResolvedValueOnce([expense("e1", "2026-09-01")]);

    const records = await getFundActivity("fund/1");

    expect(records.map((record) => record.kind)).toEqual(["contribution", "expense"]);
    expect(api).toHaveBeenCalledWith(
      "/funds/fund%2F1/contributions?page=1&page_size=50&sort=occurred_on_desc",
      { method: "GET" },
    );
    expect(api).toHaveBeenCalledWith(
      "/funds/fund%2F1/expenses?page=1&page_size=50&sort=occurred_on_desc",
      { method: "GET" },
    );
  });

  it("merges deterministically by date, kind, and id", () => {
    const records = mergeActivityRecords(
      [contribution("c2", "2026-09-02"), contribution("c1", "2026-09-02")],
      [expense("e1", "2026-09-03"), expense("e2", "2026-09-02")],
    );

    expect(records.map(({ kind, id }) => `${kind}:${id}`)).toEqual([
      "expense:e1", "contribution:c1", "contribution:c2", "expense:e2",
    ]);
  });
});

function contribution(id: string, occurred_on: string): Contribution {
  return { id, fund_id: "f1", contributor_user_id: "u1", amount_minor: "5000",
    contribution_type: "regular", occurred_on, note: null, status: "active" };
}

function expense(id: string, occurred_on: string): Expense {
  return { id, fund_id: "f1", title: "Dinner", note: null, amount_minor: "1200",
    split_mode: "equal", expense_type: "fund_expense", occurred_on, status: "active",
    payers: [{ payer_user_id: "u1", amount_minor: "1200" }],
    splits: [{ user_id: "u1", split_type: "equal", ratio_value: null,
      fixed_amount_minor: null, allocated_amount_minor: "1200", sort_order: 0 }] };
}

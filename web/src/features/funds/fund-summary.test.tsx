import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { FundSummary as FundSummaryData } from "@/shared/api/domain-contracts";

import { FundSummary } from "./fund-summary";

afterEach(() => cleanup());

describe("FundSummary", () => {
  it("renders empty current period, signed member positions, and no transaction actions", () => {
    render(<FundSummary summary={summary()} />);

    expect(screen.getByRole("heading", { name: "生活基金" })).toBeVisible();
    expect(screen.getByText("TWD")).toBeVisible();
    expect(screen.getAllByText("NT$24,680.00")[0]).toBeVisible();
    expect(screen.getByText("本期尚無交易")).toBeVisible();
    expect(screen.getAllByText("-NT$800.00")[0]).toBeVisible();
    expect(screen.queryByRole("button", { name: "新增支出" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "新增存款" })).not.toBeInTheDocument();
  });

  it("renders current period dates and all-time totals in a secondary disclosure", () => {
    render(
      <FundSummary
        summary={{
          ...summary(),
          current_period: {
            last_completed_period_end: "2026-06-30",
            last_completed_settlement_id: "settlement_1",
            period_end: "2026-07-31",
            period_start: "2026-07-01",
          },
        }}
      />,
    );

    expect(screen.getByText("2026-07-01 - 2026-07-31")).toBeVisible();
    expect(screen.getByText("All-time totals")).toBeVisible();
    expect(screen.getByText("NT$30,000.00")).toBeVisible();
  });
});

function summary(): FundSummaryData {
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

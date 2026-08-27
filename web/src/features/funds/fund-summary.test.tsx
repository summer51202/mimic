import { readFileSync } from "node:fs";
import path from "node:path";

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
  it("assigns long names and extreme amounts to explicit summary owners", () => {
    const longName = "N".repeat(255);
    const unbrokenName = "UNBROKEN_".repeat(30);
    const stressed = summary();
    stressed.fund.name = longName;
    stressed.fund.cash_balance_minor = "999999999999999";
    stressed.current.member_positions = [{
      ...stressed.current.member_positions[0],
      display_name: unbrokenName,
      position_minor: "-999999999999999",
    }];

    render(<FundSummary summary={stressed} />);

    const fundName = screen.getByRole("heading", { name: longName });
    const memberName = screen.getByText(unbrokenName);
    const balance = screen.getByText("NT$9,999,999,999,999.99");
    const memberAmount = screen.getByText("-NT$9,999,999,999,999.99");
    expect(fundName).toHaveAttribute("data-contain-text");
    expect(fundName.className).toMatch(/fundName/);
    expect(memberName).toHaveAttribute("data-contain-text");
    expect(memberName.className).toMatch(/memberName/);
    expect(balance).toHaveAttribute("data-contain-text");
    expect(balance.className).toMatch(/balanceAmount/);
    expect(memberAmount).toHaveAttribute("data-contain-text");
    expect(memberAmount.className).toMatch(/memberAmount/);
    expect(fundName.closest("[data-frame]")).not.toBeNull();
    expect(memberName.closest("[data-frame]")).not.toBeNull();
  });

  it("owns narrow summary amount rows without splitting financial digits", () => {
    const css = readFileSync(
      path.join(process.cwd(), "src", "features", "funds", "fund-summary.module.css"),
      "utf8",
    );

    expect(css).toMatch(/\.(?:balanceAmount|totalAmount|memberAmount|fundAmount)[^{]*\{[^}]*font-variant-numeric:\s*tabular-nums/);
    expect(css).toMatch(/\.(?:balanceAmount|totalAmount|memberAmount|fundAmount)[^{]*\{[^}]*white-space:\s*nowrap/);
    expect(css).not.toMatch(/\.(?:balanceAmount|totalAmount|memberAmount|fundAmount)[^{]*\{[^}]*overflow-x:\s*auto/);
    expect(css).toMatch(/\.(?:balanceAmount|totalAmount|memberAmount|fundAmount)[^{]*\{[^}]*font-size:\s*clamp\([^)]*rem[^)]*rem[^)]*rem\)/);
    expect(css).not.toMatch(/@media\s*\(min-width:\s*48rem\)[\s\S]*\.(?:balanceAmount|totalAmount|memberAmount|fundAmount)[^{]*\{[^}]*font-size/);
    expect(css).not.toMatch(/\.(?:balanceAmount|totalAmount|memberAmount|fundAmount)[^{]*\{[^}]*overflow-wrap:\s*anywhere/);
    expect(css).toMatch(/\.memberAmount,\s*\n\s*\.fundAmount\s*\{[^}]*grid-column:\s*1\s*\/\s*-1[^}]*width:\s*100%/);
    expect(css).toMatch(
      /@media\s*\(max-width:\s*30rem\)[\s\S]*?\.totals\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/,
    );
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

import { readFileSync } from "node:fs";
import path from "node:path";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { Group, GroupDashboard } from "@/shared/api/domain-contracts";

import { TreasuryDashboard } from "./treasury-dashboard";

afterEach(() => cleanup());

const group: Group = {
  id: "g1",
  name: "我們的生活基金",
  group_type: "couple",
  default_currency: "TWD",
  status: "active",
};

const dashboard: GroupDashboard = {
  group: { id: "g1", name: "我們的生活基金", default_currency: "TWD" },
  currencies: [
    {
      currency: "TWD",
      cash_balance_minor: "2468000",
      current: {
        net_change_minor: "124000",
        contribution_minor: "3000000",
        expense_minor: "532000",
        member_positions: [
          {
            user_id: "u1",
            display_name: "小明",
            membership_status: "active",
            position_minor: "1234000",
          },
          {
            user_id: "u2",
            display_name: "小美",
            membership_status: "active",
            position_minor: "1234000",
          },
        ],
      },
      all_time: {
        net_change_minor: "124000",
        contribution_minor: "3000000",
        expense_minor: "532000",
        member_positions: [],
      },
      funds: [
        {
          fund_id: "f1",
          name: "生活基金",
          cash_balance_minor: "2468000",
          current_net_change_minor: "124000",
          period_start: null,
          period_end: null,
        },
      ],
    },
    {
      currency: "USD",
      cash_balance_minor: "5000",
      current: {
        net_change_minor: "5000",
        contribution_minor: "5000",
        expense_minor: "0",
        member_positions: [],
      },
      all_time: {
        net_change_minor: "5000",
        contribution_minor: "5000",
        expense_minor: "0",
        member_positions: [],
      },
      funds: [
        {
          fund_id: "f2",
          name: "Travel USD",
          cash_balance_minor: "5000",
          current_net_change_minor: "5000",
          period_start: null,
          period_end: null,
        },
      ],
    },
  ],
};

describe("TreasuryDashboard", () => {
  it("renders an empty group call to action", () => {
    render(
      <TreasuryDashboard
        dashboard={null}
        groups={[]}
        selectedGroupId={null}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "建立你們的共同寶庫" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "建立群組" })).toHaveAttribute(
      "href",
      "/app/groups/new",
    );
    expect(screen.getByRole("link", { name: "加入群組" })).toHaveAttribute(
      "href",
      "/app/groups/join",
    );
  });

  it("renders the selected group treasury without preview placeholder copy", () => {
    render(
      <TreasuryDashboard
        dashboard={dashboard}
        groups={[group]}
        selectedGroupId="g1"
      />,
    );

    expect(screen.getByRole("heading", { name: "我們的生活基金" })).toBeVisible();
    expect(screen.getAllByText("NT$24,680.00")[0]).toBeVisible();
    expect(
      screen.getAllByRole("link").find(
        (link) => link.getAttribute("href") === "/app/funds/f1",
      ),
    ).toHaveAccessibleName(/生活基金/);
    expect(screen.getByRole("link", { name: "新增" })).toHaveAttribute(
      "href",
      "/app/groups/g1/funds/new",
    );
    expect(screen.getByText("小明")).toBeVisible();
    expect(screen.getByText("Travel USD")).toBeVisible();
    expect(screen.getByText("$50.00")).toBeVisible();
    expect(document.querySelector("img[data-pixel-avatar]")).not.toBeNull();
    expect(screen.queryByText(/Private app preview/i)).not.toBeInTheDocument();
    expect(screen.queryByText("近期支出")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "加入群組" })).not.toBeInTheDocument();
  });
  it("assigns long treasury names and extreme amounts to their owning containers", () => {
    const longName = "N".repeat(255);
    const unbrokenName = "UNBROKEN_".repeat(30);
    const primary = dashboard.currencies[0];
    const stressedDashboard: GroupDashboard = {
      ...dashboard,
      group: { ...dashboard.group, name: longName },
      currencies: [{
        ...primary,
        cash_balance_minor: "999999999999999",
        current: {
          ...primary.current,
          member_positions: [{
            ...primary.current.member_positions[0],
            display_name: unbrokenName,
            position_minor: "-999999999999999",
          }],
        },
        funds: [{
          ...primary.funds[0],
          name: unbrokenName,
          cash_balance_minor: "999999999999999",
        }],
      }],
    };

    render(<TreasuryDashboard dashboard={stressedDashboard} groups={[{ ...group, name: longName }]} selectedGroupId="g1" />);

    const title = screen.getByRole("heading", { name: longName });
    const memberName = screen.getAllByText(unbrokenName)[0];
    const fundName = screen.getAllByText(unbrokenName)[1];
    const memberAmount = screen.getByText("-NT$9,999,999,999,999.99");
    const fundAmount = screen.getAllByText("NT$9,999,999,999,999.99")[1];

    expect(title).toHaveAttribute("data-contain-text");
    expect(title.className).toMatch(/groupName/);
    expect(memberName).toHaveAttribute("data-contain-text");
    expect(memberName.className).toMatch(/memberName/);
    expect(fundName).toHaveAttribute("data-contain-text");
    expect(fundName.className).toMatch(/fundName/);
    expect(memberAmount).toHaveAttribute("data-contain-text");
    expect(memberAmount.className).toMatch(/memberAmount/);
    expect(fundAmount).toHaveAttribute("data-contain-text");
    expect(fundAmount.className).toMatch(/fundAmount/);
    expect(title.closest("[data-frame]")).not.toBeNull();
    expect(memberName.closest("[data-frame]")).not.toBeNull();
    expect(fundName.closest("[data-frame]")).not.toBeNull();
  });

  it("owns narrow fund rows and readable financial amount containment in CSS", () => {
    const css = readFileSync(
      path.join(process.cwd(), "src", "features", "groups", "treasury-dashboard.module.css"),
      "utf8",
    );

    expect(css).toMatch(/\.fundName\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/);
    expect(css).toMatch(/\.fundAmount\s*\{[^}]*grid-column:\s*1\s*\/\s*-1[^}]*width:\s*100%/);
    expect(css).toMatch(/\.(?:heroAmount|memberAmount|fundAmount)[^{]*\{[^}]*font-variant-numeric:\s*tabular-nums/);
    expect(css).toMatch(/\.(?:heroAmount|memberAmount|fundAmount)[^{]*\{[^}]*white-space:\s*nowrap/);
    expect(css).not.toMatch(/\.(?:heroAmount|memberAmount|fundAmount)[^{]*\{[^}]*overflow-x:\s*auto/);
    expect(css).toMatch(/\.(?:heroAmount|memberAmount|fundAmount)[^{]*\{[^}]*font-size:\s*clamp\([^)]*rem[^)]*rem[^)]*rem\)/);
    expect(css).not.toMatch(/@media\s*\(min-width:\s*48rem\)[\s\S]*\.(?:heroAmount|memberAmount|fundAmount)[^{]*\{[^}]*font-size/);
    expect(css).not.toMatch(/\.(?:heroAmount|memberAmount|fundAmount)[^{]*\{[^}]*overflow-wrap:\s*anywhere/);
  });
});

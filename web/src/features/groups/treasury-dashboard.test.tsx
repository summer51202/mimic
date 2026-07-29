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
    expect(screen.getByText("小明")).toBeVisible();
    expect(screen.queryByText(/Private app preview/i)).not.toBeInTheDocument();
    expect(screen.queryByText("近期支出")).not.toBeInTheDocument();
  });
});

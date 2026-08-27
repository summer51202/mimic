import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { Fund, Group } from "@/shared/api/domain-contracts";

import { FundsOverview } from "./funds-overview";

afterEach(() => cleanup());

const groups: Group[] = [
  {
    id: "home",
    name: "Home party",
    group_type: "couple",
    default_currency: "TWD",
    status: "active",
  },
  {
    id: "travel",
    name: "Travel party",
    group_type: "group",
    default_currency: "USD",
    status: "active",
  },
];

const funds: Fund[] = [
  {
    id: "daily",
    name: "Daily TWD",
    currency: "TWD",
    status: "active",
    balance_minor: "2468000",
  },
  {
    id: "trip",
    name: "Trip USD",
    currency: "USD",
    status: "active",
    balance_minor: "5000",
  },
];

describe("FundsOverview", () => {
  it("uses the Mimiku no-group state", () => {
    render(<FundsOverview sections={[]} />);

    expect(screen.getByRole("img", { name: /Mimiku/i })).toBeVisible();
    expect(screen.getByRole("link", { name: /create group/i })).toHaveAttribute(
      "href",
      "/app/groups/new",
    );
    expect(screen.queryByTestId("funds-group")).not.toBeInTheDocument();
    expect(screen.getByText("fund quest").closest("[data-frame]")).toHaveAttribute(
      "data-frame",
      "funds-empty-state",
    );
  });

  it("offers a group-scoped create action for an empty group", () => {
    render(
      <FundsOverview sections={[{ group: groups[0], funds: [], state: "ready" }]} />,
    );

    expect(screen.getByRole("img", { name: /Mimiku/i })).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Create fund for Home party" }),
    ).toHaveAttribute("href", "/app/groups/home/funds/new");
  });

  it("keeps funds under their owning groups without a cross-currency total", () => {
    render(
      <FundsOverview
        sections={[
          { group: groups[0], funds: [funds[0]], state: "ready" },
          { group: groups[1], funds: [funds[1]], state: "ready" },
        ]}
      />,
    );

    const sections = screen.getAllByTestId("funds-group");
    expect(sections).toHaveLength(2);
    expect(within(sections[0]).getByRole("heading", { name: "Home party" })).toBeVisible();
    expect(within(sections[0]).getByText("Daily TWD")).toBeVisible();
    expect(within(sections[0]).queryByText("Trip USD")).not.toBeInTheDocument();
    expect(within(sections[1]).getByRole("heading", { name: "Travel party" })).toBeVisible();
    expect(within(sections[1]).getByText("Trip USD")).toBeVisible();
    expect(screen.getByText("NT$24,680.00")).toBeVisible();
    expect(screen.getByText("$50.00")).toBeVisible();
    expect(screen.queryByText(/total/i)).not.toBeInTheDocument();
    expect(sections[0]).toHaveAttribute("data-frame", "funds-group");
    expect(screen.getByRole("heading", { name: "Your funds" }).closest("[data-frame]")).toHaveAttribute(
      "data-frame",
      "funds-header",
    );
    expect(sections[0].querySelector("[data-contain-text]")).not.toBeNull();
  });

  it("uses a currency-neutral group label for same-group mixed currencies", () => {
    render(
      <FundsOverview
        sections={[
          { group: groups[0], funds, state: "ready" },
        ]}
      />,
    );

    const section = screen.getByTestId("funds-group");
    expect(within(section).getByText("shared fund group")).toBeVisible();
    expect(within(section).queryByText("TWD treasury")).not.toBeInTheDocument();
    expect(within(section).getByText("NT$24,680.00")).toBeVisible();
    expect(within(section).getByText("$50.00")).toBeVisible();
    expect(within(section).queryByText(/total/i)).not.toBeInTheDocument();
  });

  it("keeps ready groups visible when another group is forbidden", () => {
    render(
      <FundsOverview
        sections={[
          { group: groups[0], funds: [funds[0]], state: "ready" },
          { group: groups[1], funds: [], state: "forbidden" },
        ]}
      />,
    );

    expect(screen.getByText("Daily TWD")).toBeVisible();
    const forbidden = screen.getAllByTestId("funds-group")[1];
    expect(within(forbidden).getByRole("heading", { name: "Travel party" })).toBeVisible();
    expect(within(forbidden).getByText(/permission/i)).toBeVisible();
    expect(
      within(forbidden).getByRole("link", { name: "View Travel party" }),
    ).toHaveAttribute("href", "/app/groups/travel");
  });
  it("assigns long fund names and extreme amounts to the fund row owners", () => {
    const unbrokenName = "UNBROKEN_".repeat(30);
    render(<FundsOverview sections={[{
      group: groups[0],
      funds: [
        { ...funds[0], name: unbrokenName, balance_minor: "-999999999999999" },
        { ...funds[1], id: "large-positive", balance_minor: "999999999999999" },
      ],
      state: "ready",
    }]} />);

    const frame = screen.getByTestId("funds-group");
    const fundName = within(frame).getByText(unbrokenName);
    const negative = within(frame).getByText("-NT$9,999,999,999,999.99");
    const positive = within(frame).getByText("$9,999,999,999,999.99");
    expect(frame).toHaveAttribute("data-frame", "funds-group");
    expect(fundName).toHaveAttribute("data-contain-text");
    expect(fundName.className).toMatch(/fundName/);
    expect(negative).toHaveAttribute("data-contain-text");
    expect(negative.className).toMatch(/fundAmount/);
    expect(positive).toHaveAttribute("data-contain-text");
    expect(positive.className).toMatch(/fundAmount/);
  });
});

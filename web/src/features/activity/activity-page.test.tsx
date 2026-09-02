import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActivityPage } from "./activity-page";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }) }));
afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

const funds = [{ id: "f1", name: "Travel", currency: "TWD", status: "active", balance_minor: "0" }, { id: "f2", name: "Home", currency: "TWD", status: "active", balance_minor: "0" }];
const members = [
  { user_id: "u1", display_name: "Mina", mimic_id: "MIMIC-2345-6789", role: "owner", status: "active" },
  { user_id: "u2", display_name: "Alex", mimic_id: "MIMIC-3456-789A", role: "member", status: "active" },
];
const records = [
  { kind: "contribution" as const, id: "c1", fund_id: "f1", contributor_user_id: "u1", amount_minor: "5000", contribution_type: "regular" as const, occurred_on: "2026-09-02", note: null, status: "active" },
  { kind: "expense" as const, id: "e1", fund_id: "f1", title: "Dinner", note: "Night market", amount_minor: "1200", split_mode: "equal" as const, expense_type: "fund_expense" as const, occurred_on: "2026-09-02", status: "active", payers: [{ payer_user_id: "u1", amount_minor: "600" }, { payer_user_id: "u2", amount_minor: "600" }], splits: [{ user_id: "u1", split_type: "equal" as const, ratio_value: null, fixed_amount_minor: null, allocated_amount_minor: "600", sort_order: 0 }, { user_id: "u2", split_type: "equal" as const, ratio_value: null, fixed_amount_minor: null, allocated_amount_minor: "600", sort_order: 1 }] },
];

describe("ActivityPage", () => {
  it("opens the contribution dialog from the timeline-first action", async () => {
    const user = userEvent.setup();
    const view = render(<ActivityPage funds={funds} members={members} records={records} selectedFundId="f1" currentUserId="u1" action={null} balanceMinor="3800" />);
    await user.click(screen.getByRole("button", { name: "Add contribution" }));
    expect(screen.getByRole("dialog", { name: "Add contribution" })).toBeVisible();
    expect(window.location.search).toContain("action=contribution");
    await user.type(screen.getByLabelText("Amount"), "12");

    view.rerender(<ActivityPage funds={funds} members={members} records={records} selectedFundId="f1" currentUserId="u1" action="contribution" balanceMinor="3800" />);

    expect(screen.getByLabelText("Amount")).toHaveValue("12");
  });

  it("switches funds and filters a date-grouped ledger", async () => {
    const user = userEvent.setup();
    render(<ActivityPage funds={funds} members={members} records={records} selectedFundId="f1" currentUserId="u1" action={null} balanceMinor="3800" />);
    expect(screen.getByRole("heading", { name: "Activity" })).toBeVisible();
    expect(screen.getByText("NT$38.00")).toBeVisible();
    expect(screen.getByText("2026-09-02")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Expenses" }));
    expect(screen.getByText("Dinner")).toBeVisible();
    expect(screen.getByText("Mina + 1 more · Equal")).toBeVisible();
    expect(screen.getByText("Night market")).toBeVisible();
    expect(screen.queryByText("Regular contribution")).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Fund"), "f2");
    expect(push).toHaveBeenCalledWith("/app/activity?fund=f2");
  });

  it("distinguishes a filtered empty result from an empty ledger", async () => {
    const user = userEvent.setup();
    render(<ActivityPage funds={funds} members={members} records={[records[0]]} selectedFundId="f1" currentUserId="u1" action={null} balanceMinor="5000" />);

    await user.click(screen.getByRole("button", { name: "Expenses" }));

    expect(screen.getByText("No records match this filter.")).toBeVisible();
    expect(screen.queryByText("No activity yet.")).not.toBeInTheDocument();
  });

  it("follows browser history when the action query is removed", () => {
    const props = { funds, members, records, selectedFundId: "f1", currentUserId: "u1", balanceMinor: "3800" };
    render(<ActivityPage {...props} action="contribution" />);
    expect(screen.getByLabelText("Contributor")).toBeVisible();

    window.history.replaceState(null, "", "/app/activity?fund=f1");
    fireEvent.popState(window);

    expect(screen.queryByLabelText("Contributor")).not.toBeInTheDocument();
  });
});

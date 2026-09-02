import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ActivityRoute from "./page";

const mocks = vi.hoisted(() => ({ cookies: vi.fn(), redirect: vi.fn(), notFound: vi.fn(), listGroups: vi.fn(), getGroup: vi.fn(), listMembers: vi.fn(), listFunds: vi.fn(), summary: vi.fn(), activity: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, notFound: mocks.notFound }));
vi.mock("@/features/groups/group-queries", () => ({ listGroups: mocks.listGroups, getGroup: mocks.getGroup, listMembers: mocks.listMembers }));
vi.mock("@/features/funds/fund-queries", () => ({ listFunds: mocks.listFunds, getFundSummary: mocks.summary }));
vi.mock("@/features/activity/activity-queries", () => ({ getFundActivity: mocks.activity }));
vi.mock("@/features/activity/activity-page", () => ({ ActivityPage: ({ selectedFundId }: { selectedFundId: string }) => <div>activity:{selectedFundId}</div> }));
afterEach(() => { cleanup(); });
beforeEach(() => { Object.values(mocks).forEach((mock) => mock.mockReset()); mocks.cookies.mockResolvedValue({ get: () => ({ value: "g1" }) }); mocks.listGroups.mockResolvedValue([{ id: "g1", status: "active" }]); mocks.getGroup.mockResolvedValue({ id: "g1", current_user_id: "u1" }); mocks.listMembers.mockResolvedValue([]); mocks.listFunds.mockResolvedValue([{ id: "f1", currency: "TWD" }]); mocks.summary.mockResolvedValue({ fund: { id: "f1" } }); mocks.activity.mockResolvedValue([]); });
it("renders the selected fund activity", async () => { render(await ActivityRoute({ searchParams: Promise.resolve({ fund: "f1" }) })); expect(screen.getByText("activity:f1")).toBeVisible(); });
it("redirects a missing fund choice to the first fund", async () => { mocks.redirect.mockImplementation(() => { throw new Error("NEXT_REDIRECT"); }); await expect(ActivityRoute({ searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_REDIRECT"); expect(mocks.redirect).toHaveBeenCalledWith("/app/activity?fund=f1"); });

it("directs a member without groups to group onboarding", async () => {
  mocks.listGroups.mockResolvedValue([]);
  render(await ActivityRoute({ searchParams: Promise.resolve({}) }));
  expect(screen.getByRole("link", { name: "View groups" })).toHaveAttribute("href", "/app/groups");
});

it("directs a group without funds to fund creation", async () => {
  mocks.listFunds.mockResolvedValue([]);
  render(await ActivityRoute({ searchParams: Promise.resolve({}) }));
  expect(screen.getByRole("link", { name: "Create fund" })).toHaveAttribute("href", "/app/groups/g1/funds/new");
});

it("uses the shared not-found state for an invalid selected fund", async () => {
  mocks.notFound.mockImplementation(() => { throw new Error("NEXT_NOT_FOUND"); });
  const result = await ActivityRoute({ searchParams: Promise.resolve({ fund: "missing" }) });
  expect(() => render(result)).toThrow("NEXT_NOT_FOUND");
});

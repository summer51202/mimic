import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, ApiUnavailableError } from "@/shared/api/errors";
import { AppReadFailure } from "@/shared/ui/app-read-failure";

import AppError from "./error";
import FundPage from "./funds/[fundId]/page";
import GroupDetailPage from "./groups/[groupId]/page";
import GroupsPage from "./groups/page";
import AppLoading from "./loading";
import AppNotFound from "./not-found";
import AppPage from "./page";

const {
  cookiesMock,
  getFundSummaryMock,
  getGroupDashboardMock,
  getGroupMock,
  listFundsMock,
  listGroupsMock,
  listMembersMock,
  notFoundMock,
  refreshMock,
  captureExceptionMock,
  treasuryOpeningMock,
} = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  getFundSummaryMock: vi.fn(),
  getGroupDashboardMock: vi.fn(),
  getGroupMock: vi.fn(),
  listFundsMock: vi.fn(),
  listGroupsMock: vi.fn(),
  listMembersMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  refreshMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  treasuryOpeningMock: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({ captureException: captureExceptionMock }));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("next/headers", () => ({ cookies: cookiesMock }));
vi.mock("@/features/groups/group-selection", () => ({
  selectGroupId: (_url: unknown, _cookie: unknown, groups: Array<{ id: string }>) =>
    groups[0]?.id ?? null,
}));
vi.mock("@/features/groups/group-queries", () => ({
  getGroup: getGroupMock,
  getGroupDashboard: getGroupDashboardMock,
  listGroups: listGroupsMock,
  listMembers: listMembersMock,
}));
vi.mock("@/features/groups/treasury-opening-delay", () => ({
  waitForTreasuryOpening: treasuryOpeningMock,
}));
vi.mock("@/features/funds/fund-queries", () => ({
  getFundSummary: getFundSummaryMock,
  listFunds: listFundsMock,
}));
vi.mock("@/features/groups/treasury-dashboard", () => ({
  TreasuryDashboard: ({ selectedGroupId }: { selectedGroupId: string | null }) => (
    <div>dashboard:{selectedGroupId}</div>
  ),
}));
vi.mock("@/features/groups/group-list", () => ({
  GroupList: ({ groups }: { groups: unknown[] }) => (
    <div>groups:{groups.length}</div>
  ),
}));
vi.mock("@/features/groups/group-detail", () => ({
  GroupDetailView: ({ funds, members }: { funds: unknown[]; members: unknown[] }) => (
    <div>group detail:{members.length}:{funds.length}</div>
  ),
}));
vi.mock("@/features/funds/fund-summary", () => ({
  FundSummary: () => <div>fund summary</div>,
}));

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  cookiesMock.mockReset();
  getFundSummaryMock.mockReset();
  getGroupDashboardMock.mockReset();
  getGroupMock.mockReset();
  listFundsMock.mockReset();
  listGroupsMock.mockReset();
  listMembersMock.mockReset();
  notFoundMock.mockReset().mockImplementation(() => {
    throw new Error("NEXT_NOT_FOUND");
  });
  refreshMock.mockReset();
  captureExceptionMock.mockReset();
  treasuryOpeningMock.mockReset().mockResolvedValue(undefined);
  cookiesMock.mockResolvedValue({ get: vi.fn() });
});

describe("authenticated route boundaries", () => {
  it("lets the framework not-found boundary handle missing reads", () => {
    expect(() =>
      render(<AppReadFailure error={new ApiError(404, "NOT_FOUND")} />),
    ).toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalled();
  });

  it("renders forbidden and unavailable read failures", () => {
    const { rerender } = render(
      <AppReadFailure error={new ApiError(403, "FORBIDDEN")} />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "You do not have access to this treasury.",
    );

    rerender(<AppReadFailure error={new ApiUnavailableError()} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Mimiku cannot reach the treasury right now.",
    );
  });

  it("refreshes an unavailable read exactly once per Retry click", async () => {
    const user = userEvent.setup();
    render(<AppReadFailure error={new ApiUnavailableError()} />);

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("rethrows unknown failures to the framework error boundary", () => {
    const error = new Error("unexpected read failure");
    expect(() => render(<AppReadFailure error={error} />)).toThrow(error);
  });

  it("wires the error boundary reset action", async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    render(<AppError error={new Error("boom")} reset={reset} />);

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(reset).toHaveBeenCalledTimes(1);
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
    expect(captureExceptionMock).toHaveBeenCalledWith(expect.any(Error));
    expect(screen.queryByText("boom")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Return to overview" })).toHaveAttribute(
      "href",
      "/app",
    );
  });

  it("renders loading and privacy-safe not-found boundaries", () => {
    const { rerender } = render(<AppLoading />);
    expect(screen.getByRole("status")).toBeInTheDocument();

    rerender(<AppNotFound />);
    const state = screen.getByRole("alert");
    expect(state).toHaveTextContent("This treasury could not be found.");
    expect(screen.getByRole("link", { name: "Return to overview" })).toHaveAttribute(
      "href",
      "/app/groups",
    );
    expect(state).not.toHaveTextContent(/group-private|fund-private/i);
  });

  it("keeps dashboard staged reads intact on success", async () => {
    listGroupsMock.mockResolvedValue([{ id: "group-1" }]);
    getGroupDashboardMock.mockResolvedValue({ group: { id: "group-1" } });

    render(await AppPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("dashboard:group-1")).toBeInTheDocument();
    expect(listGroupsMock).toHaveBeenCalledTimes(1);
    expect(getGroupDashboardMock).toHaveBeenCalledWith("group-1");
    expect(treasuryOpeningMock).toHaveBeenCalledTimes(1);
  });

  it("wires a dashboard second-stage outage to recovery", async () => {
    listGroupsMock.mockResolvedValue([{ id: "group-1" }]);
    getGroupDashboardMock.mockRejectedValue(new ApiUnavailableError());

    render(await AppPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Mimiku cannot reach the treasury right now.",
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("keeps the groups page success path and delegates 404 reads", async () => {
    listGroupsMock.mockResolvedValueOnce([{ id: "group-1" }]);
    render(await GroupsPage());
    expect(screen.getByText("groups:1")).toBeInTheDocument();

    cleanup();
    listGroupsMock.mockRejectedValueOnce(new ApiError(404, "NOT_FOUND"));
    const missingGroups = await GroupsPage();
    expect(() => render(missingGroups)).toThrow("NEXT_NOT_FOUND");
  });

  it("keeps group-detail parallel reads and rethrows unknown failures", async () => {
    getGroupMock.mockResolvedValue({ id: "group-1" });
    listMembersMock.mockResolvedValue([{ id: "member-1" }]);
    listFundsMock.mockResolvedValue([{ id: "fund-1" }]);

    render(await GroupDetailPage({ params: Promise.resolve({ groupId: "group-1" }) }));
    expect(screen.getByText("group detail:1:1")).toBeInTheDocument();
    expect(getGroupMock).toHaveBeenCalledWith("group-1");
    expect(listMembersMock).toHaveBeenCalledWith("group-1");
    expect(listFundsMock).toHaveBeenCalledWith("group-1");

    cleanup();
    const unknown = new Error("parallel read failed");
    listMembersMock.mockRejectedValueOnce(unknown);
    const failedGroup = await GroupDetailPage({
      params: Promise.resolve({ groupId: "group-1" }),
    });
    expect(() => render(failedGroup)).toThrow(unknown);
  });

  it("keeps the fund page success path intact", async () => {
    getFundSummaryMock.mockResolvedValue({ fund: { id: "fund-1" } });

    render(await FundPage({ params: Promise.resolve({ fundId: "fund-1" }) }));

    expect(screen.getByText("fund summary")).toBeInTheDocument();
    expect(getFundSummaryMock).toHaveBeenCalledWith("fund-1");
  });

  it("wires a fund summary outage to recovery", async () => {
    getFundSummaryMock.mockRejectedValue(new ApiUnavailableError());

    render(await FundPage({ params: Promise.resolve({ fundId: "fund-1" }) }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Mimiku cannot reach the treasury right now.",
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});

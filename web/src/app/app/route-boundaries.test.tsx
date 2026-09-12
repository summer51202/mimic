import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, ApiUnavailableError } from "@/shared/api/errors";
import { AppReadFailure } from "@/shared/ui/app-read-failure";

import AppError from "./error";
import GroupDetailPage from "./groups/[groupId]/page";
import JoinGroupPage from "./groups/join/page";
import GroupsPage from "./groups/page";
import SettingsPage from "./settings/page";
import SpacePage from "./spaces/[spaceId]/page";
import AppLoading from "./loading";
import AppNotFound from "./not-found";
import AppPage from "./page";

vi.mock("server-only", () => ({}));

const {
  cookiesMock,
  getGroupMock,
  getSettingsProfileMock,
  listFundsMock,
  listGroupsMock,
  listGroupSharedSpacesMock,
  listGroupPooledSpacesMock,
  listMembersMock,
  notFoundMock,
  refreshMock,
  captureExceptionMock,
  loadHomeMock,
  authenticatedServerApiMock,
  loadSharedWorkspaceMock,
  loadPooledWorkspaceMock,
} = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  getGroupMock: vi.fn(),
  getSettingsProfileMock: vi.fn(),
  listFundsMock: vi.fn(),
  listGroupsMock: vi.fn(),
  listGroupSharedSpacesMock: vi.fn(),
  listGroupPooledSpacesMock: vi.fn(),
  listMembersMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  refreshMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  loadHomeMock: vi.fn(),
  authenticatedServerApiMock: vi.fn(),
  loadSharedWorkspaceMock: vi.fn(),
  loadPooledWorkspaceMock: vi.fn(),
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
  listGroups: listGroupsMock,
  listMembers: listMembersMock,
}));
vi.mock("@/features/home/home-queries", () => ({ loadHome: loadHomeMock }));
vi.mock("@/features/home/home-page", () => ({
  HomePage: ({ data, openQuick }: { data: { context: { kind: string } }; openQuick: boolean }) => <div>home:{data.context.kind}:{String(openQuick)}</div>,
}));
vi.mock("@/features/shared-expenses/shared-queries", () => ({
  listGroupSharedSpaces: listGroupSharedSpacesMock,
  loadSharedWorkspace: loadSharedWorkspaceMock,
}));
vi.mock("@/features/pooled-funds/pooled-queries", () => ({
  listGroupPooledSpaces: listGroupPooledSpacesMock,
  loadPooledWorkspace: loadPooledWorkspaceMock,
}));
vi.mock("@/shared/api/authenticated-server-api", () => ({ authenticatedServerApi: authenticatedServerApiMock }));
vi.mock("@/features/shared-expenses/shared-workspace", () => ({ SharedWorkspace: () => <div>shared workspace</div> }));
vi.mock("@/features/pooled-funds/pooled-workspace", () => ({ PooledWorkspace: () => <div>pooled workspace</div> }));
vi.mock("@/features/settings/settings-queries", () => ({
  getSettingsProfile: getSettingsProfileMock,
}));
vi.mock("@/features/settings/settings-form", () => ({
  SettingsForm: ({ profile }: { profile: { mimic_id: string } }) => (
    <div>settings:{profile.mimic_id}</div>
  ),
}));
vi.mock("@/features/groups/group-list", () => ({
  GroupList: ({ groups }: { groups: unknown[] }) => (
    <div>groups:{groups.length}</div>
  ),
}));
vi.mock("@/features/groups/group-detail", () => ({
  GroupDetailView: ({ members, sharedSpaces, pooledSpaces }: { members: unknown[]; sharedSpaces: unknown[]; pooledSpaces: unknown[] }) => (
    <div>group detail:{members.length}:{sharedSpaces.length}:{pooledSpaces.length}</div>
  ),
}));

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  cookiesMock.mockReset();
  getGroupMock.mockReset();
  getSettingsProfileMock.mockReset();
  listFundsMock.mockReset();
  listGroupsMock.mockReset();
  listGroupSharedSpacesMock.mockReset().mockResolvedValue([]);
  listGroupPooledSpacesMock.mockReset().mockResolvedValue([]);
  listMembersMock.mockReset();
  notFoundMock.mockReset().mockImplementation(() => {
    throw new Error("NEXT_NOT_FOUND");
  });
  refreshMock.mockReset();
  captureExceptionMock.mockReset();
  loadHomeMock.mockReset();
  authenticatedServerApiMock.mockReset();
  loadSharedWorkspaceMock.mockReset();
  loadPooledWorkspaceMock.mockReset();
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

  it("loads the personal treasure home by default", async () => {
    listGroupsMock.mockResolvedValue([{ id: "group-1" }]);
    loadHomeMock.mockResolvedValue({ context: { kind: "PERSONAL" } });
    render(await AppPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("home:PERSONAL:false")).toBeInTheDocument();
    expect(loadHomeMock).toHaveBeenCalledWith(undefined);
  });

  it("renders a list-groups outage without attempting the private home read", async () => {
    listGroupsMock.mockRejectedValue(new ApiUnavailableError());
    render(await AppPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Mimiku cannot reach the treasury right now.",
    );
    expect(loadHomeMock).not.toHaveBeenCalled();
  });

  it("passes the selected group context to the private home projection", async () => {
    listGroupsMock.mockResolvedValue([{ id: "group-1" }]);
    loadHomeMock.mockResolvedValue({ context: { kind: "GROUP" } });
    render(await AppPage({ searchParams: Promise.resolve({ group: "group-1", quick: "1" }) }));
    expect(screen.getByText("home:GROUP:true")).toBeInTheDocument();
    expect(loadHomeMock).toHaveBeenCalledWith("group-1");
  });

  it("wires a home projection outage to recovery", async () => {
    listGroupsMock.mockResolvedValue([{ id: "group-1" }]);
    loadHomeMock.mockRejectedValue(new ApiUnavailableError());

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
    expect(screen.getByRole("link", { name: "Create group" })).toHaveAttribute(
      "href",
      "/app/groups/new",
    );
    expect(screen.getByRole("link", { name: "Join group" })).toHaveAttribute(
      "href",
      "/app/groups/join",
    );

    cleanup();
    listGroupsMock.mockRejectedValueOnce(new ApiError(404, "NOT_FOUND"));
    const missingGroups = await GroupsPage();
    expect(() => render(missingGroups)).toThrow("NEXT_NOT_FOUND");
  });

  it("renders the manual join route without a QR placeholder", () => {
    render(<JoinGroupPage />);

    expect(screen.getByRole("heading", { name: "Join group" })).toBeInTheDocument();
    expect(screen.getByLabelText("Invite code or link")).toBeInTheDocument();
    expect(screen.queryByText(/qr/i)).not.toBeInTheDocument();
  });

  it("renders Settings from the authenticated profile and handles read failures", async () => {
    getSettingsProfileMock.mockResolvedValueOnce({
      id: "user-1",
      mimic_id: "MIMIC-2345-6789",
      email: "edward@example.com",
      display_name: "Edward",
      locale: "zh-TW",
      timezone: "Asia/Taipei",
    });

    render(await SettingsPage());
    expect(screen.getByRole("heading", { name: "Settings" })).toBeVisible();
    expect(screen.getByText("settings:MIMIC-2345-6789")).toBeVisible();

    cleanup();
    getSettingsProfileMock.mockRejectedValueOnce(new ApiUnavailableError());
    render(await SettingsPage());
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Mimiku cannot reach the treasury right now.",
    );
  });

  it("keeps group-detail parallel reads and rethrows unknown failures", async () => {
    getGroupMock.mockResolvedValue({ id: "group-1" });
    listMembersMock.mockResolvedValue([{ id: "member-1" }]);
    listGroupSharedSpacesMock.mockResolvedValue([{ id: "shared-1" }]);
    listGroupPooledSpacesMock.mockResolvedValue([{ id: "pooled-1" }]);

    render(await GroupDetailPage({ params: Promise.resolve({ groupId: "group-1" }) }));
    expect(screen.getByText("group detail:1:1:1")).toBeInTheDocument();
    expect(getGroupMock).toHaveBeenCalledWith("group-1");
    expect(listMembersMock).toHaveBeenCalledWith("group-1");
    expect(listFundsMock).not.toHaveBeenCalled();
    expect(listGroupSharedSpacesMock).toHaveBeenCalledWith("group-1");
    expect(listGroupPooledSpacesMock).toHaveBeenCalledWith("group-1");

    cleanup();
    const unknown = new Error("parallel read failed");
    listMembersMock.mockRejectedValueOnce(unknown);
    const failedGroup = await GroupDetailPage({
      params: Promise.resolve({ groupId: "group-1" }),
    });
    expect(() => render(failedGroup)).toThrow(unknown);
  });

  it("dispatches a participant space to its mode-specific workspace", async () => {
    const base = { id: "10000000-0000-4000-8000-000000000001", name: "Box", access: "PARTICIPANT", status: "ACTIVE",
      currency: "TWD", timezone: "Asia/Taipei", opened_on: "2026-09-01", group_id: "10000000-0000-4000-8000-000000000002",
      owner_user_id: null, role: "MANAGER", version: 1, first_formal_record_at: null };
    authenticatedServerApiMock.mockResolvedValueOnce({ ...base, mode: "POOLED_FUND" });
    loadPooledWorkspaceMock.mockResolvedValueOnce({});
    render(await SpacePage({ params: Promise.resolve({ spaceId: base.id }) }));
    expect(screen.getByText("pooled workspace")).toBeVisible();
    expect(loadPooledWorkspaceMock).toHaveBeenCalledWith(base.id);

    cleanup();
    authenticatedServerApiMock.mockResolvedValueOnce({ ...base, mode: "SHARED_EXPENSES" });
    loadSharedWorkspaceMock.mockResolvedValueOnce({});
    render(await SpacePage({ params: Promise.resolve({ spaceId: base.id }) }));
    expect(screen.getByText("shared workspace")).toBeVisible();
  });

});

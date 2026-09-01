import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FundList } from "@/features/funds/fund-list";
import { AppClientError, appFetch } from "@/shared/api/app-fetch";
import type { Fund, GroupDetail, Member } from "@/shared/api/domain-contracts";

import { ArchiveEmptyGroupDialog } from "./archive-empty-group-dialog";
import { GroupDetailView } from "./group-detail";
import { GroupList } from "./group-list";
import { LeaveGroupDialog } from "./leave-group-dialog";
import { MemberRoster } from "./member-roster";

vi.mock("@/shared/api/app-fetch", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/app-fetch")>()),
  appFetch: vi.fn(),
}));

const appFetchMock = vi.mocked(appFetch);

const group: GroupDetail = {
  id: "g1",
  name: "我們的生活基金",
  group_type: "couple",
  default_currency: "TWD",
  status: "active",
  role: "owner",
  current_user_id: "u1",
};

const members: Member[] = [
  { user_id: "u1", display_name: "小明", mimic_id: "MIMIC-2345-6789", role: "owner", status: "active" },
  { user_id: "u2", display_name: "小美", mimic_id: "MIMIC-ABCD-EFGH", role: "member", status: "active" },
];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  appFetchMock.mockReset();
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value() {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value() {
      this.removeAttribute("open");
    },
  });
});

describe("group detail actions", () => {
  it("renders roster with deterministic avatars and literal role labels", () => {
    render(<GroupDetailView group={group} members={members} />);

    expect(screen.getByRole("heading", { name: "我們的生活基金" })).toBeVisible();
    expect(screen.getByText("Owner")).toBeVisible();
    expect(screen.getByText("Member")).toBeVisible();
    expect(screen.getByText("MIMIC-2345-6789")).toBeVisible();
    expect(screen.getByText("MIMIC-ABCD-EFGH")).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const avatar = screen.getAllByRole("img", { hidden: true })[0];
    expect(avatar).toHaveAttribute("data-pixel-avatar");
    expect(avatar).toHaveAttribute(
      "src",
      expect.stringContaining("avatar-01.png"),
    );
    expect(avatar).not.toHaveAttribute("src", expect.stringContaining("/_next/image"));
  });

  it("assigns long group and member names to explicit text owners", () => {
    const longName = "N".repeat(255);
    const unbrokenName = "UNBROKEN_".repeat(30);

    render(
      <>
        <GroupList groups={[{ ...group, name: longName }]} />
        <MemberRoster members={[{ ...members[0], display_name: unbrokenName }]} />
      </>,
    );

    const groupName = screen.getByText(longName);
    const memberName = screen.getByText(unbrokenName);
    const memberMimicId = screen.getByText("MIMIC-2345-6789");
    expect(groupName).toHaveAttribute("data-contain-text");
    expect(groupName.className).toMatch(/groupName/);
    expect(memberName).toHaveAttribute("data-contain-text");
    expect(memberName.className).toMatch(/memberName/);
    expect(memberName.parentElement?.className).toMatch(/memberMeta/);
    expect(memberMimicId).toHaveAttribute("data-contain-text");
    expect(memberMimicId.className).toMatch(/memberMimicId/);
    expect(groupName.closest("[data-frame]")).toHaveAttribute("data-frame", "group-list");
    expect(memberName.closest("[data-frame]")).not.toBeNull();
  });

  it("contains an unbroken group detail title in its header owner", () => {
    const unbrokenName = "W".repeat(100);

    render(
      <GroupDetailView
        group={{ ...group, name: unbrokenName }}
        members={members}
      />,
    );

    const title = screen.getByRole("heading", { name: unbrokenName });
    expect(title).toHaveAttribute("data-contain-text");
    expect(title.className).toMatch(/groupName/);
    expect(title.closest("[data-frame]")).toHaveAttribute(
      "data-frame",
      "group-detail-header",
    );
  });

  it("owns fund list text inside a named frame", () => {
    const fund: Fund = {
      balance_minor: "0",
      currency: "TWD",
      id: "f1",
      name: "Shared fund",
      status: "active",
    };

    render(<FundList funds={[fund]} groupId={group.id} />);

    expect(screen.getByText(fund.name).closest("[data-frame]")).toHaveAttribute(
      "data-frame",
      "fund-list",
    );
  });

  it("renames a group with a PATCH payload and refresh callback", async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    appFetchMock.mockResolvedValueOnce({ data: { ...group, name: "新寶庫" } });

    render(
      <GroupDetailView group={group} members={members} onRefresh={onRefresh} />,
    );

    await user.click(screen.getByRole("button", { name: "Rename group" }));
    await user.clear(screen.getByLabelText("Group name"));
    await user.type(screen.getByLabelText("Group name"), "  新寶庫  ");
    await user.click(screen.getByRole("button", { name: "Save name" }));

    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
    expect(appFetchMock).toHaveBeenCalledWith("/api/app/groups/g1", {
      body: JSON.stringify({ name: "新寶庫" }),
      method: "PATCH",
    });
  });

  it("keeps the leave dialog open and shows recovery text on failure", async () => {
    appFetchMock.mockRejectedValueOnce(
      new AppClientError(409, "GROUP_RECONCILIATION_REQUIRED"),
    );
    const user = userEvent.setup();

    render(<LeaveGroupDialog groupId="g1" groupName="我們的生活基金" open />);

    await user.click(screen.getByRole("button", { name: "Leave group" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Settle open balances before leaving.",
    );
    expect(screen.getByRole("dialog", { name: "Leave 我們的生活基金" })).toBeVisible();
  });

  it("routes to /app after a successful leave", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    appFetchMock.mockResolvedValueOnce(undefined);

    render(
      <LeaveGroupDialog
        groupId="g1"
        groupName="我們的生活基金"
        onSuccess={onSuccess}
        open
      />,
    );

    await user.click(screen.getByRole("button", { name: "Leave group" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith("/app"));
  });

  it("shows empty-group deletion only to owners", () => {
    const { rerender } = render(
      <GroupDetailView group={group} members={members} />,
    );

    expect(
      screen.getByRole("button", { name: "Delete empty group" }),
    ).toBeVisible();

    rerender(
      <GroupDetailView
        group={{ ...group, role: "member" }}
        members={members}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Delete empty group" }),
    ).not.toBeInTheDocument();
  });

  it("removes an open archive dialog if the viewer is no longer an owner", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <GroupDetailView group={group} members={members} />,
    );

    await user.click(screen.getByRole("button", { name: "Delete empty group" }));
    expect(screen.getByRole("dialog")).toBeVisible();

    rerender(
      <GroupDetailView
        group={{ ...group, role: "member" }}
        members={members}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("requires the exact current group name before enabling deletion", async () => {
    const user = userEvent.setup();
    render(<GroupDetailView group={group} members={members} />);

    await user.click(screen.getByRole("button", { name: "Delete empty group" }));
    const confirmation = screen.getByLabelText("Type the group name to confirm");
    const submit = screen.getByRole("button", {
      name: "Delete empty group permanently from view",
    });

    expect(submit).toBeDisabled();
    await user.type(confirmation, "wrong");
    expect(submit).toBeDisabled();
    await user.clear(confirmation);
    await user.type(confirmation, group.name);
    expect(submit).toBeEnabled();
    await user.type(confirmation, " ");
    expect(submit).toBeDisabled();
  });
});

describe("ArchiveEmptyGroupDialog", () => {
  it("archives once and navigates to the group list", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    appFetchMock.mockResolvedValueOnce({
      data: { group_id: "g1", status: "archived" },
    });
    render(
      <ArchiveEmptyGroupDialog
        groupId="g1"
        groupName={group.name}
        onSuccess={onSuccess}
        open
      />,
    );

    await user.type(
      screen.getByLabelText("Type the group name to confirm"),
      group.name,
    );
    await user.click(
      screen.getByRole("button", {
        name: "Delete empty group permanently from view",
      }),
    );

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith("/app/groups"));
    expect(appFetchMock).toHaveBeenCalledTimes(1);
    expect(appFetchMock).toHaveBeenCalledWith("/api/app/groups/g1/archive", {
      method: "POST",
    });
  });

  it.each([
    ["GROUP_HAS_OTHER_ACTIVE_MEMBERS", "Other active members must leave first."],
    ["GROUP_HAS_FINANCIAL_HISTORY", "Groups with financial history cannot be deleted."],
    ["OWNER_REQUIRED", "Only an owner can delete an empty group."],
  ])(
    "keeps the confirmation recoverable after %s",
    async (code, message) => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      appFetchMock.mockRejectedValueOnce(new AppClientError(409, code));
      render(
        <ArchiveEmptyGroupDialog
          groupId="g1"
          groupName={group.name}
          onSuccess={onSuccess}
          open
        />,
      );

      const confirmation = screen.getByLabelText(
        "Type the group name to confirm",
      );
      await user.type(confirmation, group.name);
      await user.click(
        screen.getByRole("button", {
          name: "Delete empty group permanently from view",
        }),
      );

      expect(await screen.findByRole("alert")).toHaveTextContent(message);
      expect(screen.getByRole("dialog")).toBeVisible();
      expect(confirmation).toHaveValue(group.name);
      expect(onSuccess).not.toHaveBeenCalled();
    },
  );

  it("locks submission and every close control while pending", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    appFetchMock.mockReturnValueOnce(new Promise(() => undefined));
    render(
      <ArchiveEmptyGroupDialog
        groupId="g1"
        groupName={group.name}
        onClose={onClose}
        open
      />,
    );

    await user.type(
      screen.getByLabelText("Type the group name to confirm"),
      group.name,
    );
    const submit = screen.getByRole("button", {
      name: "Delete empty group permanently from view",
    });
    const close = screen.getByRole("button", { name: "Close dialog" });
    await user.click(submit);

    expect(
      await screen.findByRole("button", { name: "Deleting group..." }),
    ).toBeDisabled();
    expect(close).toBeDisabled();
    await user.click(submit);
    await user.click(close);

    expect(appFetchMock).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });
});

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FundList } from "@/features/funds/fund-list";
import type { Fund, GroupDetail, Member } from "@/shared/api/domain-contracts";

import { GroupDetailView } from "./group-detail";
import { GroupList } from "./group-list";
import { LeaveGroupDialog } from "./leave-group-dialog";
import { MemberRoster } from "./member-roster";

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
  { user_id: "u1", display_name: "小明", role: "owner", status: "active" },
  { user_id: "u2", display_name: "小美", role: "member", status: "active" },
];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
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
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === "/api/auth/csrf") {
        return Response.json({ token: "csrf-token" });
      }

      return Response.json({ data: { ...group, name: "新寶庫" } });
    }),
  );
});

describe("group detail actions", () => {
  it("renders roster with deterministic avatars and literal role labels", () => {
    render(<GroupDetailView group={group} members={members} />);

    expect(screen.getByRole("heading", { name: "我們的生活基金" })).toBeVisible();
    expect(screen.getByText("Owner")).toBeVisible();
    expect(screen.getByText("Member")).toBeVisible();
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
    expect(groupName).toHaveAttribute("data-contain-text");
    expect(groupName.className).toMatch(/groupName/);
    expect(memberName).toHaveAttribute("data-contain-text");
    expect(memberName.className).toMatch(/memberName/);
    expect(memberName.parentElement?.className).toMatch(/memberMeta/);
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

    render(
      <GroupDetailView group={group} members={members} onRefresh={onRefresh} />,
    );

    await user.click(screen.getByRole("button", { name: "Rename group" }));
    await user.clear(screen.getByLabelText("Group name"));
    await user.type(screen.getByLabelText("Group name"), "  新寶庫  ");
    await user.click(screen.getByRole("button", { name: "Save name" }));

    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
    expect(fetch).toHaveBeenCalledWith(
      "/api/app/groups/g1",
      expect.objectContaining({
        body: JSON.stringify({ name: "新寶庫" }),
        method: "PATCH",
      }),
    );
  });

  it("keeps the leave dialog open and shows recovery text on failure", async () => {
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      if (String(input) === "/api/auth/csrf") {
        return Response.json({ token: "csrf-token" });
      }

      return Response.json(
        { error: { code: "GROUP_RECONCILIATION_REQUIRED" } },
        { status: 409 },
      );
    });
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

    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      if (String(input) === "/api/auth/csrf") {
        return Response.json({ token: "csrf-token" });
      }

      return new Response(null, { status: 204 });
    });

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
});

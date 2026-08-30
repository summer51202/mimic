import type { ReactElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { hasSession } from "@/shared/auth/has-session";

vi.mock("@/shared/auth/has-session", () => ({
  hasSession: vi.fn().mockResolvedValue(false),
}));

import FeaturesPage, { metadata as featuresMetadata } from "./features/page";
import InvitePage, { metadata as inviteMetadata } from "./invite/[code]/page";
import PrivacyPage, { metadata as privacyMetadata } from "./privacy/page";
import TermsPage, { metadata as termsMetadata } from "./terms/page";

const metadataTitle = (metadata: { title?: unknown }) =>
  typeof metadata.title === "string" ? metadata.title : "";

type InviteAcceptPanelProps = {
  authenticated: boolean;
  code: string;
};

const getInviteAcceptPanel = (page: ReactElement) =>
  (page as ReactElement<{ children: ReactElement<InviteAcceptPanelProps> }>).props
    .children;

beforeEach(() => {
  vi.mocked(hasSession).mockReset();
  vi.mocked(hasSession).mockResolvedValue(false);
});

afterEach(() => {
  cleanup();
});

describe("public route metadata", () => {
  it("exports unique mimic metadata titles for each public route", () => {
    const titles = [
      metadataTitle(featuresMetadata),
      metadataTitle(privacyMetadata),
      metadataTitle(termsMetadata),
      metadataTitle(inviteMetadata),
    ];

    expect(titles).toEqual([
      "功能 | mimic",
      "隱私權 | mimic",
      "服務條款 | mimic",
      "Invite | mimic",
    ]);
    expect(new Set(titles).size).toBe(titles.length);
    expect(titles.every((title) => title.includes("mimic"))).toBe(true);
  });
});

describe("public pages", () => {
  it("renders the feature page with shared finance terminology", () => {
    render(<FeaturesPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "mimic 功能" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "共同基金" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "出資紀錄" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "支出分帳" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "結算鎖定" })).toBeInTheDocument();
  });

  it("renders pre-release policy shells with the effective date", () => {
    render(<PrivacyPage />);
    render(<TermsPage />);

    expect(screen.getAllByText("預發布版本")).toHaveLength(2);
    expect(screen.getAllByText("2026-07-23")).toHaveLength(2);
  });

  it("renders invitation entry without financial or membership data", async () => {
    const page = await InvitePage({ params: Promise.resolve({ code: "ABCD1234XYZ_" }) });
    const invitePanel = getInviteAcceptPanel(page);

    render(page);

    expect(invitePanel.props).toMatchObject({
      authenticated: false,
      code: "ABCD1234XYZ_",
    });
    expect(screen.getByRole("heading", { name: "Join this shared money quest." })).toBeInTheDocument();
    expect(screen.getByText("ABCD1234XYZ_")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log in to accept" })).toHaveAttribute(
      "href",
      "/login?returnTo=%2Finvite%2FABCD1234XYZ_",
    );
    expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute(
      "href",
      "/register?returnTo=%2Finvite%2FABCD1234XYZ_",
    );

    const sensitiveDataLabels = [
      /基金餘額/,
      /成員名單/,
      /群組名稱/,
      /出資紀錄/,
      /支出金額/,
      /結算金額/,
    ];

    for (const label of sensitiveDataLabels) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
  });

  it("renders an acceptance action for an authenticated invitee", async () => {
    vi.mocked(hasSession).mockResolvedValue(true);

    const page = await InvitePage({ params: Promise.resolve({ code: "ABCD1234XYZ_" }) });
    const invitePanel = getInviteAcceptPanel(page);

    render(page);

    expect(invitePanel.props).toMatchObject({
      authenticated: true,
      code: "ABCD1234XYZ_",
    });
    expect(screen.getByRole("button", { name: "Accept invite" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Log in to accept" })).not.toBeInTheDocument();
  });

  it("renders a clear invalid invitation state for malformed codes", async () => {
    vi.mocked(hasSession).mockResolvedValue(true);

    const page = await InvitePage({ params: Promise.resolve({ code: "bad code!" }) });
    const invitePanel = getInviteAcceptPanel(page);

    render(page);

    expect(invitePanel.props).toMatchObject({
      authenticated: true,
      code: "",
    });
    expect(screen.getByRole("heading", { name: "Join this shared money quest." })).toBeInTheDocument();
    expect(screen.getByText("這個邀請不存在或已失效。")).toBeInTheDocument();
    expect(screen.queryByText("bad code!")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Log in to accept" })).not.toBeInTheDocument();
  });
});

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import FeaturesPage, { metadata as featuresMetadata } from "./features/page";
import InvitePage, { metadata as inviteMetadata } from "./invite/[code]/page";
import PrivacyPage, { metadata as privacyMetadata } from "./privacy/page";
import TermsPage, { metadata as termsMetadata } from "./terms/page";

const metadataTitle = (metadata: { title?: unknown }) =>
  typeof metadata.title === "string" ? metadata.title : "";

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
      "邀請 | mimic",
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

  it("masks invitation codes and does not expose financial or membership data", async () => {
    const page = await InvitePage({ params: Promise.resolve({ code: "ABCD1234XYZ" }) });

    render(page);

    expect(screen.getByRole("heading", { name: "接受 mimic 邀請" })).toBeInTheDocument();
    expect(screen.getByText("ABCD••••")).toBeInTheDocument();
    expect(screen.queryByText("ABCD1234XYZ")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "登入後接受邀請" })).toHaveAttribute(
      "href",
      "/login?returnTo=%2Finvite%2FABCD1234XYZ",
    );
    expect(screen.getByRole("link", { name: "註冊新帳號" })).toHaveAttribute(
      "href",
      "/register?returnTo=%2Finvite%2FABCD1234XYZ",
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

  it("renders a clear invalid invitation state for malformed codes", async () => {
    const page = await InvitePage({ params: Promise.resolve({ code: "bad code!" }) });

    render(page);

    expect(screen.getByRole("heading", { name: "邀請連結無效" })).toBeInTheDocument();
    expect(screen.queryByText("bad code!")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "登入後接受邀請" })).not.toBeInTheDocument();
  });
});

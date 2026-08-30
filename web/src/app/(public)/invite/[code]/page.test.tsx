import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { hasSession } from "@/shared/auth/has-session";

import InvitePage from "./page";

vi.mock("@/shared/auth/has-session", () => ({
  hasSession: vi.fn(),
}));

vi.mock("@/features/invitations/invite-accept-panel", () => ({
  InviteAcceptPanel: ({
    authenticated,
    code,
  }: {
    authenticated: boolean;
    code: string;
  }) => (
    <div
      data-authenticated={String(authenticated)}
      data-code={code}
      data-testid="invite-accept-panel"
    />
  ),
}));

describe("InvitePage", () => {
  beforeEach(() => {
    vi.mocked(hasSession).mockReset();
  });

  afterEach(() => cleanup());

  it.each([
    [true, "true"],
    [false, "false"],
  ])("passes authenticated=%s to the invite panel", async (authenticated, expected) => {
    vi.mocked(hasSession).mockResolvedValue(authenticated);

    render(
      await InvitePage({
        params: Promise.resolve({ code: "abcDEF123_-4" }),
      }),
    );

    expect(screen.getByTestId("invite-accept-panel")).toHaveAttribute(
      "data-authenticated",
      expected,
    );
    expect(screen.getByTestId("invite-accept-panel")).toHaveAttribute(
      "data-code",
      "abcDEF123_-4",
    );
    expect(hasSession).toHaveBeenCalledOnce();
  });

  it("passes an empty code to the invite panel for malformed codes", async () => {
    vi.mocked(hasSession).mockResolvedValue(true);

    render(
      await InvitePage({
        params: Promise.resolve({ code: "bad code!" }),
      }),
    );

    expect(screen.getByTestId("invite-accept-panel")).toHaveAttribute(
      "data-authenticated",
      "true",
    );
    expect(screen.getByTestId("invite-accept-panel")).toHaveAttribute(
      "data-code",
      "",
    );
  });
});

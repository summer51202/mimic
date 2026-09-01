import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppClientError } from "@/shared/api/app-fetch";

import { InviteAcceptPanel } from "./invite-accept-panel";
import { InviteCreatePanel } from "./invite-create-panel";
import { inviteMessages } from "./invite-errors";
import { inviteCreateSchema, parseInviteCode } from "./invite-schema";
import { InviteSharePanel } from "./invite-share-panel";

describe("invite schema", () => {
  it("preserves Mimiku's aspect ratio in invite layouts", () => {
    const css = readFileSync(
      path.join(
        process.cwd(),
        "src",
        "features",
        "invitations",
        "invitation-flow.module.css",
      ),
      "utf8",
    );

    expect(css).toMatch(/\.hero img\s*\{[^}]*width:\s*min\(12rem,\s*60vw\)/);
    expect(css).toMatch(/\.hero img\s*\{[^}]*height:\s*auto/);
  });

  it("normalizes optional invited email values", () => {
    expect(
      inviteCreateSchema.parse({ invitedEmail: " USER@Example.COM " }),
    ).toEqual({ invitedEmail: "user@example.com" });
    expect(inviteCreateSchema.parse({ invitedEmail: "   " })).toEqual({
      invitedEmail: undefined,
    });
  });

  it("accepts only twelve URL-safe invite codes", () => {
    expect(parseInviteCode("abcDEF123_-4")).toBe("abcDEF123_-4");
    expect(parseInviteCode("bad code!")).toBeNull();
    expect(parseInviteCode("ABCD1234XYZ")).toBeNull();
  });
});

describe("InviteCreatePanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.stubGlobal("fetch", vi.fn(mockInviteCreateFetch));
  });

  afterEach(() => cleanup());

  it("posts a normalized optional email and shows the shareable invite", async () => {
    const user = userEvent.setup();

    render(<InviteCreatePanel groupId="group_1" />);

    await user.type(screen.getByLabelText("Invite email"), " USER@Example.COM ");
    await user.click(screen.getByRole("button", { name: "Generate invite" }));

    await screen.findByText("abcDEF123_-4");
    expect(screen.getByText(/Expires/)).toHaveTextContent("2026");
    expect(fetch).toHaveBeenNthCalledWith(2, "/api/app/groups/group_1/invites", {
      body: JSON.stringify({ invited_email: "user@example.com" }),
      headers: {
        "content-type": "application/json",
        "x-csrf-token": "csrf-token",
      },
      method: "POST",
    });
  });

  it("locks duplicate invite creation while the request is in flight", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url === "/api/auth/csrf") {
          return Promise.resolve(jsonResponse({ token: "csrf-token" }));
        }

        return new Promise<Response>(() => undefined);
      }),
    );

    render(<InviteCreatePanel groupId="group_1" />);

    await user.click(screen.getByRole("button", { name: "Generate invite" }));
    const submit = await screen.findByRole("button", {
      name: "Generating...",
    });
    expect(submit).toBeDisabled();

    await user.click(submit);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe("InviteSharePanel", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("copies the invite code and URL and only calls Web Share after an explicit click", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText }, share });

    render(
      <InviteSharePanel
        invite={mockInvite()}
        origin="https://app.example"
      />,
    );

    expect(share).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Copy code" }));
    expect(writeText).toHaveBeenNthCalledWith(1, "abcDEF123_-4");

    await user.click(screen.getByRole("button", { name: "Copy link" }));
    expect(writeText).toHaveBeenNthCalledWith(
      2,
      "https://app.example/invite/abcDEF123_-4",
    );

    await user.click(screen.getByRole("button", { name: "Share invite" }));
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://app.example/invite/abcDEF123_-4" }),
    );
  });

  it("selects the invite code as a manual fallback", async () => {
    const user = userEvent.setup();
    const range = {
      selectNodeContents: vi.fn(),
    } as unknown as Range;
    const selection = {
      addRange: vi.fn(),
      removeAllRanges: vi.fn(),
    } as unknown as Selection;
    vi.stubGlobal("navigator", {});
    vi.spyOn(document, "createRange").mockReturnValue(range);
    vi.spyOn(window, "getSelection").mockReturnValue(selection);

    render(
      <InviteSharePanel
        invite={mockInvite()}
        origin="https://app.example"
      />,
    );

    const code = screen.getByText("abcDEF123_-4");
    await user.click(screen.getByRole("button", { name: "Copy code" }));

    expect(range.selectNodeContents).toHaveBeenCalledWith(code);
    expect(selection.removeAllRanges).toHaveBeenCalled();
    expect(selection.addRange).toHaveBeenCalledWith(range);
    expect(code).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Invite code selected. Copy it from the page.",
    );
  });

  it("selects the text field as a manual fallback when clipboard is unavailable", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("navigator", {});

    render(
      <InviteSharePanel
        invite={mockInvite()}
        origin="https://app.example"
      />,
    );

    const input = screen.getByDisplayValue("https://app.example/invite/abcDEF123_-4");
    const select = vi.spyOn(input as HTMLInputElement, "select");

    await user.click(screen.getByRole("button", { name: "Copy link" }));

    expect(select).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Share invite" })).not.toBeInTheDocument();
  });
});

describe("InviteAcceptPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.stubGlobal("fetch", vi.fn(mockInviteAcceptFetch));
  });

  afterEach(() => cleanup());

  it("does not send a request for malformed invite codes", () => {
    render(<InviteAcceptPanel authenticated code="bad code!" />);

    expect(screen.getByText(inviteMessages.INVITE_NOT_FOUND)).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("renders login and register links for logged-out users", () => {
    render(<InviteAcceptPanel authenticated={false} code="abcDEF123_-4" />);

    expect(screen.getByRole("link", { name: "Log in to accept" })).toHaveAttribute(
      "href",
      "/login?returnTo=%2Finvite%2FabcDEF123_-4",
    );
    expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute(
      "href",
      "/register?returnTo=%2Finvite%2FabcDEF123_-4",
    );
  });

  it("accepts an invite only after the signed-in user clicks", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    render(
      <InviteAcceptPanel
        authenticated
        code="abcDEF123_-4"
        onSuccess={onSuccess}
      />,
    );

    expect(fetch).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Accept invite" }));

    await waitFor(() =>
      expect(onSuccess).toHaveBeenCalledWith("/app/groups/group_1"),
    );
    expect(fetch).toHaveBeenNthCalledWith(2, "/api/app/group-invites/accept", {
      body: JSON.stringify({ invite_code: "abcDEF123_-4" }),
      headers: {
        "content-type": "application/json",
        "x-csrf-token": "csrf-token",
      },
      method: "POST",
    });
  });

  it("locks duplicate acceptance while the request is in flight", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url === "/api/auth/csrf") {
          return Promise.resolve(jsonResponse({ token: "csrf-token" }));
        }

        return new Promise<Response>(() => undefined);
      }),
    );

    render(<InviteAcceptPanel authenticated code="abcDEF123_-4" />);

    await user.click(screen.getByRole("button", { name: "Accept invite" }));
    const submit = await screen.findByRole("button", {
      name: "Accepting...",
    });
    expect(submit).toBeDisabled();

    await user.click(submit);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("maps exact terminal invite error codes", async () => {
    for (const [code, message] of Object.entries(inviteMessages)) {
      cleanup();
      vi.stubGlobal(
        "fetch",
        vi.fn((url: string) => {
          if (url === "/api/auth/csrf") {
            return Promise.resolve(jsonResponse({ token: "csrf-token" }));
          }

      throw new AppClientError(400, code);
        }),
      );

      const user = userEvent.setup();
      render(<InviteAcceptPanel authenticated code="abcDEF123_-4" />);

      await user.click(screen.getByRole("button", { name: "Accept invite" }));

      expect(await screen.findByText(message)).toBeVisible();
    }
  });
});

function mockInviteCreateFetch(url: string): Promise<Response> {
  if (url === "/api/auth/csrf") {
    return Promise.resolve(jsonResponse({ token: "csrf-token" }));
  }

  return Promise.resolve(jsonResponse({ data: mockInvite() }));
}

function mockInviteAcceptFetch(url: string): Promise<Response> {
  if (url === "/api/auth/csrf") {
    return Promise.resolve(jsonResponse({ token: "csrf-token" }));
  }

  return Promise.resolve(
    jsonResponse({
      data: {
        group_id: "group_1",
        group_name: "Daily Quest Fund",
        joined_at: "2026-07-29T10:00:00.000Z",
        role: "member",
      },
    }),
  );
}

function mockInvite() {
  return {
    expires_at: "2026-07-30T10:00:00.000Z",
    invite_code: "abcDEF123_-4",
    invite_id: "invite_1",
    invited_email: "user@example.com",
    status: "ACTIVE",
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

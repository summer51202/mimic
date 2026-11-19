import { cleanup, screen, waitFor } from "@testing-library/react";
import { IntlTestProvider, render } from "@/test/render-with-intl";
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

    await user.type(screen.getByLabelText("邀請對象的電子郵件"), " USER@Example.COM ");
    await user.click(screen.getByRole("button", { name: "產生邀請" }));

    await screen.findByText("abcDEF123_-4");
    expect(screen.getByText(/到期：/)).toHaveTextContent("2026");
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

    await user.click(screen.getByRole("button", { name: "產生邀請" }));
    const submit = await screen.findByRole("button", {
      name: "產生中…",
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
    vi.unstubAllEnvs();
  });

  it("formats the expiration in Traditional Chinese", () => {
    vi.stubEnv("TZ", "UTC");
    render(<InviteSharePanel invite={{ ...mockInvite(), expires_at: "2026-01-02T15:04:00.000Z" }} />);

    expect(screen.getByText(/^到期：/).textContent).toMatchInlineSnapshot('"到期：2026年1月2日 下午3:04"');
  });

  it("formats the expiration in US English", () => {
    vi.stubEnv("TZ", "UTC");
    render(<InviteSharePanel invite={{ ...mockInvite(), expires_at: "2026-01-02T15:04:00.000Z" }} />, {
      wrapper: ({ children }) => <IntlTestProvider locale="en">{children}</IntlTestProvider>,
    });

    expect(screen.getByText(/^Expires/).textContent).toMatchInlineSnapshot('"Expires Jan 2, 2026, 3:04 PM"');
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
    await user.click(screen.getByRole("button", { name: "複製邀請碼" }));
    expect(writeText).toHaveBeenNthCalledWith(1, "abcDEF123_-4");

    await user.click(screen.getByRole("button", { name: "複製連結" }));
    expect(writeText).toHaveBeenNthCalledWith(
      2,
      "https://app.example/invite/abcDEF123_-4",
    );

    await user.click(screen.getByRole("button", { name: "分享邀請" }));
    expect(share).toHaveBeenCalledWith({
      text: "加入我的 mimic 共同群組。",
      title: "mimic 邀請",
      url: "https://app.example/invite/abcDEF123_-4",
    });
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
    await user.click(screen.getByRole("button", { name: "複製邀請碼" }));

    expect(range.selectNodeContents).toHaveBeenCalledWith(code);
    expect(selection.removeAllRanges).toHaveBeenCalled();
    expect(selection.addRange).toHaveBeenCalledWith(range);
    expect(code).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent(
      "已選取邀請碼，請從頁面複製。",
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

    await user.click(screen.getByRole("button", { name: "複製連結" }));

    expect(select).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "分享邀請" })).not.toBeInTheDocument();
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

    expect(screen.getByRole("link", { name: "登入以接受邀請" })).toHaveAttribute(
      "href",
      "/login?returnTo=%2Finvite%2FabcDEF123_-4",
    );
    expect(screen.getByRole("link", { name: "建立帳號" })).toHaveAttribute(
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
    await user.click(screen.getByRole("button", { name: "接受邀請" }));

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

    await user.click(screen.getByRole("button", { name: "接受邀請" }));
    const submit = await screen.findByRole("button", {
      name: "接受邀請中...",
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

      await user.click(screen.getByRole("button", { name: "接受邀請" }));

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

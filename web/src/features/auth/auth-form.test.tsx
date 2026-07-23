import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthForm } from "./auth-form";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

describe("AuthForm", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
  });

  it("shows a Traditional Chinese validation error for an invalid login email", async () => {
    const user = userEvent.setup();

    render(<AuthForm mode="login" />);

    await user.type(screen.getByLabelText("電子郵件"), "not-an-email");
    await user.type(screen.getByLabelText("密碼"), "secret");
    await user.click(screen.getByRole("button", { name: "登入 mimic" }));

    expect(await screen.findByText("請輸入有效的電子郵件地址。")).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("requires registration passwords to be at least six characters", async () => {
    const user = userEvent.setup();

    render(<AuthForm mode="register" />);

    await user.type(screen.getByLabelText("顯示名稱"), "咪寶");
    await user.type(screen.getByLabelText("電子郵件"), "mibo@example.com");
    await user.type(screen.getByLabelText("密碼"), "12345");
    await user.click(screen.getByRole("button", { name: "建立帳號" }));

    expect(await screen.findByText("密碼至少需要 6 個字元。")).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("disables duplicate login submissions while the request is in flight", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-token" }));
      }

      return new Promise<Response>(() => undefined);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AuthForm mode="login" />);

    await user.type(screen.getByLabelText("電子郵件"), "mibo@example.com");
    await user.type(screen.getByLabelText("密碼"), "correct-password");
    await user.click(screen.getByRole("button", { name: "登入 mimic" }));

    const submit = await screen.findByRole("button", { name: "登入中..." });
    expect(submit).toBeDisabled();

    await user.click(submit);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/auth/csrf", {
      credentials: "same-origin",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/auth/login",
      expect.objectContaining({
        credentials: "same-origin",
        method: "POST",
      }),
    );
  });

  it("shows recovery-first copy for INVALID_CREDENTIALS", async () => {
    const user = userEvent.setup();
    mockAuthFailure("INVALID_CREDENTIALS", 401);

    render(<AuthForm mode="login" />);

    await user.type(screen.getByLabelText("電子郵件"), "mibo@example.com");
    await user.type(screen.getByLabelText("密碼"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "登入 mimic" }));

    expect(
      await screen.findByText(
        "請重新檢查電子郵件和密碼。咪咪庫會在這裡陪你再試一次。",
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("img", { name: "咪咪庫正在認真確認登入狀態" }),
    ).toBeVisible();
  });

  it("shows recovery-first copy for EMAIL_ALREADY_REGISTERED", async () => {
    const user = userEvent.setup();
    mockAuthFailure("EMAIL_ALREADY_REGISTERED", 409);

    render(<AuthForm mode="register" />);

    await user.type(screen.getByLabelText("顯示名稱"), "咪寶");
    await user.type(screen.getByLabelText("電子郵件"), "mibo@example.com");
    await user.type(screen.getByLabelText("密碼"), "correct-password");
    await user.click(screen.getByRole("button", { name: "建立帳號" }));

    expect(
      await screen.findByText(
        "這個電子郵件已經註冊，請改用登入。咪咪庫幫你守住原本填好的資料。",
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "前往登入" }),
    ).toHaveAttribute("href", "/login");
  });

  it("shows friendly recovery copy for the legacy string CSRF error shape", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url === "/api/auth/csrf") {
          return Promise.resolve(jsonResponse({ token: "csrf-token" }));
        }

        return Promise.resolve(jsonResponse({ error: "CSRF_INVALID" }, 403));
      }),
    );

    render(<AuthForm mode="login" />);

    await user.type(screen.getByLabelText("電子郵件"), "mibo@example.com");
    await user.type(screen.getByLabelText("密碼"), "correct-password");
    await user.click(screen.getByRole("button", { name: "登入 mimic" }));

    expect(
      await screen.findByText(
        "驗證已過期，請重新送出一次。咪咪庫會幫你重新確認安全狀態。",
      ),
    ).toBeVisible();
  });

  it("shows friendly recovery copy when the CSRF response JSON is invalid", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url === "/api/auth/csrf") {
          return Promise.resolve(textResponse("{not-json"));
        }

        return Promise.resolve(jsonResponse({ user: { id: "user_1" } }));
      }),
    );

    render(<AuthForm mode="login" />);

    await user.type(screen.getByLabelText("電子郵件"), "mibo@example.com");
    await user.type(screen.getByLabelText("密碼"), "correct-password");
    await user.click(screen.getByRole("button", { name: "登入 mimic" }));

    expect(
      await screen.findByText(
        "驗證已過期，請重新送出一次。咪咪庫會幫你重新確認安全狀態。",
      ),
    ).toBeVisible();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("keeps non-password fields and clears password after a network failure", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url === "/api/auth/csrf") {
          return Promise.resolve(jsonResponse({ token: "csrf-token" }));
        }

        return Promise.reject(new Error("network down"));
      }),
    );

    render(<AuthForm mode="register" />);

    await user.type(screen.getByLabelText("顯示名稱"), "咪寶");
    await user.type(screen.getByLabelText("電子郵件"), "mibo@example.com");
    await user.type(screen.getByLabelText("密碼"), "correct-password");
    await user.click(screen.getByRole("button", { name: "建立帳號" }));

    expect(
      await screen.findByText(
        "連線暫時失敗，請稍後再送出一次。咪咪庫先把密碼欄清空，其他資料已保留。",
      ),
    ).toBeVisible();
    expect(screen.getByLabelText("顯示名稱")).toHaveValue("咪寶");
    expect(screen.getByLabelText("電子郵件")).toHaveValue("mibo@example.com");
    expect(screen.getByLabelText("密碼")).toHaveValue("");
  });

  it("navigates only to validated relative return URLs after success", async () => {
    const user = userEvent.setup();
    mockAuthSuccess();

    render(<AuthForm mode="login" returnTo="https://evil.example/phish" />);

    await user.type(screen.getByLabelText("電子郵件"), "mibo@example.com");
    await user.type(screen.getByLabelText("密碼"), "correct-password");
    await user.click(screen.getByRole("button", { name: "登入 mimic" }));

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/app"));
  });

  it("falls back to /app for backslash-prefixed return URLs", async () => {
    const user = userEvent.setup();
    mockAuthSuccess();

    render(<AuthForm mode="login" returnTo="/\\evil.example/path" />);

    await user.type(screen.getByLabelText("電子郵件"), "mibo@example.com");
    await user.type(screen.getByLabelText("密碼"), "correct-password");
    await user.click(screen.getByRole("button", { name: "登入 mimic" }));

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/app"));
  });

  it("preserves a validated invite return URL when switching auth modes", () => {
    render(<AuthForm mode="login" returnTo="/invite/PAIR-123?from=mail" />);

    expect(screen.getByRole("link", { name: "建立帳號" })).toHaveAttribute(
      "href",
      "/register?returnTo=%2Finvite%2FPAIR-123%3Ffrom%3Dmail",
    );
  });
});

function mockAuthSuccess(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-token" }));
      }

      return Promise.resolve(jsonResponse({ user: { id: "user_1" } }));
    }),
  );
}

function mockAuthFailure(code: string, status: number): void {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-token" }));
      }

      return Promise.resolve(jsonResponse({ error: { code } }, status));
    }),
  );
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

function textResponse(body: string, status = 200): Response {
  return new Response(body, {
    headers: { "content-type": "application/json" },
    status,
  });
}

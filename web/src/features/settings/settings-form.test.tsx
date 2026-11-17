import { cleanup, screen, waitFor } from "@testing-library/react";
import { render } from "@/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppClientError, appFetch } from "@/shared/api/app-fetch";

import { SettingsForm } from "./settings-form";

vi.mock("@/shared/api/app-fetch", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/app-fetch")>()),
  appFetch: vi.fn(),
}));

const appFetchMock = vi.mocked(appFetch);
const profile = {
  id: "user-1",
  mimic_id: "MIMIC-2345-6789",
  email: "edward@example.com",
  display_name: "Edward",
  locale: "zh-TW",
  timezone: "Asia/Taipei",
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

beforeEach(() => appFetchMock.mockReset());

describe("SettingsForm", () => {
  it("shows immutable account identity and only edits display name", () => {
    render(<SettingsForm profile={profile} />);

    expect(screen.getByLabelText("電子郵件")).toHaveValue(profile.email);
    expect(screen.getByLabelText("電子郵件")).toHaveAttribute("readonly");
    expect(screen.getByText(profile.mimic_id)).toBeVisible();
    expect(screen.getByLabelText("顯示名稱")).toHaveValue("Edward");
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
  });

  it("saves one trimmed display-name update", async () => {
    const user = userEvent.setup();
    appFetchMock.mockResolvedValueOnce({
      data: { ...profile, display_name: "Edward Lee" },
    });
    render(<SettingsForm profile={profile} />);

    await user.clear(screen.getByLabelText("顯示名稱"));
    await user.type(screen.getByLabelText("顯示名稱"), "  Edward Lee  ");
    await user.click(screen.getByRole("button", { name: "儲存變更" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("已儲存個人資料。"));
    expect(appFetchMock).toHaveBeenCalledWith("/api/app/me", {
      body: JSON.stringify({ display_name: "Edward Lee" }),
      method: "PATCH",
    });
    expect(screen.getByLabelText("顯示名稱")).toHaveValue("Edward Lee");
  });

  it("locks duplicate saves while the update is pending", async () => {
    const user = userEvent.setup();
    appFetchMock.mockReturnValueOnce(new Promise(() => undefined));
    render(<SettingsForm profile={profile} />);

    const save = screen.getByRole("button", { name: "儲存變更" });
    await user.click(save);
    expect(await screen.findByRole("button", { name: "儲存中..." })).toBeDisabled();
    await user.click(save);

    expect(appFetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps invalid or failed edits focused and editable", async () => {
    const user = userEvent.setup();
    render(<SettingsForm profile={profile} />);
    const input = screen.getByLabelText("顯示名稱");

    await user.clear(input);
    await user.click(screen.getByRole("button", { name: "儲存變更" }));
    expect(input).toHaveFocus();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "請輸入 1 至 100 個字元的顯示名稱。",
    );
    expect(appFetchMock).not.toHaveBeenCalled();

    await user.type(input, "New name");
    appFetchMock.mockRejectedValueOnce(new Error("offline"));
    await user.click(screen.getByRole("button", { name: "儲存變更" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "服務暫時無法使用，咪咪庫已保留你的修改。",
    );
    expect(input).toHaveValue("New name");
  });

  it("explains an expired session without losing the edit", async () => {
    const user = userEvent.setup();
    appFetchMock.mockRejectedValueOnce(
      new AppClientError(401, "SESSION_REQUIRED"),
    );
    render(<SettingsForm profile={profile} />);

    await user.type(screen.getByLabelText("顯示名稱"), " Lee");
    await user.click(screen.getByRole("button", { name: "儲存變更" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "登入已過期，請重新登入後再試。",
    );
    expect(screen.getByLabelText("顯示名稱")).toHaveValue("Edward Lee");
  });

  it("copies the exact Mimic ID", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(<SettingsForm profile={profile} />);

    await user.click(screen.getByRole("button", { name: "複製 ID" }));

    expect(writeText).toHaveBeenCalledWith(profile.mimic_id);
    expect(screen.getByRole("status")).toHaveTextContent("已複製 Mimic ID。");
  });

  it("selects and focuses the Mimic ID when clipboard is unavailable", async () => {
    const user = userEvent.setup();
    const range = { selectNodeContents: vi.fn() } as unknown as Range;
    const selection = {
      addRange: vi.fn(),
      removeAllRanges: vi.fn(),
    } as unknown as Selection;
    vi.stubGlobal("navigator", {});
    vi.spyOn(document, "createRange").mockReturnValue(range);
    vi.spyOn(window, "getSelection").mockReturnValue(selection);
    render(<SettingsForm profile={profile} />);
    const identity = screen.getByText(profile.mimic_id);

    await user.click(screen.getByRole("button", { name: "複製 ID" }));

    expect(range.selectNodeContents).toHaveBeenCalledWith(identity);
    expect(selection.addRange).toHaveBeenCalledWith(range);
    expect(identity).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent(
      "已選取 Mimic ID，請從頁面複製。",
    );
  });

  it("falls back to selecting the Mimic ID when clipboard permission is denied", async () => {
    const user = userEvent.setup();
    const range = { selectNodeContents: vi.fn() } as unknown as Range;
    const selection = {
      addRange: vi.fn(),
      removeAllRanges: vi.fn(),
    } as unknown as Selection;
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    vi.spyOn(document, "createRange").mockReturnValue(range);
    vi.spyOn(window, "getSelection").mockReturnValue(selection);
    render(<SettingsForm profile={profile} />);
    const identity = screen.getByText(profile.mimic_id);

    await user.click(screen.getByRole("button", { name: "複製 ID" }));

    expect(selection.addRange).toHaveBeenCalledWith(range);
    expect(identity).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent(
      "已選取 Mimic ID，請從頁面複製。",
    );
  });

  it("signs out once and navigates only after local logout succeeds", async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();
    appFetchMock.mockResolvedValueOnce({ ok: true });
    render(<SettingsForm profile={profile} onLogout={onLogout} />);

    await user.click(screen.getByRole("button", { name: "登出" }));

    await waitFor(() => expect(onLogout).toHaveBeenCalledWith("/login"));
    expect(appFetchMock).toHaveBeenCalledWith("/api/auth/logout", {
      method: "POST",
    });
  });

  it("keeps Settings available when local logout fails", async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();
    appFetchMock.mockRejectedValueOnce(new Error("offline"));
    render(<SettingsForm profile={profile} onLogout={onLogout} />);

    await user.click(screen.getByRole("button", { name: "登出" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "目前無法登出，請再試一次。",
    );
    expect(onLogout).not.toHaveBeenCalled();
  });
});

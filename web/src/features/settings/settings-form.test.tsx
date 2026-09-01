import { cleanup, render, screen, waitFor } from "@testing-library/react";
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

    expect(screen.getByLabelText("Email")).toHaveValue(profile.email);
    expect(screen.getByLabelText("Email")).toHaveAttribute("readonly");
    expect(screen.getByText(profile.mimic_id)).toBeVisible();
    expect(screen.getByLabelText("Display name")).toHaveValue("Edward");
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
  });

  it("saves one trimmed display-name update", async () => {
    const user = userEvent.setup();
    appFetchMock.mockResolvedValueOnce({
      data: { ...profile, display_name: "Edward Lee" },
    });
    render(<SettingsForm profile={profile} />);

    await user.clear(screen.getByLabelText("Display name"));
    await user.type(screen.getByLabelText("Display name"), "  Edward Lee  ");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Profile saved."));
    expect(appFetchMock).toHaveBeenCalledWith("/api/app/me", {
      body: JSON.stringify({ display_name: "Edward Lee" }),
      method: "PATCH",
    });
    expect(screen.getByLabelText("Display name")).toHaveValue("Edward Lee");
  });

  it("locks duplicate saves while the update is pending", async () => {
    const user = userEvent.setup();
    appFetchMock.mockReturnValueOnce(new Promise(() => undefined));
    render(<SettingsForm profile={profile} />);

    const save = screen.getByRole("button", { name: "Save changes" });
    await user.click(save);
    expect(await screen.findByRole("button", { name: "Saving..." })).toBeDisabled();
    await user.click(save);

    expect(appFetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps invalid or failed edits focused and editable", async () => {
    const user = userEvent.setup();
    render(<SettingsForm profile={profile} />);
    const input = screen.getByLabelText("Display name");

    await user.clear(input);
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(input).toHaveFocus();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a display name between 1 and 100 characters.",
    );
    expect(appFetchMock).not.toHaveBeenCalled();

    await user.type(input, "New name");
    appFetchMock.mockRejectedValueOnce(new Error("offline"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The service is temporarily unavailable. Mimiku kept your changes.",
    );
    expect(input).toHaveValue("New name");
  });

  it("explains an expired session without losing the edit", async () => {
    const user = userEvent.setup();
    appFetchMock.mockRejectedValueOnce(
      new AppClientError(401, "SESSION_REQUIRED"),
    );
    render(<SettingsForm profile={profile} />);

    await user.type(screen.getByLabelText("Display name"), " Lee");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your session expired. Sign in again, then retry.",
    );
    expect(screen.getByLabelText("Display name")).toHaveValue("Edward Lee");
  });

  it("copies the exact Mimic ID", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(<SettingsForm profile={profile} />);

    await user.click(screen.getByRole("button", { name: "Copy ID" }));

    expect(writeText).toHaveBeenCalledWith(profile.mimic_id);
    expect(screen.getByRole("status")).toHaveTextContent("Mimic ID copied.");
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

    await user.click(screen.getByRole("button", { name: "Copy ID" }));

    expect(range.selectNodeContents).toHaveBeenCalledWith(identity);
    expect(selection.addRange).toHaveBeenCalledWith(range);
    expect(identity).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Mimic ID selected. Copy it from the page.",
    );
  });

  it("signs out once and navigates only after local logout succeeds", async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();
    appFetchMock.mockResolvedValueOnce({ ok: true });
    render(<SettingsForm profile={profile} onLogout={onLogout} />);

    await user.click(screen.getByRole("button", { name: "Sign out" }));

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

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to sign out right now. Please retry.",
    );
    expect(onLogout).not.toHaveBeenCalled();
  });
});

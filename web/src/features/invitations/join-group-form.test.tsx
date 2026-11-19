import { cleanup, screen } from "@testing-library/react";
import { render } from "@/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { JoinGroupForm } from "./join-group-form";

afterEach(() => {
  cleanup();
});

describe("JoinGroupForm", () => {
  it.each([
    "abcDEF123_-4",
    "https://app.example/invite/abcDEF123_-4?source=message",
  ])("routes a valid invite entry through the confirmation page", async (entry) => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    render(<JoinGroupForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText("邀請碼或連結"), entry);
    await user.click(screen.getByRole("button", { name: "查看邀請" }));

    expect(onSuccess).toHaveBeenCalledWith("/invite/abcDEF123_-4");
  });

  it("keeps an invalid entry focused and editable", async () => {
    const user = userEvent.setup();

    render(<JoinGroupForm onSuccess={vi.fn()} />);

    const input = screen.getByLabelText("邀請碼或連結");
    await user.type(input, "not an invite");
    await user.click(screen.getByRole("button", { name: "查看邀請" }));

    expect(input).toHaveValue("not an invite");
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "請輸入有效的 12 個字元邀請碼或邀請連結。",
    );

    await user.type(input, " yet");
    expect(input).toHaveValue("not an invite yet");
  });

  it("uses the same actionable error for an empty submission", async () => {
    const user = userEvent.setup();

    render(<JoinGroupForm onSuccess={vi.fn()} />);

    const input = screen.getByLabelText("邀請碼或連結");
    await user.click(screen.getByRole("button", { name: "查看邀請" }));

    expect(input).toHaveFocus();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "請輸入有效的 12 個字元邀請碼或邀請連結。",
    );
  });
});

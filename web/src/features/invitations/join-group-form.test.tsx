import { cleanup, render, screen } from "@testing-library/react";
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

    await user.type(screen.getByLabelText("Invite code or link"), entry);
    await user.click(screen.getByRole("button", { name: "Review invite" }));

    expect(onSuccess).toHaveBeenCalledWith("/invite/abcDEF123_-4");
  });

  it("keeps an invalid entry focused and editable", async () => {
    const user = userEvent.setup();

    render(<JoinGroupForm onSuccess={vi.fn()} />);

    const input = screen.getByLabelText("Invite code or link");
    await user.type(input, "not an invite");
    await user.click(screen.getByRole("button", { name: "Review invite" }));

    expect(input).toHaveValue("not an invite");
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a valid 12-character invite code or invite link.",
    );

    await user.type(input, " yet");
    expect(input).toHaveValue("not an invite yet");
  });
});

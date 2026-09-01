import { readFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PixelButton } from "./pixel-button";
import { PixelDialog } from "./pixel-dialog";
import { PixelField } from "./pixel-field";
import { PixelFrame } from "./pixel-frame";
import { PixelNotice } from "./pixel-notice";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("pixel UI primitives", () => {
  it("renders pixel frame variants with children and caller classes", () => {
    render(
      <PixelFrame variant="treasury" className="account-card">
        Shared treasury
      </PixelFrame>,
    );

    const frame = screen.getByText("Shared treasury");

    expect(frame).toHaveAttribute("data-pixel-frame", "true");
    expect(frame).toHaveAttribute("data-variant", "treasury");
    expect(frame).toHaveClass("account-card");
  });

  it("supports icon-only PixelButton accessible names and focus metadata", () => {
    render(
      <PixelButton iconOnlyLabel="Close vault">
        <span aria-hidden="true">X</span>
      </PixelButton>,
    );

    const button = screen.getByRole("button", { name: "Close vault" });

    expect(button).toHaveAttribute("aria-label", "Close vault");
    expect(button).toHaveAttribute("data-icon-only", "true");
    expect(button).toHaveAttribute("data-focus-ring", "visible");
  });

  it("links focus and frame primitives to their visible pixel CSS rules", async () => {
    const globals = await readFile(
      path.join(process.cwd(), "src", "app", "globals.css"),
      "utf8",
    );
    const frameCss = await readFile(
      path.join(process.cwd(), "src", "shared", "ui", "pixel-frame.module.css"),
      "utf8",
    );

    expect(globals).toContain(
      '.pixel-button[data-focus-ring="visible"]:focus-visible',
    );
    expect(globals).toContain("outline: 3px solid var(--mimic-color-focus)");
    expect(frameCss).not.toContain("border-image");
    expect(frameCss).toContain("border: 4px solid var(--mimic-color-frame-line)");
    expect(frameCss).toContain(
      "0 0 0 2px var(--mimic-color-coin-action)",
    );
    expect(frameCss).toContain(
      "0 0 0 4px var(--mimic-color-frame-highlight)",
    );
  });

  it("wires PixelField labels, descriptions, and errors to its input", () => {
    render(
      <PixelField
        description="Use cents, not dollars."
        error="Amount is required."
        label="Amount"
        name="amount"
      />,
    );

    const input = screen.getByLabelText("Amount");
    const description = screen.getByText("Use cents, not dollars.");
    const error = screen.getByText("Amount is required.");

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(
      "Use cents, not dollars. Amount is required.",
    );
    expect(input).toHaveAttribute(
      "aria-describedby",
      `${description.id} ${error.id}`,
    );
  });

  it("wires PixelDialog title and description to the dialog", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      configurable: true,
      value() {},
    });
    Object.defineProperty(HTMLDialogElement.prototype, "close", {
      configurable: true,
      value() {},
    });
    const showModal = vi
      .spyOn(HTMLDialogElement.prototype, "showModal")
      .mockImplementation(function showModalMock(this: HTMLDialogElement) {
        this.setAttribute("open", "");
      });
    const close = vi
      .spyOn(HTMLDialogElement.prototype, "close")
      .mockImplementation(function closeMock(this: HTMLDialogElement) {
        this.removeAttribute("open");
      });

    const { rerender } = render(
      <PixelDialog
        closeLabel="Close settlement dialog"
        description="Review transfers before locking this period."
        onClose={onClose}
        open
        title="Complete settlement"
      >
        <p>Transfers are final.</p>
      </PixelDialog>,
    );

    const dialog = screen.getByRole("dialog", {
      name: "Complete settlement",
    });

    expect(dialog).toHaveAccessibleDescription(
      "Review transfers before locking this period.",
    );
    expect(screen.getByText("Transfers are final.")).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "Close settlement dialog" }),
    );

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(showModal).toHaveBeenCalledTimes(1);

    rerender(
      <PixelDialog onClose={onClose} open={false} title="Closed">
        <p>Hidden</p>
      </PixelDialog>,
    );

    expect(close).toHaveBeenCalledTimes(1);
  });

  it("keeps a pending PixelDialog open across every close path", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      configurable: true,
      value() {
        this.setAttribute("open", "");
      },
    });
    Object.defineProperty(HTMLDialogElement.prototype, "close", {
      configurable: true,
      value() {
        this.removeAttribute("open");
      },
    });

    render(
      <PixelDialog closeDisabled onClose={onClose} open title="Archive group">
        <p>Archiving group.</p>
      </PixelDialog>,
    );

    const dialog = screen.getByRole("dialog", { name: "Archive group" });
    const closeButton = screen.getByRole("button", {
      name: "Close dialog",
    });

    expect(closeButton).toBeDisabled();

    dialog.focus();
    await user.keyboard("{Escape}");
    fireEvent(
      dialog,
      new Event("cancel", { bubbles: true, cancelable: true }),
    );

    expect(onClose).not.toHaveBeenCalled();
  });

  it("uses semantic live regions for PixelNotice variants", () => {
    const { rerender } = render(
      <PixelNotice variant="success">Invite copied.</PixelNotice>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Invite copied.");

    rerender(<PixelNotice variant="warning">Period is locked.</PixelNotice>);

    expect(screen.getByRole("alert")).toHaveTextContent("Period is locked.");
  });
});

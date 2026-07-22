import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PixelButton } from "./pixel-button";

describe("PixelButton", () => {
  it("renders a native button with selected emphasis", () => {
    render(<PixelButton emphasis="primary">開始冒險</PixelButton>);

    const button = screen.getByRole("button", { name: "開始冒險" });

    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveAttribute("data-emphasis", "primary");
  });
});

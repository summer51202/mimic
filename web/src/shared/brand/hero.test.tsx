import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { brand } from "./brand";
import { Hero } from "./hero";

describe("Hero", () => {
  it("renders the public home hero contract", () => {
    render(<Hero />);

    expect(
      screen.getByRole("heading", { level: 1, name: "mimic" }),
    ).toBeInTheDocument();
    expect(screen.getByText(brand.tagline)).toBeInTheDocument();

    const primaryAction = screen.getByRole("link", { name: "開始冒險" });
    expect(primaryAction).toHaveAttribute("href", "/register");

    expect(
      screen.getByRole("img", { name: /咪咪庫 Mimiku/ }),
    ).toBeInTheDocument();
  });
});

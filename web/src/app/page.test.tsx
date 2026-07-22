import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { brand } from "@/shared/brand/brand";
import Home from "./page";

describe("Home", () => {
  it("renders the public home shell and content", () => {
    render(<Home />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "主要導覽" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "mimic" }),
    ).toBeInTheDocument();
    expect(screen.getByText(brand.tagline)).toBeInTheDocument();
  });
});

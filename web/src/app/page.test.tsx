import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home", () => {
  it("renders the scaffold landing content", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: "mimic" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Next.js web foundation is ready."),
    ).toBeInTheDocument();
  });
});

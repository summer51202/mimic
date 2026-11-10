import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { PixelDialogue } from "./pixel-dialogue";

it("labels a section by its speaker and renders text and actions", () => {
  render(
    <PixelDialogue as="section" speaker="Mimiku" actions={<a href="/register">Start</a>}>
      Welcome!
    </PixelDialogue>,
  );

  const region = screen.getByRole("region", { name: "Mimiku" });
  expect(region).toHaveAttribute("aria-labelledby", screen.getByText("Mimiku").id);
  expect(region).toContainElement(screen.getByText("Welcome!"));
  expect(region).toContainElement(screen.getByRole("link", { name: "Start" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

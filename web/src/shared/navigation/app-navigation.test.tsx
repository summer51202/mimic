import { cleanup, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { AppNavigation } from "./app-navigation";
import { currentAppSection } from "./app-section";

afterEach(() => {
  cleanup();
});

describe("AppNavigation", () => {
  it("keeps mobile labels on one readable line", () => {
    const css = readFileSync(
      path.join(
        process.cwd(),
        "src",
        "shared",
        "navigation",
        "app-navigation.module.css",
      ),
      "utf8",
    );

    expect(css).toMatch(
      /\.navigation\[data-variant="mobile"\]\s+\.label\s*\{[^}]*white-space:\s*nowrap/,
    );
  });

  it("renders bottom navigation semantics for phone layout", () => {
    render(<AppNavigation currentSection="/app" variant="mobile" />);

    const navigation = screen.getByRole("navigation", {
      name: "Primary app sections",
    });

    expect(navigation).toHaveAttribute("data-variant", "mobile");
    expect(navigation).toHaveAttribute("aria-label", "Primary app sections");
    expect(screen.getByRole("link", { name: /Overview/ })).toHaveAttribute(
      "href",
      "/app",
    );
  });

  it("renders side rail landmark semantics for desktop layout", () => {
    render(<AppNavigation currentSection="/app" variant="desktop" />);

    const navigation = screen.getByRole("navigation", {
      name: "Primary app sections",
    });

    expect(navigation).toHaveAttribute("data-variant", "desktop");
    expect(screen.getByText("mimic")).toBeInTheDocument();
  });

  it("indicates the current route while linking to primary sections", () => {
    render(<AppNavigation currentSection="/app" variant="desktop" />);

    const overview = screen.getByRole("link", { name: /Overview/ });
    const groups = screen.getByRole("link", { name: /Groups/ });
    const funds = screen.getByRole("link", { name: /Funds/ });
    const activity = screen.getByRole("button", { name: /Activity/ });
    const settings = screen.getByRole("link", { name: /Settings/ });

    expect(overview).toHaveAttribute("aria-current", "page");
    expect(groups).toHaveAttribute("href", "/app/groups");
    expect(funds).toHaveAttribute("href", "/app/funds");
    expect(activity).toBeDisabled();
    expect(settings).toHaveAttribute("href", "/app/settings");
  });

  it.each([
    ["/app/groups/g1", "Groups"],
    ["/app/funds/f1", "Funds"],
    ["/app/settings", "Settings"],
    ["/app/settings/profile", "Settings"],
  ])("indicates %s as the %s section", (currentPath, currentLabel) => {
    render(
      <AppNavigation
        currentSection={currentAppSection(currentPath)}
        variant="desktop"
      />,
    );

    expect(screen.getByRole("link", { name: currentLabel })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("does not expose inaccessible icon-only controls", () => {
    render(<AppNavigation currentSection="/app" variant="mobile" />);

    for (const item of screen.getAllByRole("link")) {
      expect(item).toHaveAccessibleName();
    }

    for (const item of screen.getAllByRole("button")) {
      expect(item).toHaveAccessibleName();
    }
  });

  it("announces disabled future sections as coming soon", () => {
    render(<AppNavigation currentSection="/app" variant="desktop" />);

    expect(
      screen.getByRole("button", { name: "Activity (coming soon)" }),
    ).toBeDisabled();
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "href",
      "/app/settings",
    );
  });
});

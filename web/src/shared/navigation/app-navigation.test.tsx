import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AppNavigation } from "./app-navigation";

afterEach(() => {
  cleanup();
});

describe("AppNavigation", () => {
  it("renders bottom navigation semantics for phone layout", () => {
    render(<AppNavigation currentPath="/app" variant="mobile" />);

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
    render(<AppNavigation currentPath="/app" variant="desktop" />);

    const navigation = screen.getByRole("navigation", {
      name: "Primary app sections",
    });

    expect(navigation).toHaveAttribute("data-variant", "desktop");
    expect(screen.getByText("mimic")).toBeInTheDocument();
  });

  it("indicates the current route without linking to unavailable future screens", () => {
    render(<AppNavigation currentPath="/app" variant="desktop" />);

    const overview = screen.getByRole("link", { name: /Overview/ });
    const groups = screen.getByRole("button", { name: /Groups/ });
    const activity = screen.getByRole("button", { name: /Activity/ });
    const settings = screen.getByRole("button", { name: /Settings/ });

    expect(overview).toHaveAttribute("aria-current", "page");
    expect(groups).toBeDisabled();
    expect(activity).toBeDisabled();
    expect(settings).toBeDisabled();
  });

  it("does not expose inaccessible icon-only controls", () => {
    render(<AppNavigation currentPath="/app" variant="mobile" />);

    for (const item of screen.getAllByRole("link")) {
      expect(item).toHaveAccessibleName();
    }

    for (const item of screen.getAllByRole("button")) {
      expect(item).toHaveAccessibleName();
    }
  });

  it("announces disabled future sections as coming soon", () => {
    render(<AppNavigation currentPath="/app" variant="desktop" />);

    expect(
      screen.getByRole("button", { name: "Groups (coming soon)" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Activity (coming soon)" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Settings (coming soon)" }),
    ).toBeDisabled();
  });
});

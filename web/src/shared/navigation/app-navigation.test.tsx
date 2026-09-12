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
    expect(screen.getByRole("link", { name: /首頁/ })).toHaveAttribute(
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

    const overview = screen.getByRole("link", { name: /首頁/ });
    const groups = screen.getByRole("link", { name: /共同群組/ });
    const tasks = screen.getByRole("link", { name: /任務/ });
    const settings = screen.getByRole("link", { name: /設定/ });

    expect(overview).toHaveAttribute("aria-current", "page");
    expect(groups).toHaveAttribute("href", "/app/groups");
    expect(tasks).toHaveAttribute("href", "/app/tasks");
    expect(settings).toHaveAttribute("href", "/app/settings");
    expect(screen.queryByRole("link", { name: /Funds|Activity/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(5);
  });

  it.each([
    ["/app/groups/g1", "共同群組"],
    ["/app/personal", "我的寶箱"],
    ["/app/tasks", "任務"],
    ["/app/settings", "設定"],
    ["/app/settings/profile", "設定"],
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
    expect(screen.getByRole("link", { name: "首頁" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("does not expose inaccessible icon-only controls", () => {
    render(<AppNavigation currentSection="/app" variant="mobile" />);

    for (const item of screen.getAllByRole("link")) {
      expect(item).toHaveAccessibleName();
    }

    for (const item of screen.queryAllByRole("button")) {
      expect(item).toHaveAccessibleName();
    }
  });

  it("exposes tasks instead of legacy Fund activity", () => {
    render(<AppNavigation currentSection="/app" variant="desktop" />);

    expect(
      screen.getByRole("link", { name: "任務" }),
    ).toHaveAttribute("href", "/app/tasks");
    expect(screen.getByRole("link", { name: "設定" })).toHaveAttribute(
      "href",
      "/app/settings",
    );
  });
});

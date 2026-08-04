import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppRouteState } from "./app-route-state";

afterEach(cleanup);

describe("AppRouteState", () => {
  it("renders unavailable recovery copy in an alert", () => {
    render(<AppRouteState variant="unavailable" />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Mimiku cannot reach the treasury right now. Your data is safe. Try again in a moment.",
    );
  });

  it("calls Retry exactly once", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<AppRouteState onRetry={onRetry} variant="unknown" />);

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("links back to the overview", () => {
    render(<AppRouteState returnHref="/app" variant="forbidden" />);

    expect(screen.getByRole("link", { name: "Return to overview" })).toHaveAttribute(
      "href",
      "/app",
    );
  });

  it("uses status semantics while loading", () => {
    render(<AppRouteState variant="loading" />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Mimiku is opening the treasury...",
    );
  });

  it("does not disclose private identifiers in not-found copy", () => {
    const privateGroupId = "group-private-123";
    const privateFundId = "fund-private-456";
    render(<AppRouteState returnHref="/app/groups" variant="not-found" />);

    const state = screen.getByRole("alert");
    expect(state).toHaveTextContent("This treasury could not be found.");
    expect(state).not.toHaveTextContent(privateGroupId);
    expect(state).not.toHaveTextContent(privateFundId);
  });
});

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, ApiUnavailableError } from "@/shared/api/errors";
import { AppReadFailure } from "@/shared/ui/app-read-failure";

import AppError from "./error";
import AppLoading from "./loading";
import AppNotFound from "./not-found";

const { notFoundMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("authenticated route boundaries", () => {
  it("lets the framework not-found boundary handle missing reads", () => {
    expect(() =>
      render(<AppReadFailure error={new ApiError(404, "NOT_FOUND")} />),
    ).toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalled();
  });

  it("renders forbidden and unavailable read failures", () => {
    const { rerender } = render(
      <AppReadFailure error={new ApiError(403, "FORBIDDEN")} />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "You do not have access to this treasury.",
    );

    rerender(<AppReadFailure error={new ApiUnavailableError()} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Mimiku cannot reach the treasury right now.",
    );
  });

  it("rethrows unknown failures to the framework error boundary", () => {
    const error = new Error("unexpected read failure");
    expect(() => render(<AppReadFailure error={error} />)).toThrow(error);
  });

  it("wires the error boundary reset action", async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    render(<AppError error={new Error("boom")} reset={reset} />);

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "Return to overview" })).toHaveAttribute(
      "href",
      "/app",
    );
  });

  it("renders loading and privacy-safe not-found boundaries", () => {
    const { rerender } = render(<AppLoading />);
    expect(screen.getByRole("status")).toBeInTheDocument();

    rerender(<AppNotFound />);
    const state = screen.getByRole("alert");
    expect(state).toHaveTextContent("This treasury could not be found.");
    expect(screen.getByRole("link", { name: "Return to overview" })).toHaveAttribute(
      "href",
      "/app/groups",
    );
    expect(state).not.toHaveTextContent(/group-private|fund-private/i);
  });
});

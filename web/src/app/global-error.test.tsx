import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

const captureExceptionMock = vi.hoisted(() => vi.fn());
vi.mock("@sentry/nextjs", () => ({ captureException: captureExceptionMock }));

import GlobalError from "./global-error";

test("global error captures once without rendering error content", () => {
  const error = new Error("customer@example.test token=secret");
  render(<GlobalError error={error} />);
  expect(captureExceptionMock).toHaveBeenCalledTimes(1);
  expect(captureExceptionMock).toHaveBeenCalledWith(error);
  expect(screen.getByRole("alert")).toBeInTheDocument();
  expect(document.documentElement).toBeInTheDocument();
  expect(screen.queryByText(error.message)).not.toBeInTheDocument();
  expect(screen.queryByText(error.stack ?? "")).not.toBeInTheDocument();
});

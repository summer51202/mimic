import { cleanup, screen } from "@testing-library/react";
import { render } from "@/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppRouteState } from "./app-route-state";

afterEach(cleanup);

describe("AppRouteState", () => {
  it("renders unavailable recovery copy in an alert", () => {
    render(<AppRouteState variant="unavailable" />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "咪咪庫暫時連不上寶箱，資料已妥善保管，請稍後再試。",
    );
  });

  it("calls Retry exactly once", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<AppRouteState onRetry={onRetry} variant="unknown" />);

    await user.click(screen.getByRole("button", { name: "重試" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("links back to the overview", () => {
    render(<AppRouteState returnHref="/app" variant="forbidden" />);

    expect(screen.getByRole("link", { name: "返回總覽" })).toHaveAttribute(
      "href",
      "/app",
    );
  });

  it("uses status semantics while loading", () => {
    render(<AppRouteState variant="loading" />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "咪咪庫正在開啟寶箱…",
    );
  });

  it("does not disclose private identifiers in not-found copy", () => {
    const privateGroupId = "group-private-123";
    const privateFundId = "fund-private-456";
    render(<AppRouteState returnHref="/app/groups" variant="not-found" />);

    const state = screen.getByRole("alert");
    expect(state).toHaveTextContent("找不到這個寶箱。");
    expect(state).not.toHaveTextContent(privateGroupId);
    expect(state).not.toHaveTextContent(privateFundId);
  });
});

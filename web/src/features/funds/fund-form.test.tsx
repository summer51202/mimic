import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FundForm } from "./fund-form";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

afterEach(() => cleanup());

describe("FundForm", () => {
  it("normalizes fund values and routes to the created fund", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-token" }));
      }

      return Promise.resolve(
        jsonResponse({
          data: {
            balance_minor: "0",
            currency: "TWD",
            id: "fund_1",
            name: "旅行基金",
            status: "active",
          },
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<FundForm groupId="group_1" onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText("Fund name"), "  旅行基金  ");
    await user.clear(screen.getByLabelText("Currency"));
    await user.type(screen.getByLabelText("Currency"), "twd");
    await user.click(screen.getByRole("button", { name: "Create fund" }));

    await waitFor(() =>
      expect(onSuccess).toHaveBeenCalledWith("/app/funds/fund_1"),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/app/groups/group_1/funds",
      {
        body: JSON.stringify({ currency: "TWD", name: "旅行基金" }),
        headers: {
          "content-type": "application/json",
          "x-csrf-token": "csrf-token",
        },
        method: "POST",
      },
    );
  });

  it("locks duplicate fund creation while the request is in flight", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url === "/api/auth/csrf") {
          return Promise.resolve(jsonResponse({ token: "csrf-token" }));
        }

        return new Promise<Response>(() => undefined);
      }),
    );

    render(<FundForm groupId="group_1" />);

    await user.type(screen.getByLabelText("Fund name"), "生活基金");
    await user.click(screen.getByRole("button", { name: "Create fund" }));
    const submit = await screen.findByRole("button", { name: "Creating..." });

    await user.click(submit);

    expect(submit).toBeDisabled();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

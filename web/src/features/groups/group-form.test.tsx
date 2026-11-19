import { cleanup, screen, waitFor } from "@testing-library/react";
import { render } from "@/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GroupForm } from "./group-form";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return Response.json({ token: "csrf-token" });
      }

      return Response.json(
        {
          data: {
            id: "g1",
            name: "我們的生活基金",
            group_type: "couple",
            default_currency: "TWD",
            status: "active",
          },
        },
        { status: 201 },
      );
    }),
  );
});

describe("GroupForm", () => {
  it("submits a trimmed create payload once and routes to the new group", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    render(<GroupForm mode="create" onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText("群組名稱"), "  我們的生活基金  ");
    await user.click(screen.getByRole("radio", { name: "雙人" }));
    await user.clear(screen.getByLabelText("幣別"));
    await user.type(screen.getByLabelText("幣別"), "twd");
    await user.click(screen.getByRole("button", { name: "建立群組" }));
    await user.click(screen.getByRole("button", { name: "建立群組" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith("/app/groups/g1"));

    const calls = vi.mocked(fetch).mock.calls.filter(([input]) => {
      return String(input) === "/api/app/groups";
    });

    expect(calls).toHaveLength(1);
    expect(JSON.parse(String(calls[0]?.[1]?.body))).toEqual({
      name: "我們的生活基金",
      group_type: "couple",
      default_currency: "TWD",
    });
  });

  it("keeps form values and shows backend field errors", async () => {
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      if (String(input) === "/api/auth/csrf") {
        return Response.json({ token: "csrf-token" });
      }

      return Response.json(
        { error: { code: "GROUP_NAME_TAKEN", field: "name" } },
        { status: 409 },
      );
    });
    const user = userEvent.setup();

    render(<GroupForm mode="create" />);

    await user.type(screen.getByLabelText("群組名稱"), "我們的生活基金");
    await user.click(screen.getByRole("button", { name: "建立群組" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "這個群組名稱已被使用。",
    );
    expect(screen.getByLabelText("群組名稱")).toHaveValue("我們的生活基金");
  });

  it("keeps form values and shows a session-expired error when refresh is rejected", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(Response.json({ token: "csrf-token" }))
      .mockResolvedValueOnce(Response.json({}, { status: 401 }))
      .mockResolvedValueOnce(
        Response.json(
          { error: { code: "SESSION_REQUIRED" } },
          { status: 401 },
        ),
      );
    const user = userEvent.setup();

    render(<GroupForm mode="create" />);

    await user.type(screen.getByLabelText("群組名稱"), "我們的生活基金");
    await user.click(screen.getByRole("button", { name: "建立群組" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "登入已過期，請重新登入後再試。",
    );
    expect(screen.getByLabelText("群組名稱")).toHaveValue("我們的生活基金");
    expect(
      vi.mocked(fetch).mock.calls.filter(
        ([input]) => String(input) === "/api/app/groups",
      ),
    ).toHaveLength(1);
  });
});

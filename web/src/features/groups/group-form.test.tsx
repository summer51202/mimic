import { cleanup, render, screen, waitFor } from "@testing-library/react";
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

    await user.type(screen.getByLabelText("Group name"), "  我們的生活基金  ");
    await user.click(screen.getByRole("radio", { name: "Couple" }));
    await user.clear(screen.getByLabelText("Currency"));
    await user.type(screen.getByLabelText("Currency"), "twd");
    await user.click(screen.getByRole("button", { name: "Create group" }));
    await user.click(screen.getByRole("button", { name: "Create group" }));

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

    await user.type(screen.getByLabelText("Group name"), "我們的生活基金");
    await user.click(screen.getByRole("button", { name: "Create group" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This group name is already used.",
    );
    expect(screen.getByLabelText("Group name")).toHaveValue("我們的生活基金");
  });
});

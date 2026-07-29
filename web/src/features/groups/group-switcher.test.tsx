import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { Group } from "@/shared/api/domain-contracts";

import { GroupSwitcher } from "./group-switcher";

afterEach(() => cleanup());

const groups: Group[] = [
  {
    id: "g1",
    name: "我們的生活基金",
    group_type: "couple",
    default_currency: "TWD",
    status: "active",
  },
  {
    id: "g2",
    name: "旅行隊伍",
    group_type: "group",
    default_currency: "JPY",
    status: "active",
  },
];

describe("GroupSwitcher", () => {
  it("links each group back to /app with a group query", () => {
    render(<GroupSwitcher groups={groups} selectedGroupId="g1" />);

    expect(screen.getByRole("link", { name: "我們的生活基金" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "旅行隊伍" })).toHaveAttribute(
      "href",
      "/app?group=g2",
    );
  });
});

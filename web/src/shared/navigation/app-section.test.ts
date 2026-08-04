import { describe, expect, it } from "vitest";

import { currentAppSection } from "./app-section";

describe("currentAppSection", () => {
  it.each([
    ["/app", "/app"],
    ["/app/groups", "/app/groups"],
    ["/app/groups/g1", "/app/groups"],
    ["/app/funds", "/app/funds"],
    ["/app/funds/f1", "/app/funds"],
  ])("maps %s to %s", (pathname, expectedSection) => {
    expect(currentAppSection(pathname)).toBe(expectedSection);
  });
});

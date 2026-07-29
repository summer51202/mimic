import { describe, expect, it } from "vitest";

import { selectGroupId } from "./group-selection";

describe("selectGroupId", () => {
  it("prefers an active URL group choice over a remembered group", () => {
    expect(selectGroupId("g2", "g1", [{ id: "g1" }, { id: "g2" }])).toBe(
      "g2",
    );
  });

  it("falls back to the first active group when choices are unavailable", () => {
    expect(selectGroupId("missing", "g1", [{ id: "g2" }])).toBe("g2");
  });

  it("uses a remembered active group when the URL choice is inactive", () => {
    expect(
      selectGroupId("g2", "g1", [
        { id: "g1", status: "active" },
        { id: "g2", status: "deleted" },
      ]),
    ).toBe("g1");
  });

  it("returns null when there are no active groups", () => {
    expect(
      selectGroupId(undefined, "g1", [
        { id: "g1", status: "deleted" },
        { id: "g2", status: "archived" },
      ]),
    ).toBeNull();
  });
});

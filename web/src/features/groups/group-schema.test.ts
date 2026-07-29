import { describe, expect, it } from "vitest";

import { createGroupSchema, renameGroupSchema } from "./group-schema";

describe("group schemas", () => {
  it("trims group names and normalizes default currency", () => {
    expect(
      createGroupSchema.parse({
        name: "  我們的生活基金  ",
        groupType: "couple",
        defaultCurrency: "twd",
      }),
    ).toEqual({
      name: "我們的生活基金",
      groupType: "couple",
      defaultCurrency: "TWD",
    });
  });

  it("rejects unsupported group types and invalid currency codes", () => {
    expect(() =>
      createGroupSchema.parse({
        name: "冒險隊",
        groupType: "solo",
        defaultCurrency: "TW",
      }),
    ).toThrow();
  });

  it("validates renamed group names", () => {
    expect(renameGroupSchema.parse({ name: "  新寶庫  " })).toEqual({
      name: "新寶庫",
    });
    expect(() => renameGroupSchema.parse({ name: "" })).toThrow();
  });
});

import { describe, expect, it } from "vitest";

import { displayNameSchema, settingsProfileSchema } from "./settings-schema";

const profile = {
  id: "user-1",
  mimic_id: "MIMIC-2345-6789",
  email: "edward@example.com",
  display_name: "Edward",
  locale: "zh-TW",
  timezone: "Asia/Taipei",
};

describe("settings schemas", () => {
  it("accepts the complete current-user profile", () => {
    expect(settingsProfileSchema.parse(profile)).toEqual(profile);
  });

  it("rejects malformed public identity values", () => {
    expect(() =>
      settingsProfileSchema.parse({ ...profile, mimic_id: "user-1" }),
    ).toThrow();
  });

  it("trims valid display names and rejects blank or oversized names", () => {
    expect(displayNameSchema.parse({ displayName: "  Edward Lee  " })).toEqual({
      displayName: "Edward Lee",
    });
    expect(() => displayNameSchema.parse({ displayName: "   " })).toThrow();
    expect(() =>
      displayNameSchema.parse({ displayName: "N".repeat(101) }),
    ).toThrow();
  });
});

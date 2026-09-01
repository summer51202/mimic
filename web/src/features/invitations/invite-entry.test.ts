import { describe, expect, it } from "vitest";

import { parseInviteEntry } from "./invite-entry";

describe("parseInviteEntry", () => {
  it.each([
    ["abcDEF123_-4", "abcDEF123_-4"],
    ["  abcDEF123_-4  ", "abcDEF123_-4"],
    ["https://app.example/invite/abcDEF123_-4", "abcDEF123_-4"],
    ["http://localhost:3010/invite/abcDEF123_-4/", "abcDEF123_-4"],
    [
      "https://other.example/invite/abcDEF123_-4?source=message#accept",
      "abcDEF123_-4",
    ],
  ])("extracts a canonical invite code from %s", (entry, expected) => {
    expect(parseInviteEntry(entry)).toBe(expected);
  });

  it.each([
    "",
    "   ",
    "ABCD1234XYZ",
    "bad code!",
    "/invite/abcDEF123_-4",
    "mailto:abcDEF123_-4@example.com",
    "https://app.example/groups/abcDEF123_-4",
    "https://app.example/invite/abcDEF123_-4/extra",
    "not a url/invite/abcDEF123_-4",
  ])("rejects unsupported entry %s", (entry) => {
    expect(parseInviteEntry(entry)).toBeNull();
  });
});

import { describe, expect, it, vi } from "vitest";

import { validateCsrf } from "./csrf";

vi.mock("server-only", () => ({}));

describe("CSRF validation", () => {
  it("accepts matching tokens", () => {
    expect(validateCsrf("same", "same")).toBe(true);
  });

  it("rejects different tokens", () => {
    expect(validateCsrf("one", "two")).toBe(false);
  });

  it("rejects missing cookie tokens", () => {
    expect(validateCsrf(undefined, "two")).toBe(false);
  });

  it("rejects equal-length mismatches", () => {
    expect(validateCsrf("abc123", "abc124")).toBe(false);
  });

  it("rejects length mismatches before timing-safe comparison", () => {
    expect(validateCsrf("short", "a-much-longer-token")).toBe(false);
  });
});

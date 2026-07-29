import { describe, expect, it } from "vitest";

import { safeReturnTo } from "./safe-return-to";

describe("safeReturnTo", () => {
  it("accepts app and invite relative return paths", () => {
    expect(safeReturnTo("/invite/abc?source=mail", "/app")).toBe(
      "/invite/abc?source=mail",
    );
    expect(safeReturnTo("/app?group=g1", "/app")).toBe("/app?group=g1");
  });

  it("rejects absolute and protocol-relative URLs", () => {
    expect(safeReturnTo("https://evil.example", "/app")).toBe("/app");
    expect(safeReturnTo("//evil.example/app", "/app")).toBe("/app");
  });

  it("rejects unsafe path characters and encoded controls", () => {
    expect(safeReturnTo("/app\\evil", "/app")).toBe("/app");
    expect(safeReturnTo("/app/%0aevil", "/app")).toBe("/app");
    expect(safeReturnTo("/app/%10evil", "/app")).toBe("/app");
    expect(safeReturnTo("/app/\u0000evil", "/app")).toBe("/app");
  });

  it("rejects paths outside the app and invite areas", () => {
    expect(safeReturnTo("/", "/app")).toBe("/app");
    expect(safeReturnTo("/login", "/app")).toBe("/app");
    expect(safeReturnTo("/app/../login", "/app")).toBe("/app");
    expect(safeReturnTo("/invite/../login", "/app")).toBe("/app");
  });
});

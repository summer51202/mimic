import { describe, expect, it } from "vitest";

import { mapApiError } from "./errors";
import { ApiContractError, readEnvelope } from "./read-envelope";

describe("readEnvelope", () => {
  it("returns the data payload from a successful API envelope", () => {
    expect(readEnvelope({ data: { ok: true } })).toEqual({ ok: true });
  });

  it("throws ApiContractError when the API returns an error envelope", () => {
    expect(() => readEnvelope({ error: "bad" })).toThrow(ApiContractError);
  });

  it("throws ApiContractError when the envelope is missing data", () => {
    expect(() => readEnvelope({})).toThrow(ApiContractError);
  });
});

describe("mapApiError", () => {
  it("preserves backend API error codes", () => {
    expect(mapApiError(401, "INVALID_CREDENTIALS").code).toBe(
      "INVALID_CREDENTIALS",
    );
  });

  it("prefers Nest message codes over generic error labels", () => {
    expect(
      mapApiError(401, {
        message: "INVALID_CREDENTIALS",
        error: "Unauthorized",
      }).code,
    ).toBe("INVALID_CREDENTIALS");
  });
});

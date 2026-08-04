import { describe, expect, it } from "vitest";

import { ApiError, ApiUnavailableError } from "./errors";
import { classifyReadError } from "./read-state";

describe("classifyReadError", () => {
  it.each([
    [new ApiUnavailableError(), "unavailable"],
    [new ApiError(403, "FORBIDDEN"), "forbidden"],
    [new ApiError(404, "NOT_FOUND"), "not-found"],
    [new ApiError(500, "SERVER_ERROR"), "unknown"],
    [new Error("unexpected"), "unknown"],
  ] as const)("classifies %s as %s", (error, expected) => {
    expect(classifyReadError(error)).toBe(expected);
  });
});

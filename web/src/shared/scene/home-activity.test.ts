import { expect, it } from "vitest";
import { homeActivityKey, homeActivityStorageKey, isNewerHomeActivity } from "./home-activity";

it("serializes the server creation timestamp and compares instants before IDs", () => {
  const id = "00000000-0000-4000-8000-000000000001";
  const largerId = "ffffffff-ffff-4fff-bfff-ffffffffffff";
  const seen = homeActivityKey("2026-11-13T08:00:00+08:00", largerId);
  expect(homeActivityStorageKey("personal")).toBe("mimic.home.latest-recorded.personal");
  expect(seen).toBe(`2026-11-13T08:00:00+08:00|${largerId}`);
  expect(isNewerHomeActivity(homeActivityKey("2026-11-13T00:00:00.001Z", id), seen)).toBe(true);
  expect(isNewerHomeActivity(homeActivityKey("2026-11-13T00:00:00.000Z", id), seen)).toBe(false);
  expect(isNewerHomeActivity(homeActivityKey("2026-11-13T00:00:00.000Z", largerId), seen)).toBe(false);
  expect(isNewerHomeActivity(seen, homeActivityKey("2026-11-13T00:00:00Z", id))).toBe(true);
  expect(isNewerHomeActivity(seen, "invalid stored cursor")).toBe(false);
});

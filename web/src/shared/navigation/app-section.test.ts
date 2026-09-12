import { describe, expect, it } from "vitest";

import { currentAppSection, quickExpenseHref } from "./app-section";

describe("currentAppSection", () => {
  it.each([
    ["/app", "/app"],
    ["/app/personal", "/app/personal"],
    ["/app/groups", "/app/groups"],
    ["/app/groups/g1", "/app/groups"],
    ["/app/tasks", "/app/tasks"],
    ["/app/settings", "/app/settings"],
    ["/app/settings/profile", "/app/settings"],
  ])("maps %s to %s", (pathname, expectedSection) => {
    expect(currentAppSection(pathname)).toBe(expectedSection);
  });
});

describe('quickExpenseHref', () => {
  it('keeps the current space or personal ledger instead of changing accounting mode', () => {
    const id = '00000000-0000-4000-8000-000000000001';
    expect(quickExpenseHref(`/app/spaces/${id}`, '')).toBe(`/app/spaces/${id}?quick=1`);
    expect(quickExpenseHref('/app/personal', `space=${id}`)).toBe(`/app/personal?space=${id}&quick=1`);
    expect(quickExpenseHref('/app', `group=${id}`)).toBe(`/app?group=${id}&quick=1`);
    expect(quickExpenseHref('/app/tasks', '')).toBe('/app?quick=1');
  });
});

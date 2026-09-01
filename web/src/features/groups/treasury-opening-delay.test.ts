import { afterEach, describe, expect, it, vi } from "vitest";

import { treasuryOpeningMinimumMs, waitForTreasuryOpening } from "./treasury-opening-delay";

describe("waitForTreasuryOpening", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("remains pending until the 1,000 ms opening floor", async () => {
    vi.useFakeTimers();
    let settled = false;
    const opening = waitForTreasuryOpening().then(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(treasuryOpeningMinimumMs - 1);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await opening;
    expect(settled).toBe(true);
  });
});

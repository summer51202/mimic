import { afterEach, describe, expect, it, vi } from "vitest";

import { treasuryOpeningMinimumMs, waitForTreasuryOpening } from "./treasury-opening-delay";

describe("waitForTreasuryOpening", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("remains pending until the 1,000 ms opening floor", async () => {
    vi.useFakeTimers();
    expect(treasuryOpeningMinimumMs).toBe(1_000);
    let settled = false;
    const opening = waitForTreasuryOpening().then(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(999);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await opening;
    expect(settled).toBe(true);
  });
});

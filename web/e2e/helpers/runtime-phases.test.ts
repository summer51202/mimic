import { describe, expect, it } from "vitest";

import { runRuntimePhases } from "./runtime-phases";

describe("runRuntimePhases", () => {
  it("checks health immediately after real auth and Groups/Funds navigation", async () => {
    const events: string[] = [];

    await runRuntimePhases({
      authenticate: async () => events.push("authenticate"),
      checkpoint: async (phase) => events.push(phase),
      navigateGroupsAndFunds: async () => events.push("navigate Groups/Funds"),
    });

    expect(events).toEqual([
      "authenticate",
      "after authentication setup",
      "navigate Groups/Funds",
      "after Groups/Funds navigation",
    ]);
  });
});

export const treasuryOpeningMinimumMs = 1_000;

export function waitForTreasuryOpening(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, treasuryOpeningMinimumMs);
  });
}

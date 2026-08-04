export type RuntimePhaseActions = {
  authenticate: () => Promise<unknown>;
  checkpoint: (phase: string) => Promise<unknown>;
  navigateGroupsAndFunds: () => Promise<unknown>;
};

export async function runRuntimePhases(actions: RuntimePhaseActions) {
  await actions.authenticate();
  await actions.checkpoint("after authentication setup");
  await actions.navigateGroupsAndFunds();
  await actions.checkpoint("after Groups/Funds navigation");
}

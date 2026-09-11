export function assertLocalSeedTarget(raw: string | undefined): void {
  let target: URL;
  try { target = new URL(raw ?? ''); }
  catch { throw new Error('LOCAL_SEED_DATABASE_REQUIRED'); }
  if (!['postgres:', 'postgresql:'].includes(target.protocol) ||
      !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) ||
      !['/mimic', '/mimic_financial_spaces_test', '/mimic_financial_spaces_dev'].includes(target.pathname)) {
    throw new Error('LOCAL_SEED_DATABASE_REQUIRED');
  }
}

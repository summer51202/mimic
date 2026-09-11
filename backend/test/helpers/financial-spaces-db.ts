export function assertSpacesTestDatabase(raw: string | undefined): void {
  let url: URL;
  try { url = new URL(raw ?? ''); }
  catch { throw new Error('LOCAL_SPACES_TEST_DATABASE_REQUIRED'); }
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
      !['postgres:', 'postgresql:'].includes(url.protocol) || url.pathname !== '/mimic_financial_spaces_test') {
    throw new Error('LOCAL_SPACES_TEST_DATABASE_REQUIRED');
  }
}

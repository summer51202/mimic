// Guard for tests that must run against a database built only by `prisma migrate deploy`
// (never `prisma db seed`), which is how Railway staging/production databases are built.
export function assertMigrationOnlyTestDatabase(raw: string | undefined): void {
  let url: URL;
  try { url = new URL(raw ?? ''); }
  catch { throw new Error('LOCAL_MIGRATION_ONLY_TEST_DATABASE_REQUIRED'); }
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
      !['postgres:', 'postgresql:'].includes(url.protocol) || url.pathname !== '/mimic_migration_only_test') {
    throw new Error('LOCAL_MIGRATION_ONLY_TEST_DATABASE_REQUIRED');
  }
}

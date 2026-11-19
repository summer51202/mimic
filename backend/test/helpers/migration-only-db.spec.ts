import { assertMigrationOnlyTestDatabase } from './migration-only-db';
describe('migration-only test database guard', () => {
  it.each([undefined, '', 'bad-url', 'postgresql://remote.example/mimic_migration_only_test',
    'https://localhost/mimic_migration_only_test', 'postgresql://localhost/mimic',
    'postgresql://localhost/mimic_financial_spaces_test'])('rejects %s', value => {
    expect(() => assertMigrationOnlyTestDatabase(value)).toThrow('LOCAL_MIGRATION_ONLY_TEST_DATABASE_REQUIRED');
  });
  it.each(['localhost', '127.0.0.1', '[::1]'])('accepts loopback %s', host => {
    expect(() => assertMigrationOnlyTestDatabase(`postgresql://${host}:55439/mimic_migration_only_test?schema=public`)).not.toThrow();
  });
});

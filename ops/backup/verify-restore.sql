\set ON_ERROR_STOP on
\pset pager off
\if :{?expected_migration}
\else
  \echo 'expected_migration psql variable is required' >&2
  \quit 3
\endif
\if :{?expected_release}
\else
  \echo 'expected_release psql variable is required' >&2
  \quit 3
\endif
WITH required(name) AS (
  VALUES ('_prisma_migrations'), ('User'), ('groups'), ('group_members'),
         ('group_invites'), ('funds'), ('categories'), ('contributions'),
         ('expenses'), ('expense_payers'), ('expense_splits'), ('settlements'),
         ('recurring_contribution_rules'), ('AuditLog')
)
SELECT bool_and(to_regclass(format('%I.%I', 'public', name)) IS NOT NULL)
       AND count(*) = 14 AS required_tables_ok
FROM required
\gset
\if :required_tables_ok
\else
  \echo 'required Mimic tables are missing' >&2
  \quit 3
\endif
SELECT EXISTS (
  SELECT 1 FROM "_prisma_migrations"
  WHERE migration_name = :'expected_migration'
    AND finished_at IS NOT NULL AND rolled_back_at IS NULL
) AS expected_migration_ok,
(:'expected_release' ~ '^[0-9A-Za-z][0-9A-Za-z._-]{0,127}$') AS expected_release_ok
\gset
\if :expected_migration_ok
\else
  \echo 'expected migration is not applied' >&2
  \quit 3
\endif
\if :expected_release_ok
\else
  \echo 'expected release identity is invalid' >&2
  \quit 3
\endif
SELECT current_database() AS restored_database,
       :'expected_migration' AS expected_migration,
       :'expected_release' AS expected_release,
       clock_timestamp() AT TIME ZONE 'UTC' AS verified_at_utc;
SELECT COUNT(*)::bigint AS applied_migrations
FROM "_prisma_migrations"
WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL;
SELECT format(
  'SELECT %L AS table_name, COUNT(*)::bigint AS row_count FROM %I.%I;',
  schemaname || '.' || tablename, schemaname, tablename
)
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename
\gexec

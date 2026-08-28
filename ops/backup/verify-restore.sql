\set ON_ERROR_STOP on
\pset pager off

SELECT current_database() AS restored_database,
       clock_timestamp() AT TIME ZONE 'UTC' AS verified_at_utc;

SELECT COUNT(*)::bigint AS applied_migrations
FROM "_prisma_migrations"
WHERE finished_at IS NOT NULL
  AND rolled_back_at IS NULL;

SELECT format(
  'SELECT %L AS table_name, COUNT(*)::bigint AS row_count FROM %I.%I;',
  schemaname || '.' || tablename,
  schemaname,
  tablename
)
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename
\gexec

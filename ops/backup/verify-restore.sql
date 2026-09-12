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
         ('group_invites'), ('audit_logs'), ('financial_spaces'),
         ('space_participants'), ('space_audit_events'), ('taxonomy_terms'),
         ('taxonomy_audit_events'), ('expense_records'), ('expense_record_tags'),
         ('shared_expense_payers'), ('shared_expense_allocations'),
         ('expense_mutation_receipts'), ('personal_expense_references'),
         ('personal_expense_reference_tags'), ('personal_reference_receipts'),
         ('shared_settlement_batches'), ('shared_settlement_transfers'),
         ('shared_corrections'), ('shared_correction_payers'),
         ('shared_correction_allocations'), ('shared_operation_receipts'),
         ('pooled_commitments'), ('pooled_commitment_assignments'),
         ('pooled_contribution_occurrences'), ('pooled_contributions'),
         ('pooled_expense_payments'), ('pooled_reimbursements'),
         ('pooled_corrections'), ('pooled_return_plans'), ('pooled_returns'),
         ('pooled_transition_postings'), ('pooled_operation_receipts')
)
SELECT bool_and(to_regclass(format('%I.%I', 'public', name)) IS NOT NULL)
       AND count(*) = 36 AS required_tables_ok
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

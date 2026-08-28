\set ON_ERROR_STOP on
\if :{?scratch_database}
\else
  \echo 'scratch_database psql variable is required' >&2
  \quit 3
\endif
\if :{?sentinel_nonce}
\else
  \echo 'sentinel_nonce psql variable is required' >&2
  \quit 3
\endif
SELECT current_database() = :'scratch_database' AS scratch_database_ok,
       :'sentinel_nonce' ~ '^[0-9a-f]{32}$' AS sentinel_nonce_ok
\gset
\if :scratch_database_ok
\else
  \echo 'connected database does not match scratch_database' >&2
  \quit 3
\endif
\if :sentinel_nonce_ok
\else
  \echo 'sentinel_nonce must be 128-bit lowercase hex' >&2
  \quit 3
\endif
SELECT format('COMMENT ON DATABASE %I IS %L', current_database(), 'mimic-restore-scratch:' || :'sentinel_nonce')
\gexec
SELECT current_database() AS scratch_database,
       system_identifier::text AS scratch_system_identifier,
       obj_description(d.oid, 'pg_database') AS scratch_sentinel
FROM pg_control_system(), pg_database AS d
WHERE d.datname = current_database();

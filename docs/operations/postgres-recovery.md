# Mimic PostgreSQL backup and recovery

This runbook combines Railway volume backups/PITR with independently authenticated weekly logical backups. Complete a restore drill before accepting Closed Beta data. Never restore a logical dump over Production.

Authoritative Railway behavior is documented in [Point-in-Time Recovery](https://docs.railway.com/volumes/point-in-time-recovery) and [Back Up and Restore Postgres](https://docs.railway.com/guides/postgres-backups-restores). Railway creates a brand-new sibling service for PITR; volume-backup restore is a different, same-service operation.

## Objectives and mandatory evidence

- Production PITR target RPO: at most 15 minutes.
- Restore target RTO: under four hours from decision to verified completion.
- Weekly logical backups provide portable offsite recovery, not the 15-minute RPO.
- Two operators approve a drill: one executes it and one independently verifies the target identity.
- Escalate to the project owner and hosting/storage support if PITR is unhealthy, RPO or RTO is missed, a signature/checksum fails, versions differ, required tables/migration are missing, or any target guard fails.

Record UTC source/restore timestamps, source/client/target PostgreSQL major and full version numbers, source release, expected migration, object/version ID, system identifiers, sentinel confirmation, migration count, exact row counts, effective RPO/RTO, and explicit confirmation that Production was not modified.

## Railway protection before Beta

1. On Production PostgreSQL, open **Backups**, enable a daily volume-backup schedule, and record retention and the first success. Volume restore stages a replacement volume on the same service; it is not the routine drill path.
2. Click **Enable PITR**. Railway configures WAL archiving and rolling pgBackRest backups. Wait for the first base backup and confirm the available restore range is current enough for the RPO.
3. Enable daily volume backups on Staging.
4. Run both a PITR sibling verification and a signed logical restore drill before launch.

For PITR recovery, select the timestamp and click **Restore to this moment**. Railway creates and deploys a new sibling PostgreSQL service automatically; do not pre-create a PITR target. The source remains running. Verify the sibling, then make cutover or row-copying a separately approved incident action. The restored sibling has PITR disabled until explicitly enabled for that service.

## PostgreSQL version policy

Logical backup and restore fail closed unless source server, backup client, signed-manifest major, target server, and restore client all share one PostgreSQL major. The default image fixes PostgreSQL client major 16 and Alpine release 3.22.2:

```sh
docker build --build-arg POSTGRES_MAJOR=16 -f ops/backup/Dockerfile ops/backup -t mimic-backup:pg16
```

If Railway changes the database major, build and verify a matching image first; never use a newer `pg_dump` merely because it might be backward-compatible. Alpine package patch revisions are resolved when the image builds, so record the resulting image digest/SBOM as well as `SHOW server_version_num`, `pg_dump --version`, and `pg_restore --version` in drill evidence. Do not describe package revisions as pinned unless the package repository and versions are locked separately.

Repository tests use fake PostgreSQL clients to prove argument, environment, ordering, and service-file semantics. They do not prove libpq parsing. A Docker/Railway gate must therefore build the image and run a real `psql --dbname=service=mimic_backup` connection plus a real scratch `pg_restore --dbname=service=mimic_restore` drill using the sealed discrete variables before Closed Beta.

## Encryption and provenance keys

Generate both key pairs offline under `umask 077`:

```sh
age-keygen -o mimic-backup-identity.txt
age-keygen -y mimic-backup-identity.txt
minisign -G -W -s mimic-backup-signing.key -p mimic-backup-signing.pub
MIMIC_BACKUP_MINISIGN_PUBLIC_KEY="$(sed -n '2p' mimic-backup-signing.pub)"
case "$MIMIC_BACKUP_MINISIGN_PUBLIC_KEY" in RW*) ;; *) printf '%s\n' 'Invalid minisign public-key prefix' >&2; exit 2 ;; esac
if [ "${#MIMIC_BACKUP_MINISIGN_PUBLIC_KEY}" -ne 56 ] ||
   [ "$(printf '%s' "$MIMIC_BACKUP_MINISIGN_PUBLIC_KEY" | tr -d 'A-Za-z0-9+/=')" ]; then
  printf '%s\n' 'Invalid single-line minisign public key' >&2
  exit 2
fi
export MIMIC_BACKUP_MINISIGN_PUBLIC_KEY
printf 'MIMIC_BACKUP_MINISIGN_PUBLIC_KEY=%s\n' "$MIMIC_BACKUP_MINISIGN_PUBLIC_KEY"
```

Custody rules:

- Store the age private identity offline/in the approved vault. Railway receives only `MIMIC_BACKUP_AGE_RECIPIENT`.
- Store the unencrypted minisign secret key only as the masked `MIMIC_BACKUP_MINISIGN_SECRET_KEY` on the isolated backup service. This key is required for unattended signing and must never exist on a restore runner.
- Restore operators receive only `MIMIC_BACKUP_MINISIGN_PUBLIC_KEY` and the separately controlled age identity.
- Rotate signing/encryption keys with an overlap drill; retain old verification/decryption keys for retained objects.

## Offsite bucket controls

Use an offsite S3-compatible bucket with versioning enabled. Enable Object Lock/WORM retention when supported; otherwise deny overwrite/delete to the backup principal. Use separate read-only restore and write-only backup credentials: the scheduled backup credential is write-only for `weekly/`, while the restore principal is read-only. Neither credential may administer lifecycle, versioning, or retention.

Configure a 90-day lifecycle for current and non-current `weekly/` objects with an administrative credential used only for bucket setup. Verify the lifecycle afterward. Never place that administrative credential on the backup or restore service.

Save this policy as an untracked temporary `lifecycle-90-days.json`:

```json
{
  "Rules": [{
    "ID": "expire-mimic-weekly-after-90-days",
    "Status": "Enabled",
    "Filter": { "Prefix": "weekly/" },
    "Expiration": { "Days": 90 },
    "NoncurrentVersionExpiration": { "NoncurrentDays": 90 }
  }]
}
```

Apply and read back the controls with the bucket-administration identity, then securely remove the temporary policy file:

```sh
aws --endpoint-url "$MIMIC_BACKUP_S3_ENDPOINT" s3api put-bucket-versioning \
  --bucket "$MIMIC_BACKUP_S3_BUCKET" --versioning-configuration Status=Enabled
aws --endpoint-url "$MIMIC_BACKUP_S3_ENDPOINT" s3api put-bucket-lifecycle-configuration \
  --bucket "$MIMIC_BACKUP_S3_BUCKET" --lifecycle-configuration file://lifecycle-90-days.json
aws --endpoint-url "$MIMIC_BACKUP_S3_ENDPOINT" s3api get-bucket-versioning \
  --bucket "$MIMIC_BACKUP_S3_BUCKET"
aws --endpoint-url "$MIMIC_BACKUP_S3_ENDPOINT" s3api get-bucket-lifecycle-configuration \
  --bucket "$MIMIC_BACKUP_S3_BUCKET"
```

Where Object Lock is supported, enable it during bucket creation and verify it with `s3api get-object-lock-configuration`; do not claim immutability when the provider returns no enabled configuration.

Each backup key contains UTC time plus 128 random bits. The encrypted dump, checksum, signed manifest, and signature share the key; the signature is uploaded last as the publication marker. Consumers ignore sets without a valid signature. Record storage version IDs after upload and alert on any later version or deletion-marker change.

## Weekly Railway cron service

Deploy `ops/backup/Dockerfile` as Production service `mimic-backup-job` and schedule `0 3 * * 0` (Sunday 03:00 UTC). Configure:

- Add these Railway reference variables, replacing `ProductionPostgres` only if the Production database service has a different exact service name:

```dotenv
MIMIC_BACKUP_DATABASE_HOST=${{ProductionPostgres.PGHOST}}
MIMIC_BACKUP_DATABASE_PORT=${{ProductionPostgres.PGPORT}}
MIMIC_BACKUP_DATABASE_USER=${{ProductionPostgres.PGUSER}}
MIMIC_BACKUP_DATABASE_PASSWORD=${{ProductionPostgres.PGPASSWORD}}
MIMIC_BACKUP_DATABASE_NAME=${{ProductionPostgres.PGDATABASE}}
MIMIC_BACKUP_DATABASE_SSL_MODE=require
```

- `MIMIC_BACKUP_DATABASE_USER` must be a dedicated login with only the connection and read privileges needed by `pg_dump`; it must not own Production objects or hold write/DDL/role-management privileges.
- `MIMIC_POSTGRES_CLIENT_MAJOR`, `MIMIC_EXPECTED_MIGRATION`, and `MIMIC_BACKUP_RELEASE` matching the deployed release.
- `MIMIC_BACKUP_AGE_RECIPIENT` and backup-only `MIMIC_BACKUP_MINISIGN_SECRET_KEY`.
- `MIMIC_BACKUP_S3_ENDPOINT`, `MIMIC_BACKUP_S3_BUCKET`, `AWS_DEFAULT_REGION`, and the write-only `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`; add `AWS_SESSION_TOKEN` only for temporary credentials.

The script validates each discrete connection field against control-character/line injection, writes `host`, `port`, `user`, `password`, `dbname`, and `sslmode` separately to a mode-`0600` temporary [libpq service file](https://www.postgresql.org/docs/current/libpq-pgservice.html), and immediately unsets the connection variables. It scopes `PGSERVICEFILE` only to each database command; process arguments contain only `service=mimic_backup`, and the exit trap removes the file. The signing key is written and unset before database children run. AWS credentials are unset globally and supplied only to each `aws` invocation. The script verifies the latest source migration, encrypts before upload, deletes plaintext immediately, signs the manifest, and publishes the signature last. Do not enable shell tracing. A successful log contains only `backup_uploaded=<object key>`.

## Provision an independent logical-restore target

This sentinel procedure is only for the weekly logical restore, not PITR.

1. Create a new PostgreSQL service in **Staging**, never Production. On the operator runner, wire its exact Railway service variables (replace `ScratchPostgres` only if its service name differs), then create a database whose literal name matches `mimic_*_restore_drill`:

```dotenv
MIMIC_RESTORE_DATABASE_HOST=${{ScratchPostgres.PGHOST}}
MIMIC_RESTORE_DATABASE_PORT=${{ScratchPostgres.PGPORT}}
MIMIC_RESTORE_DATABASE_USER=${{ScratchPostgres.PGUSER}}
MIMIC_RESTORE_DATABASE_PASSWORD=${{ScratchPostgres.PGPASSWORD}}
MIMIC_RESTORE_ADMIN_DATABASE_NAME=${{ScratchPostgres.PGDATABASE}}
MIMIC_RESTORE_DATABASE_NAME=mimic_weekly_restore_drill
MIMIC_RESTORE_DATABASE_SSL_MODE=require
```

The scratch restore login may own the new drill database so `--clean` can replace its application schema, but it must have no access to Production and no Railway administration credentials. The backup database login must never be reused here.

```sh
PGHOST="$MIMIC_RESTORE_DATABASE_HOST" PGPORT="$MIMIC_RESTORE_DATABASE_PORT" \
PGUSER="$MIMIC_RESTORE_DATABASE_USER" PGPASSWORD="$MIMIC_RESTORE_DATABASE_PASSWORD" \
PGDATABASE="$MIMIC_RESTORE_ADMIN_DATABASE_NAME" PGSSLMODE="$MIMIC_RESTORE_DATABASE_SSL_MODE" \
createdb "$MIMIC_RESTORE_DATABASE_NAME"
unset MIMIC_RESTORE_ADMIN_DATABASE_NAME
```
2. Independently query Production once with `SELECT system_identifier::text FROM pg_control_system();` and store the value as protected recovery metadata. Do not supply a Production URL to the restore process.
3. Generate, validate, export, and display a new 128-bit nonce on the operator host:

```sh
MIMIC_RESTORE_SENTINEL_NONCE="$(od -An -N16 -tx1 /dev/urandom | tr -d ' \n')"
case "$MIMIC_RESTORE_SENTINEL_NONCE" in
  [0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]) ;;
  *) printf '%s\n' 'Invalid scratch sentinel nonce' >&2; exit 2 ;;
esac
export MIMIC_RESTORE_SENTINEL_NONCE
printf 'MIMIC_RESTORE_SENTINEL_NONCE=%s\n' "$MIMIC_RESTORE_SENTINEL_NONCE"
```

The nonce is not a decryption key, but it is independent target-identity evidence. The approving operator must copy the displayed value into the protected drill record before provisioning, separately from the scratch service configuration. Do not regenerate it after provisioning; supply that recorded value to the restore environment.

4. Scope the discrete scratch fields to the provisioning command:

```sh
PGHOST="$MIMIC_RESTORE_DATABASE_HOST" PGPORT="$MIMIC_RESTORE_DATABASE_PORT" \
PGUSER="$MIMIC_RESTORE_DATABASE_USER" PGPASSWORD="$MIMIC_RESTORE_DATABASE_PASSWORD" \
PGDATABASE="$MIMIC_RESTORE_DATABASE_NAME" PGSSLMODE="$MIMIC_RESTORE_DATABASE_SSL_MODE" \
psql --set=ON_ERROR_STOP=1 \
  --set=scratch_database="$MIMIC_RESTORE_DATABASE_NAME" \
  --set=sentinel_nonce="$MIMIC_RESTORE_SENTINEL_NONCE" \
  --file=ops/backup/provision-scratch.sql
```

The SQL verifies the connected name, writes `mimic-restore-scratch:<nonce>` as the database comment outside the restored application schema, and prints the scratch cluster system identifier. The approving operator records the nonce and system identifier independently. Restore requires both values and rejects the recorded Production system identifier even if names or confirmation variables are forged.

## Run a signed logical restore drill

Select an object matching `weekly/mimic-YYYYMMDDTHHMMSSZ-<32 lowercase hex>.dump.age`. Create an untracked mode-`0600` environment file containing:

- S3 endpoint/bucket and the exact `MIMIC_BACKUP_OBJECT`.
- The read-only restore principal's AWS variables.
- `MIMIC_BACKUP_MINISIGN_PUBLIC_KEY`.
- Scratch-only `MIMIC_RESTORE_DATABASE_HOST`, `MIMIC_RESTORE_DATABASE_PORT`, `MIMIC_RESTORE_DATABASE_USER`, `MIMIC_RESTORE_DATABASE_PASSWORD`, `MIMIC_RESTORE_DATABASE_NAME`, and `MIMIC_RESTORE_DATABASE_SSL_MODE` using the `ScratchPostgres` wiring above; also set `MIMIC_RESTORE_ENVIRONMENT=staging-scratch` and `MIMIC_RESTORE_CONFIRM=RESTORE-INTO-SCRATCH`.
- Independently recorded `MIMIC_RESTORE_SENTINEL_NONCE`, `MIMIC_RESTORE_SYSTEM_IDENTIFIER`, and `MIMIC_PRODUCTION_SYSTEM_IDENTIFIER`.
- `MIMIC_POSTGRES_CLIENT_MAJOR`, `MIMIC_EXPECTED_MIGRATION`, and `MIMIC_EXPECTED_RELEASE` matching the selected signed backup and intended release.

Keep the age identity outside the environment file. The image runs as UID/GID 10001. Stream the operator-readable private identity over stdin so Docker creates a mode-`0600` temporary file owned by that non-root process; this avoids bind-mount UID mismatches:

```sh
docker run --rm -i \
  --user 10001:10001 \
  --env-file /secure/temp/mimic-restore.env \
  --entrypoint /opt/mimic/restore-entrypoint.sh \
  "$MIMIC_BACKUP_IMAGE" \
  < /secure/temp/mimic-backup-identity.txt
```

The restore validates the discrete scratch fields, writes each field separately to its own mode-`0600` libpq service file, then unsets the connection variables. It scopes `PGSERVICEFILE` only to database commands. Both `pg_restore` and verification explicitly target `service=mimic_restore`; no credential appears in their arguments, and the exit trap removes the service file. AWS credentials are supplied only to `aws` children. The restore checks target database/system/sentinel and Production inequality before object access. It verifies the minisign signature before trusting manifest fields, validates checksum identity, runs `sha256sum --check`, then decrypts. Only then may `pg_restore --clean --if-exists` run. `verify-restore.sql` fails unless the expected migration is applied, the signed release identity is supplied, and its required-table manifest exactly matches every Prisma model's physical table plus `_prisma_migrations`; it then emits exact counts.

Delete the temporary environment file and scratch service after evidence approval. Retain no decrypted dump or private key copy. A failed guard, signature, checksum, version, migration, release, or table check is terminal and must never be bypassed.

## Drill evidence record

| Field | Required evidence |
|---|---|
| Operators | Executor and independent approver |
| Source | PITR timestamp or signed object key and storage version IDs |
| Versions | Source/client/target PostgreSQL versions and common major |
| Identity | Production and scratch system IDs plus sentinel verification; no connection URL |
| Release/schema | Signed release, expected/applied migration, required-table result |
| Data | Exact row count for every public table |
| Integrity | Minisign result before SHA-256 result |
| Timing | UTC source, start, verified finish, effective RPO and RTO |
| Production exclusion | Confirmation no Production service, volume, URL, or signing key was used by restore |
| Result | Pass/fail, escalation owner, and follow-up due date |

PITR evidence passes only at RPO no more than 15 minutes and RTO under four hours. A weekly logical object may pass portability/integrity while being older than the PITR RPO; never report it as satisfying the 15-minute target.

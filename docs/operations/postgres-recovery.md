# Mimic PostgreSQL backup and recovery

This runbook covers Railway PostgreSQL snapshots/PITR and the independent weekly encrypted logical backup. Complete the readiness checklist before accepting Closed Beta data. Never restore over the Production database service.

## Recovery objectives and ownership

- Target RPO: at most 15 minutes, provided by Production point-in-time recovery (PITR).
- Target RTO: under four hours, measured from the restore decision to application/database verification.
- The weekly offsite logical dump is a portability and disaster-recovery layer. It does not by itself meet the 15-minute RPO.
- The on-call operator runs the procedure; a second operator verifies the target service and approves every destructive restore command.
- Escalate immediately to the project owner and hosting/storage support if PITR is unavailable, the measured RPO exceeds 15 minutes, the measured RTO exceeds four hours, a checksum fails, or verification reports missing migrations/tables.

## Before Beta data is accepted

For both Railway environments, confirm that PostgreSQL is a dedicated service and that Staging and Production variables never reference one another.

1. In the Railway project, open the Production PostgreSQL service's Backups panel.
2. Enable daily snapshots and PITR with retention that covers the agreed incident window. Confirm the displayed latest recoverable timestamp is no more than 15 minutes behind UTC now.
3. Enable daily snapshots for Staging as well. Record the schedule, retention, and first successful snapshot in the recovery evidence log.
4. Perform a sibling/scratch restore before launch. A backup configuration is not considered operational until a restore has been verified.
5. Configure the offsite S3-compatible bucket lifecycle to expire objects below `weekly/` after 90 days. Enable object versioning or retention protection when the provider supports it.

Save the following lifecycle document as an untracked temporary file on the operator machine, then apply it with the same endpoint and bucket used by the backup job:

```json
{
  "Rules": [
    {
      "ID": "expire-mimic-weekly-after-90-days",
      "Status": "Enabled",
      "Filter": { "Prefix": "weekly/" },
      "Expiration": { "Days": 90 },
      "NoncurrentVersionExpiration": { "NoncurrentDays": 90 }
    }
  ]
}
```

```sh
aws --endpoint-url "$MIMIC_BACKUP_S3_ENDPOINT" s3api put-bucket-lifecycle-configuration \
  --bucket "$MIMIC_BACKUP_S3_BUCKET" \
  --lifecycle-configuration file://lifecycle-90-days.json
aws --endpoint-url "$MIMIC_BACKUP_S3_ENDPOINT" s3api get-bucket-lifecycle-configuration \
  --bucket "$MIMIC_BACKUP_S3_BUCKET"
```

Delete the temporary lifecycle document after use. It contains no secret, but it is operational state rather than repository configuration.

## Create and custody the age identity

Generate the identity on an offline, encrypted operator device:

```sh
umask 077
age-keygen -o mimic-backup-identity.txt
age-keygen -y mimic-backup-identity.txt
```

Store the private `mimic-backup-identity.txt` in the approved secrets vault and its offline recovery copy. Do not commit it, upload it to the backup bucket, or configure it on the scheduled Railway service. Put only the public `age1...` recipient output in Railway as `MIMIC_BACKUP_AGE_RECIPIENT`. Test decryption custody with two authorized operators before launch.

## Weekly encrypted logical backup

Create the Production `mimic-backup-job` Railway service from `ops/backup/Dockerfile`. Schedule it for Sunday 03:00 UTC with cron expression `0 3 * * 0`. Configure these secret/service variables:

- `DATABASE_URL` — a reference to the Production PostgreSQL service only.
- `MIMIC_BACKUP_AGE_RECIPIENT` — the public age recipient; never the private identity.
- `MIMIC_BACKUP_S3_ENDPOINT` — HTTPS endpoint for the S3-compatible store.
- `MIMIC_BACKUP_S3_BUCKET` — dedicated backup bucket name.
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_DEFAULT_REGION` — credentials limited to writing/reading this bucket and prefix.
- `AWS_SESSION_TOKEN` — only when the storage provider issues temporary credentials.

The job creates a custom-format dump in a private temporary directory, encrypts it, removes the plaintext, calculates the encrypted object's SHA-256 checksum, and uploads only `.age` and `.age.sha256` objects. A successful run logs only an object key such as `weekly/mimic-<UTC timestamp>.dump.age`.

After every scheduled run:

```sh
aws --endpoint-url "$MIMIC_BACKUP_S3_ENDPOINT" s3 ls \
  "s3://${MIMIC_BACKUP_S3_BUCKET}/weekly/"
```

Confirm that the newest encrypted object and checksum have the same timestamp. Alert if the job or either upload is absent. Do not log environment values or enable shell tracing.

## Railway PITR into a sibling service

Use this path for incidents inside the PITR window.

1. Record the incident time in UTC, the requested recovery timestamp, and the newest timestamp Railway declares recoverable.
2. Create a new PostgreSQL service in the same environment with a unique scratch name ending in `-restore-drill`. Do not change the existing Production service or its variables.
3. In Railway's PostgreSQL Backups/PITR workflow, choose the requested timestamp and direct the recovery to the new sibling service. If the workflow cannot guarantee a new target, stop and escalate to Railway support; never select an in-place Production restore.
4. Keep Web/API variables pointing to the original database while verification runs. Restrict scratch database network access to the operators and verification job.
5. Run the migration and row-count queries from `ops/backup/verify-restore.sql` against the sibling database and compare them with pre-incident evidence.
6. Record restore start/end, source timestamp, effective RPO, effective RTO, migration count, and all table counts.
7. Promotion or data reconciliation is a separately approved incident action. The restore drill itself never repoints Production.

## Weekly object restore drill

Run this at least monthly and after changes to PostgreSQL, `age`, storage, or the scripts.

1. Create a new Staging PostgreSQL scratch service. Its actual database name must be lowercase, must match `mimic_*_restore_drill`, and must not contain `prod` or `production`.
2. Verify the scratch URL independently. Do not copy a Production URL into the shell history or use Production connection variables.
3. On the secured operator host, retrieve the private age identity from the vault to a permission-restricted temporary file.
4. Choose the exact `weekly/mimic-YYYYMMDDTHHMMSSZ.dump.age` object. Create `/secure/temp/mimic-restore.env` outside the repository with mode `0600`, populated directly from the secrets vault and dedicated Staging scratch service. It must define:

- `MIMIC_BACKUP_OBJECT`, `MIMIC_BACKUP_S3_ENDPOINT`, and `MIMIC_BACKUP_S3_BUCKET`
- `MIMIC_BACKUP_AGE_IDENTITY_FILE=/run/secrets/mimic-age-identity`
- `MIMIC_RESTORE_DATABASE_URL` and `MIMIC_RESTORE_DATABASE_NAME`
- `MIMIC_RESTORE_ENVIRONMENT=staging-scratch`
- `MIMIC_RESTORE_CONFIRM=RESTORE-INTO-SCRATCH`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION`, and optional `AWS_SESSION_TOKEN`

Do not echo this file, pass its values on the command line, or persist them in shell history. Resolve `MIMIC_BACKUP_IMAGE` to the immutable registry digest deployed on Railway, then run:

```sh
docker run --rm \
  --env-file /secure/temp/mimic-restore.env \
  --mount type=bind,src=/secure/temp/mimic-backup-identity.txt,dst=/run/secrets/mimic-age-identity,readonly \
  --entrypoint /opt/mimic/restore-drill.sh \
  "$MIMIC_BACKUP_IMAGE"
```

The restore script performs these checks in order: canonical object/explicit scratch guards, encrypted object download, checksum structure, checksum verification, decryption, actual connected database name, destructive scratch restore, and SQL verification. A checksum or guard failure is terminal; do not bypass it.

5. Capture stdout from `verify-restore.sql`, compare migration count with the source release, and investigate zero or unexpected row counts.
6. Remove the scratch service and securely delete the temporary environment file and private identity only after evidence has been reviewed. Retain the evidence record, not the decrypted dump.

## Drill evidence record

Create one record per drill in the approved operations system:

| Field | Required evidence |
|---|---|
| Operator and approver | Two named authorized people |
| Source mechanism | Railway PITR or weekly encrypted object key |
| Source backup timestamp | UTC timestamp from PITR/object |
| Restore start / finish | UTC timestamps |
| Effective RPO | Incident/reference time minus source timestamp |
| Effective RTO | Restore decision/start to verified finish |
| Target | Railway environment, service, and actual scratch database name |
| Production exclusion | Explicit confirmation that no Production URL/service was used or overwritten |
| Integrity | Successful SHA-256 check for logical restores |
| Schema | Applied migration count and expected release/migration |
| Data | Exact row count for every public table |
| Result | Pass, failure details, escalation owner, and follow-up due date |

The drill passes only when verification succeeds, no Production connection was used, effective RPO is at most 15 minutes for PITR evidence, and effective RTO is under four hours. A weekly logical object older than 15 minutes may still pass its portability drill, but it cannot be cited as meeting the Production RPO.

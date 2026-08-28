#!/bin/sh
set -eu

umask 077

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${MIMIC_BACKUP_AGE_RECIPIENT:?MIMIC_BACKUP_AGE_RECIPIENT is required}"
: "${MIMIC_BACKUP_MINISIGN_SECRET_KEY:?MIMIC_BACKUP_MINISIGN_SECRET_KEY is required}"
: "${MIMIC_BACKUP_S3_ENDPOINT:?MIMIC_BACKUP_S3_ENDPOINT is required}"
: "${MIMIC_BACKUP_S3_BUCKET:?MIMIC_BACKUP_S3_BUCKET is required}"
: "${MIMIC_POSTGRES_CLIENT_MAJOR:?MIMIC_POSTGRES_CLIENT_MAJOR is required}"
: "${MIMIC_EXPECTED_MIGRATION:?MIMIC_EXPECTED_MIGRATION is required}"
: "${MIMIC_BACKUP_RELEASE:?MIMIC_BACKUP_RELEASE is required}"
: "${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID is required}"
: "${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY is required}"
: "${AWS_DEFAULT_REGION:?AWS_DEFAULT_REGION is required}"

case "$MIMIC_BACKUP_AGE_RECIPIENT" in age1[0-9a-z]*) ;; *) printf '%s\n' 'Age recipient is invalid' >&2; exit 2 ;; esac
case "$MIMIC_BACKUP_S3_ENDPOINT" in https://*) ;; *) printf '%s\n' 'Backup endpoint must use HTTPS' >&2; exit 2 ;; esac
case "$MIMIC_BACKUP_S3_BUCKET" in ''|*[!A-Za-z0-9._-]*) printf '%s\n' 'Backup bucket is invalid' >&2; exit 2 ;; esac
case "$MIMIC_POSTGRES_CLIENT_MAJOR" in ''|*[!0-9]*) printf '%s\n' 'PostgreSQL client major must be numeric' >&2; exit 2 ;; esac
case "$MIMIC_EXPECTED_MIGRATION" in ''|*[!0-9A-Za-z._-]*) printf '%s\n' 'Expected migration is invalid' >&2; exit 2 ;; esac
case "$MIMIC_BACKUP_RELEASE" in ''|*[!0-9A-Za-z._-]*) printf '%s\n' 'Backup release is invalid' >&2; exit 2 ;; esac

export AWS_EC2_METADATA_DISABLED=true
export PGDATABASE="$DATABASE_URL"
unset DATABASE_URL
source_version_num="$(psql --tuples-only --no-align --set=ON_ERROR_STOP=1 --command='SHOW server_version_num')"
case "$source_version_num" in ''|*[!0-9]*) printf '%s\n' 'Unable to determine source PostgreSQL version' >&2; exit 2 ;; esac
source_major=$((source_version_num / 10000))
client_major="$(pg_dump --version | sed -n 's/.* \([0-9][0-9]*\)\..*/\1/p')"
if [ "$source_major" != "$MIMIC_POSTGRES_CLIENT_MAJOR" ] || [ "$client_major" != "$MIMIC_POSTGRES_CLIENT_MAJOR" ]; then
  printf '%s\n' 'Refusing backup across PostgreSQL major versions' >&2
  exit 2
fi
source_migration="$(psql --tuples-only --no-align --set=ON_ERROR_STOP=1 \
  --command='SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY finished_at DESC LIMIT 1')"
if [ "$source_migration" != "$MIMIC_EXPECTED_MIGRATION" ]; then
  printf '%s\n' 'Refusing backup because the source migration identity differs' >&2
  exit 2
fi

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
random="$(od -An -N16 -tx1 /dev/urandom | tr -d ' \n')"
case "$random" in
  [0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]) ;;
  *) printf '%s\n' 'Unable to generate collision-resistant backup key' >&2; exit 2 ;;
esac
base="mimic-${stamp}-${random}.dump"
object="weekly/${base}.age"
workdir="$(mktemp -d "${TMPDIR:-/tmp}/mimic-backup.XXXXXX")"
plain="${workdir}/${base}"
encrypted="${plain}.age"
checksum="${encrypted}.sha256"
manifest="${encrypted}.manifest"
signature="${manifest}.minisig"
signing_key="${workdir}/minisign.key"

cleanup() { rm -rf "$workdir"; }
trap cleanup EXIT
trap 'exit 1' HUP INT TERM

printf '%s\n' "$MIMIC_BACKUP_MINISIGN_SECRET_KEY" > "$signing_key"
unset MIMIC_BACKUP_MINISIGN_SECRET_KEY
pg_dump --format=custom --no-acl --no-owner --file="$plain"
age --recipient "$MIMIC_BACKUP_AGE_RECIPIENT" --output "$encrypted" "$plain"
rm -f "$plain"
(cd "$workdir" && sha256sum "${base}.age" > "${base}.age.sha256")
encrypted_sha256="$(sed -n 's/ .*//p' "$checksum")"
cat > "$manifest" <<EOF
format=mimic-backup-v1
object=${object}
created_at=${stamp}
source_postgres_version_num=${source_version_num}
postgres_major=${source_major}
expected_migration=${MIMIC_EXPECTED_MIGRATION}
release=${MIMIC_BACKUP_RELEASE}
sha256=${encrypted_sha256}
EOF
minisign -S -W -q -s "$signing_key" -m "$manifest" -x "$signature"
rm -f "$signing_key"

# Publish the signature last; it is the commit marker for a complete backup set.
aws --endpoint-url "$MIMIC_BACKUP_S3_ENDPOINT" s3 cp "$encrypted" "s3://${MIMIC_BACKUP_S3_BUCKET}/${object}" --only-show-errors
aws --endpoint-url "$MIMIC_BACKUP_S3_ENDPOINT" s3 cp "$checksum" "s3://${MIMIC_BACKUP_S3_BUCKET}/${object}.sha256" --only-show-errors
aws --endpoint-url "$MIMIC_BACKUP_S3_ENDPOINT" s3 cp "$manifest" "s3://${MIMIC_BACKUP_S3_BUCKET}/${object}.manifest" --only-show-errors
aws --endpoint-url "$MIMIC_BACKUP_S3_ENDPOINT" s3 cp "$signature" "s3://${MIMIC_BACKUP_S3_BUCKET}/${object}.manifest.minisig" --only-show-errors

printf '%s\n' "backup_uploaded=${object}"

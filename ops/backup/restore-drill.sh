#!/bin/sh
set -eu

umask 077

: "${MIMIC_BACKUP_OBJECT:?MIMIC_BACKUP_OBJECT is required}"
: "${MIMIC_BACKUP_S3_ENDPOINT:?MIMIC_BACKUP_S3_ENDPOINT is required}"
: "${MIMIC_BACKUP_S3_BUCKET:?MIMIC_BACKUP_S3_BUCKET is required}"
: "${MIMIC_BACKUP_AGE_IDENTITY_FILE:?MIMIC_BACKUP_AGE_IDENTITY_FILE is required}"
: "${MIMIC_RESTORE_DATABASE_URL:?MIMIC_RESTORE_DATABASE_URL is required}"
: "${MIMIC_RESTORE_DATABASE_NAME:?MIMIC_RESTORE_DATABASE_NAME is required}"
: "${MIMIC_RESTORE_ENVIRONMENT:?MIMIC_RESTORE_ENVIRONMENT is required}"
: "${MIMIC_RESTORE_CONFIRM:?MIMIC_RESTORE_CONFIRM is required}"
: "${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID is required}"
: "${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY is required}"
: "${AWS_DEFAULT_REGION:?AWS_DEFAULT_REGION is required}"

case "$MIMIC_BACKUP_S3_ENDPOINT" in
  https://*) ;;
  *) printf '%s\n' 'MIMIC_BACKUP_S3_ENDPOINT must use HTTPS' >&2; exit 2 ;;
esac
case "$MIMIC_BACKUP_S3_BUCKET" in
  ''|*[!A-Za-z0-9._-]*) printf '%s\n' 'MIMIC_BACKUP_S3_BUCKET is invalid' >&2; exit 2 ;;
esac
case "$MIMIC_BACKUP_OBJECT" in
  weekly/mimic-[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]T[0-9][0-9][0-9][0-9][0-9][0-9]Z.dump.age) ;;
  *) printf '%s\n' 'Refusing invalid backup object; expected weekly/mimic-YYYYMMDDTHHMMSSZ.dump.age' >&2; exit 2 ;;
esac
if [ "$MIMIC_RESTORE_CONFIRM" != 'RESTORE-INTO-SCRATCH' ] || \
   [ "$MIMIC_RESTORE_ENVIRONMENT" != 'staging-scratch' ]; then
  printf '%s\n' 'Refusing restore without the staging scratch confirmation' >&2
  exit 2
fi
case "$MIMIC_RESTORE_DATABASE_NAME" in
  *prod*|*production*) printf '%s\n' 'Refusing a production-like restore database name' >&2; exit 2 ;;
  mimic_*_restore_drill) ;;
  *) printf '%s\n' 'Restore database name must match mimic_*_restore_drill' >&2; exit 2 ;;
esac
case "$MIMIC_RESTORE_DATABASE_NAME" in
  *[!a-z0-9_]*) printf '%s\n' 'Restore database name must use lowercase letters, digits, and underscores' >&2; exit 2 ;;
esac
if [ ! -r "$MIMIC_BACKUP_AGE_IDENTITY_FILE" ]; then
  printf '%s\n' 'The age identity file is not readable' >&2
  exit 2
fi

export AWS_EC2_METADATA_DISABLED=true
name="${MIMIC_BACKUP_OBJECT#weekly/}"
workdir="$(mktemp -d "${TMPDIR:-/tmp}/mimic-restore.XXXXXX")"
encrypted="${workdir}/${name}"
checksum="${encrypted}.sha256"
plain="${encrypted%.age}"

cleanup() {
  rm -rf "$workdir"
}
trap cleanup EXIT
trap 'exit 1' HUP INT TERM

aws --endpoint-url "$MIMIC_BACKUP_S3_ENDPOINT" s3 cp \
  "s3://${MIMIC_BACKUP_S3_BUCKET}/${MIMIC_BACKUP_OBJECT}" "$encrypted" \
  --only-show-errors
aws --endpoint-url "$MIMIC_BACKUP_S3_ENDPOINT" s3 cp \
  "s3://${MIMIC_BACKUP_S3_BUCKET}/${MIMIC_BACKUP_OBJECT}.sha256" "$checksum" \
  --only-show-errors

if [ "$(wc -l < "$checksum" | tr -d ' ')" != '1' ] || \
   ! grep -Eq "^[0-9a-f]{64}  ${name}$" "$checksum"; then
  printf '%s\n' 'Refusing malformed backup checksum' >&2
  exit 2
fi
(
  cd "$workdir"
  sha256sum --check "${name}.sha256"
)
age --decrypt --identity "$MIMIC_BACKUP_AGE_IDENTITY_FILE" \
  --output "$plain" "$encrypted"

actual_database="$(psql "$MIMIC_RESTORE_DATABASE_URL" --tuples-only --no-align \
  --set=ON_ERROR_STOP=1 --command='SELECT current_database()')"
if [ "$actual_database" != "$MIMIC_RESTORE_DATABASE_NAME" ]; then
  printf '%s\n' 'Refusing restore because the connected database name does not match the explicit scratch target' >&2
  exit 2
fi

pg_restore --exit-on-error --no-acl --no-owner \
  --clean --if-exists --dbname="$MIMIC_RESTORE_DATABASE_URL" "$plain"
psql "$MIMIC_RESTORE_DATABASE_URL" --set=ON_ERROR_STOP=1 \
  --file="/opt/mimic/verify-restore.sql"

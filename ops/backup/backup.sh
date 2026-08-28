#!/bin/sh
set -eu

umask 077

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${MIMIC_BACKUP_AGE_RECIPIENT:?MIMIC_BACKUP_AGE_RECIPIENT is required}"
: "${MIMIC_BACKUP_S3_ENDPOINT:?MIMIC_BACKUP_S3_ENDPOINT is required}"
: "${MIMIC_BACKUP_S3_BUCKET:?MIMIC_BACKUP_S3_BUCKET is required}"
: "${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID is required}"
: "${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY is required}"
: "${AWS_DEFAULT_REGION:?AWS_DEFAULT_REGION is required}"

case "$MIMIC_BACKUP_AGE_RECIPIENT" in
  age1[0-9a-z]*) ;;
  *) printf '%s\n' 'MIMIC_BACKUP_AGE_RECIPIENT must be an age public recipient' >&2; exit 2 ;;
esac
case "$MIMIC_BACKUP_S3_ENDPOINT" in
  https://*) ;;
  *) printf '%s\n' 'MIMIC_BACKUP_S3_ENDPOINT must use HTTPS' >&2; exit 2 ;;
esac
case "$MIMIC_BACKUP_S3_BUCKET" in
  ''|*[!A-Za-z0-9._-]*) printf '%s\n' 'MIMIC_BACKUP_S3_BUCKET is invalid' >&2; exit 2 ;;
esac

export AWS_EC2_METADATA_DISABLED=true
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
base="mimic-${stamp}.dump"
workdir="$(mktemp -d "${TMPDIR:-/tmp}/mimic-backup.XXXXXX")"
plain="${workdir}/${base}"
encrypted="${plain}.age"
checksum="${encrypted}.sha256"

cleanup() {
  rm -rf "$workdir"
}
trap cleanup EXIT
trap 'exit 1' HUP INT TERM

pg_dump --dbname="$DATABASE_URL" --format=custom --no-acl --no-owner --file="$plain"
age --recipient "$MIMIC_BACKUP_AGE_RECIPIENT" --output "$encrypted" "$plain"
rm -f "$plain"
(
  cd "$workdir"
  sha256sum "${base}.age" > "${base}.age.sha256"
)

aws --endpoint-url "$MIMIC_BACKUP_S3_ENDPOINT" s3 cp \
  "$encrypted" "s3://${MIMIC_BACKUP_S3_BUCKET}/weekly/${base}.age" \
  --only-show-errors
aws --endpoint-url "$MIMIC_BACKUP_S3_ENDPOINT" s3 cp \
  "$checksum" "s3://${MIMIC_BACKUP_S3_BUCKET}/weekly/${base}.age.sha256" \
  --only-show-errors

printf '%s\n' "backup_uploaded=weekly/${base}.age"

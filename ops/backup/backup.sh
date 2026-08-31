#!/bin/sh
set -eu

umask 077

: "${MIMIC_BACKUP_DATABASE_HOST:?MIMIC_BACKUP_DATABASE_HOST is required}"
: "${MIMIC_BACKUP_DATABASE_PORT:?MIMIC_BACKUP_DATABASE_PORT is required}"
: "${MIMIC_BACKUP_DATABASE_USER:?MIMIC_BACKUP_DATABASE_USER is required}"
: "${MIMIC_BACKUP_DATABASE_PASSWORD:?MIMIC_BACKUP_DATABASE_PASSWORD is required}"
: "${MIMIC_BACKUP_DATABASE_NAME:?MIMIC_BACKUP_DATABASE_NAME is required}"
: "${MIMIC_BACKUP_DATABASE_SSL_MODE:?MIMIC_BACKUP_DATABASE_SSL_MODE is required}"
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
backup_database_host="$MIMIC_BACKUP_DATABASE_HOST"
backup_database_port="$MIMIC_BACKUP_DATABASE_PORT"
backup_database_user="$MIMIC_BACKUP_DATABASE_USER"
backup_database_password="$MIMIC_BACKUP_DATABASE_PASSWORD"
backup_database_name="$MIMIC_BACKUP_DATABASE_NAME"
backup_database_ssl_mode="$MIMIC_BACKUP_DATABASE_SSL_MODE"
signing_secret_key="$MIMIC_BACKUP_MINISIGN_SECRET_KEY"
aws_access_key_id="$AWS_ACCESS_KEY_ID"
aws_secret_access_key="$AWS_SECRET_ACCESS_KEY"
aws_default_region="$AWS_DEFAULT_REGION"
aws_session_token="${AWS_SESSION_TOKEN-}"
unset MIMIC_BACKUP_DATABASE_HOST MIMIC_BACKUP_DATABASE_PORT MIMIC_BACKUP_DATABASE_USER
unset MIMIC_BACKUP_DATABASE_PASSWORD MIMIC_BACKUP_DATABASE_NAME MIMIC_BACKUP_DATABASE_SSL_MODE
unset MIMIC_BACKUP_MINISIGN_SECRET_KEY
unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_DEFAULT_REGION AWS_SESSION_TOKEN

workdir="$(mktemp -d "${TMPDIR:-/tmp}/mimic-backup.XXXXXX")"
service_name=mimic_backup
service_file="${workdir}/pg_service.conf"
signing_key="${workdir}/minisign.key"
cleanup() { rm -rf "$workdir"; }
trap cleanup EXIT
trap 'exit 1' HUP INT TERM
printf '%s\n' "$signing_secret_key" > "$signing_key"
unset signing_secret_key

reject_controls() {
  label="$1"
  value="$2"
  case "$value" in
    ' '*|*' ') printf '%s\n' "${label} has leading or trailing whitespace" >&2; exit 2 ;;
  esac
  if [ "$(printf '%s' "$value" | tr -d '\r\n')" != "$value" ] ||
     printf '%s' "$value" | LC_ALL=C grep -q '[[:cntrl:]]'; then
    printf '%s\n' "${label} contains control characters" >&2
    exit 2
  fi
}
reject_controls 'Backup database host' "$backup_database_host"
reject_controls 'Backup database port' "$backup_database_port"
reject_controls 'Backup database user' "$backup_database_user"
reject_controls 'Backup database password' "$backup_database_password"
reject_controls 'Backup database name' "$backup_database_name"
reject_controls 'Backup database SSL mode' "$backup_database_ssl_mode"
case "$backup_database_host" in *[!0-9A-Za-z._-]*) printf '%s\n' 'Backup database host is invalid' >&2; exit 2 ;; esac
case "$backup_database_port" in ''|*[!0-9]*) printf '%s\n' 'Backup database port is invalid' >&2; exit 2 ;; esac
if [ "$backup_database_port" -lt 1 ] || [ "$backup_database_port" -gt 65535 ]; then printf '%s\n' 'Backup database port is out of range' >&2; exit 2; fi
case "$backup_database_user:$backup_database_name" in *[!0-9A-Za-z_.:-]*) printf '%s\n' 'Backup database user or name is invalid' >&2; exit 2 ;; esac
case "$backup_database_ssl_mode" in disable|allow|prefer|require|verify-ca|verify-full) ;; *) printf '%s\n' 'Backup database SSL mode is invalid' >&2; exit 2 ;; esac

run_aws() {
  AWS_ACCESS_KEY_ID="$aws_access_key_id" AWS_SECRET_ACCESS_KEY="$aws_secret_access_key" \
    AWS_DEFAULT_REGION="$aws_default_region" AWS_SESSION_TOKEN="$aws_session_token" \
    AWS_EC2_METADATA_DISABLED=true aws "$@"
}
{
  printf '[%s]\n' "$service_name"
  printf 'host=%s\n' "$backup_database_host"
  printf 'port=%s\n' "$backup_database_port"
  printf 'user=%s\n' "$backup_database_user"
  printf 'password=%s\n' "$backup_database_password"
  printf 'dbname=%s\n' "$backup_database_name"
  printf 'sslmode=%s\n' "$backup_database_ssl_mode"
} > "$service_file"
chmod 0600 "$service_file"
unset backup_database_host backup_database_port backup_database_user
unset backup_database_password backup_database_name backup_database_ssl_mode
source_version_num="$(PGSERVICEFILE="$service_file" psql --dbname="service=${service_name}" --tuples-only --no-align --set=ON_ERROR_STOP=1 --command='SHOW server_version_num')"
case "$source_version_num" in ''|*[!0-9]*) printf '%s\n' 'Unable to determine source PostgreSQL version' >&2; exit 2 ;; esac
source_major=$((source_version_num / 10000))
client_major="$(pg_dump --version | sed -n 's/.* \([0-9][0-9]*\)\..*/\1/p')"
if [ "$source_major" != "$MIMIC_POSTGRES_CLIENT_MAJOR" ] || [ "$client_major" != "$MIMIC_POSTGRES_CLIENT_MAJOR" ]; then
  printf '%s\n' 'Refusing backup across PostgreSQL major versions' >&2
  exit 2
fi
source_migration="$(PGSERVICEFILE="$service_file" psql --dbname="service=${service_name}" --tuples-only --no-align --set=ON_ERROR_STOP=1 \
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
plain="${workdir}/${base}"
encrypted="${plain}.age"
checksum="${encrypted}.sha256"
manifest="${encrypted}.manifest"
signature="${manifest}.minisig"
PGSERVICEFILE="$service_file" pg_dump --dbname="service=${service_name}" --format=custom --no-acl --no-owner --file="$plain"
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
run_aws --endpoint-url "$MIMIC_BACKUP_S3_ENDPOINT" s3 cp "$encrypted" "s3://${MIMIC_BACKUP_S3_BUCKET}/${object}" --only-show-errors
run_aws --endpoint-url "$MIMIC_BACKUP_S3_ENDPOINT" s3 cp "$checksum" "s3://${MIMIC_BACKUP_S3_BUCKET}/${object}.sha256" --only-show-errors
run_aws --endpoint-url "$MIMIC_BACKUP_S3_ENDPOINT" s3 cp "$manifest" "s3://${MIMIC_BACKUP_S3_BUCKET}/${object}.manifest" --only-show-errors
run_aws --endpoint-url "$MIMIC_BACKUP_S3_ENDPOINT" s3 cp "$signature" "s3://${MIMIC_BACKUP_S3_BUCKET}/${object}.manifest.minisig" --only-show-errors

printf '%s\n' "backup_uploaded=${object}"
